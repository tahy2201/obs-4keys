import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // .env.local を読み込む場合
process.env.TZ = 'Asia/Tokyo'

import { PrismaClient, PullRequestState } from '@prisma/client';
import { Octokit } from 'octokit';
import logger from './lib/logging.js'
import { execApiWithRetry, toJSTDate } from './utils.js';
import { 
  generateLabelUpsertParams,
  generatePRAssigneeUpsertParams,
  generatePRLabelUpsertParams,
  generatePRReviewersUpsertParams,
  generateRepositoryUpsertParams,
  generateUserUpsertParams
} from './lib/relatedObjects.js';

const prisma = new PrismaClient();
const GITHUB_TOKEN_FOR_SYNC = process.env.GITHUB_API_TOKEN;
const REPO_OWNER = process.env.DEFAULT_REPO_OWNER!;
const REPO_NAME = process.env.DEFAULT_REPO_NAME!;
const octokit = new Octokit({ auth: GITHUB_TOKEN_FOR_SYNC });

// リードタイム計算ヘルパー関数 (秒単位)
function calculateLeadTimeInSeconds(createdAt: string, mergedAt: string | null): number | null {
  if (!mergedAt) return null;
  return (new Date(mergedAt).getTime() - new Date(createdAt).getTime()) / 1000;
}

async function main() {
  if (!GITHUB_TOKEN_FOR_SYNC) {
    logger.error('Error: GITHUB_API_TOKEN is not defined in .env.local');
    process.exit(1);
  }
  if (!REPO_OWNER || !REPO_NAME) {
    logger.error('Error: DEFAULT_REPO_OWNER or DEFAULT_REPO_NAME is not defined in .env.local');
    process.exit(1);
  }

  logger.info(`Starting GitHub data sync.`);

  try {
    const repository = await getOrCreateRepository(REPO_NAME, REPO_OWNER);
    if (!repository) {
      logger.error(`Repository ${REPO_NAME} owned by ${REPO_OWNER} not found or could not be created.`);
      process.exit(1);
    }

    //1. プルリクエスト取得
    await getPullRequests(repository.id, repository.lastSync);

    //2. レビュー・レビューコメント取得
    await getReviewsAndComments(repository.id, repository.lastSync);

    // TODO: Issues,

    // repositoryの最終同期日時を更新
    await updateRepositoryLastSync(repository.id);

    logger.info('GitHub data sync completed successfully!');

  } catch (error) {
    logger.error('Error during GitHub data sync:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected.');
  }
}

async function getOrCreateRepository(repoName: string, repoOwner: string) {
  // リポジトリIDの取得
  let repository = await prisma.repository.findFirst({
    where: {
      name: repoName,
      owner: repoOwner,
    },
    select: {
      id: true,
      lastSync: true,
    }
  });
  if (!repository) {
    const { data: repoData } = await octokit.rest.repos.get({
      owner: repoOwner,
      repo: repoName,
    });
    const { id, name, owner, html_url } = repoData;
    return await prisma.repository.upsert(
      generateRepositoryUpsertParams({
        githubId: id,
        name: name,
        owner: owner.login,
        htmlUrl: html_url,
      })
    );
  }
  return repository;
}

async function updateRepositoryLastSync(repositoryId: number) {
  // リポジトリの最終同期日時を更新
  await prisma.repository.update({
    where: { id: repositoryId },
    data: { lastSync: toJSTDate(new Date()) }
  });
}

async function getPullRequests(repositoryId: number, lastSync: Date) {
  // ループ
  for (let page = 1; ; page++) {
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      state: 'all',
      per_page: 100,
      page,
      sort: 'updated',
      direction: 'desc',
    });

    if (pullRequests.length === 0) {
      logger.info(`No more pull requests found on page ${page}. Stopping sync.`);
      break; // プルリクエストがない場合はループ終了
    }

    logger.info(`Processing page ${page} with ${pullRequests.length} pull requests.`);

    for (const pr of pullRequests) {
      // 最後の同期日時以前に更新されたプルリクエストが見つかったら処理終了
      if (new Date(pr.updated_at) <= lastSync) {
        logger.info(`No new pull requests since last sync at ${lastSync}. Stopping sync.`);
        return;
      }
      processPullRequest(pr, repositoryId)
    }
  }
}

async function processPullRequest(pr: any, repositoryId: number) {
  const {
    number,
    state,
    created_at,
    updated_at,
    merged_at,
    closed_at,
    title,
    author,
    assignee,
    requested_reviewers: requestedReviewers = [],
    additions = 0,
    deletions = 0
  } = pr;

  // upsert
  // PRの共通データを定義
  // GitHubのAPIは小文字のstateを返すので、PrismaのEnumに合わせて大文字に変換
  const convertedState = state.toUpperCase() as PullRequestState;

  const prCommonData = {
    state: convertedState,
    title,
    updatedAt: toJSTDate(updated_at),
    mergedAt: merged_at ? toJSTDate(merged_at) : null,
    closedAt: closed_at ? toJSTDate(closed_at) : null,
    baseRefName: pr.base.ref,
    headRefName: pr.head.ref,
    repository: {
      connect: {
        id: repositoryId,
      }
    },
    leadTimeInSeconds: calculateLeadTimeInSeconds(created_at, merged_at),
    additions,
    deletions,
    size: additions + deletions
  };

  let pullRequest = await prisma.pullRequest.upsert({
    where: {
      repositoryId_number: {
        repositoryId: repositoryId,
        number: number,
      },
    },
    update: {
      ...prCommonData,
    },
    create: {
      ...prCommonData,
      githubId: BigInt(pr.id),
      number,
      createdAt: toJSTDate(created_at),
      url: pr.html_url,
    }
  });

  // author
  if (author) {
    const authorUser = await prisma.user.upsert(
      generateUserUpsertParams({
        githubId: author.id,
        login: author.login,
        avatarUrl: author.avatar_url,
        htmlUrl: author.html_url
      })
    );

    await prisma.pullRequest.update({
      where: {
        id: pullRequest.id,
      },
      data: {
        authorId: authorUser.id,
      }
    });
  }

  // labels
  if (pr.labels && pr.labels.length > 0) {
    for (const l of pr.labels) {
      const label = await prisma.label.upsert(
        generateLabelUpsertParams({
          githubId: l.id,
          name: l.name,
          color: l.color,
          description: l.description || ''
        })
      );
      await prisma.pullRequest.update(
        generatePRLabelUpsertParams(
          pullRequest.id,
          label.id
        )
      );
    }
  }

  // assignee
  if (assignee) {
    const assigneeUser = await prisma.user.upsert(
      generateUserUpsertParams(
        {
          githubId: assignee.id,
          login: assignee.login,
          avatarUrl: assignee.avatar_url,
          htmlUrl: assignee.html_url
        }
      )
    );

    await prisma.pullRequest.update(
      generatePRAssigneeUpsertParams(
        pullRequest.id,
        {
          assigneeId: assignee.id, // githubIdを直接使用
          assigned_at: pr.assigned_at || toJSTDate(new Date()).toISOString()
        }
      )
    );
  }

  // requestedReviewers
  if (requestedReviewers.length > 0) {
    for (const reviewer of requestedReviewers) {
      const reviewerUser = await prisma.user.upsert(
        generateUserUpsertParams({
          githubId: reviewer.id,
          login: reviewer.login,
          avatarUrl: reviewer.avatar_url,
          htmlUrl: reviewer.html_url
        })
      );

      await prisma.pullRequest.update(
        generatePRReviewersUpsertParams(
          pullRequest.id,
          {
            userId: reviewer.id, // githubIdを直接使用
            requested_at: reviewer.requested_at || toJSTDate(new Date()).toISOString()
          }
        )
      );
    }
  }
}

async function getReviewsAndComments(repositoryId: number, lastSync: Date) {
  logger.info('Starting reviews and comments sync...');
  
  // 最新のPRを取得してレビューデータを同期
  const recentPRs = await prisma.pullRequest.findMany({
    where: {
      repositoryId: repositoryId,
      updatedAt: {
        gte: lastSync
      }
    },
    select: {
      id: true,
      number: true,
      updatedAt: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  logger.info(`Found ${recentPRs.length} recent PRs to sync reviews for.`);

  for (const pr of recentPRs) {
    await processReviewsForPR(pr.number, repositoryId, pr.id);
    await processReviewCommentsForPR(pr.number, repositoryId, pr.id);
    
    // API rate limitを考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function processReviewsForPR(prNumber: number, repositoryId: number, pullRequestId: number) {
  try {
    logger.info(`Processing reviews for PR #${prNumber}...`);
    
    const { data: reviews } = await execApiWithRetry(
      () => octokit.rest.pulls.listReviews({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: prNumber,
        per_page: 100
      })
    );

    for (const review of reviews) {
      // レビュアーユーザーをupsert
      let reviewerUser = null;
      if (review.user) {
        reviewerUser = await prisma.user.upsert(
          generateUserUpsertParams({
            githubId: review.user.id,
            login: review.user.login,
            avatarUrl: review.user.avatar_url,
            htmlUrl: review.user.html_url
          })
        );
      }

      // レビューをupsert
      await prisma.review.upsert({
        where: {
          githubId: BigInt(review.id)
        },
        update: {
          state: review.state.toUpperCase() as any, // ReviewStateのenumに合わせる
          body: review.body,
          submittedAt: toJSTDate(review.submitted_at),
          updatedAt: toJSTDate(new Date())
        },
        create: {
          githubId: BigInt(review.id),
          pullRequestId: pullRequestId,
          userId: reviewerUser?.githubId || null,
          state: review.state.toUpperCase() as any,
          body: review.body,
          submittedAt: toJSTDate(review.submitted_at),
          createdAt: toJSTDate(new Date()),
          updatedAt: toJSTDate(new Date())
        }
      });
    }

    logger.info(`Processed ${reviews.length} reviews for PR #${prNumber}`);
  } catch (error) {
    logger.error(`Error processing reviews for PR #${prNumber}:`, error);
  }
}

async function processReviewCommentsForPR(prNumber: number, repositoryId: number, pullRequestId: number) {
  try {
    logger.info(`Processing review comments for PR #${prNumber}...`);
    
    // 行に対するレビューコメントを取得
    const { data: reviewComments } = await execApiWithRetry(
      () => octokit.rest.pulls.listReviewComments({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: prNumber,
        per_page: 100
      })
    );

    for (const comment of reviewComments) {
      await processReviewComment(comment, pullRequestId, 'REVIEW_COMMENT');
    }

    // PR全体に対するissueコメントも取得
    const { data: issueComments } = await execApiWithRetry(
      () => octokit.rest.issues.listComments({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        issue_number: prNumber,
        per_page: 100
      })
    );

    // PRの作成者を取得してレビューコメントと区別
    const pullRequest = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: { author: true }
    });

    for (const comment of issueComments) {
      // PRの作成者以外のコメントのみを対象とする（レビューコメントとして扱う）
      if (comment.user?.id !== pullRequest?.author?.githubId) {
        await processReviewComment(comment, pullRequestId, 'ISSUE_COMMENT');
      }
    }

    logger.info(`Processed ${reviewComments.length} review comments and ${issueComments.length} issue comments for PR #${prNumber}`);
  } catch (error) {
    logger.error(`Error processing review comments for PR #${prNumber}:`, error);
  }
}

async function processReviewComment(comment: any, pullRequestId: number, commentType: 'REVIEW_COMMENT' | 'ISSUE_COMMENT') {
  try {
    // コメント作成者をupsert
    let commentUser = null;
    if (comment.user) {
      commentUser = await prisma.user.upsert(
        generateUserUpsertParams({
          githubId: comment.user.id,
          login: comment.user.login,
          avatarUrl: comment.user.avatar_url,
          htmlUrl: comment.user.html_url
        })
      );
    }

    // 関連するReviewを取得（review_commentの場合）
    let reviewId = null;
    if (commentType === 'REVIEW_COMMENT' && comment.pull_request_review_id) {
      const existingReview = await prisma.review.findFirst({
        where: {
          githubId: BigInt(comment.pull_request_review_id)
        }
      });
      reviewId = existingReview?.id || null;
    }

    // レビューコメントをupsert
    await prisma.reviewComment.upsert({
      where: {
        githubId: BigInt(comment.id)
      },
      update: {
        body: comment.body,
        filePath: comment.path || null,
        lineNumber: comment.line || comment.original_line || null,
        updatedAt: toJSTDate(comment.updated_at),
        localUpdatedAt: toJSTDate(new Date())
      },
      create: {
        githubId: BigInt(comment.id),
        pullRequestId: pullRequestId,
        userId: commentUser?.githubId || null,
        reviewId: reviewId,
        body: comment.body,
        filePath: comment.path || null,
        lineNumber: comment.line || comment.original_line || null,
        commentType: commentType,
        createdAt: toJSTDate(comment.created_at),
        updatedAt: toJSTDate(comment.updated_at),
        localCreatedAt: toJSTDate(new Date()),
        localUpdatedAt: toJSTDate(new Date())
      }
    });
  } catch (error) {
    logger.error(`Error processing review comment ${comment.id}:`, error);
  }
}

async function getSamplePullRequest() {
  // 1. プルリクエスト同期
  logger.info('Fetching pull requests...');

  const { data: fetchedPRs } = await execApiWithRetry(
    () => octokit.rest.pulls.list({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      state: 'closed',
      per_page: 3,
      page: 1,
      sort: 'updated',
      direction: 'desc',
    })
  );

  fetchedPRs.forEach((pr: any) => {
    logger.info(JSON.stringify(pr, null, 2));
  })
}

// スクリプト実行
main()
  .catch((e) => {
    logger.error('Unhandled error in main sync script:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 必要であればここでも prisma.$disconnect() を呼ぶ (main内で呼んでいれば不要な場合も)
  });
