import { PrismaClient, PullRequestState } from '@prisma/client';
import dotenv from 'dotenv';
import { Octokit } from 'octokit';
import logger from './lib/logging.js'
import { execApiWithRetry } from './utils.js';
import { 
  generateLabelUpsertParams,
  generatePRAssigneeUpsertParams,
  generatePRLabelUpsertParams,
  generatePRReviewersUpsertParams,
  generateRepositoryUpsertParams,
  generateUserUpsertParams
} from './lib/relatedObjects.js';

dotenv.config({ path: '.env.local' }); // .env.local を読み込む場合

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

    // TODO: レビュー

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
    data: { lastSync: new Date() }
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
    requested_reviewers: requestedReviewers = []
  } = pr;

  // upsert
  // PRの共通データを定義
  // GitHubのAPIは小文字のstateを返すので、PrismaのEnumに合わせて大文字に変換
  const convertedState = state.toUpperCase() as PullRequestState;

  const prCommonData = {
    state: convertedState,
    title,
    updatedAt: new Date(updated_at),
    mergedAt: merged_at ? new Date(merged_at) : null,
    closedAt: closed_at ? new Date(closed_at) : null,
    baseRefName: pr.base.ref,
    headRefName: pr.head.ref,
    repository: {
      connect: {
        id: repositoryId,
      }
    },
    leadTimeInSeconds: calculateLeadTimeInSeconds(created_at, merged_at)
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
      createdAt: new Date(created_at),
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
          assigned_at: pr.assigned_at || new Date().toISOString()
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
            requested_at: reviewer.requested_at || new Date().toISOString()
          }
        )
      );
    }
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
