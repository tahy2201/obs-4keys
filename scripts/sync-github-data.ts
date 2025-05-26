import { PrismaClient, PullRequestState } from '@prisma/client';
import dotenv from 'dotenv';
import { Octokit } from 'octokit';
import logger from '../logging.js'
import { execApiWithRetry } from './utils.js';
import { generateLabelUpsertParams, generateRepositoryUpsertParams, generateUserUpsertParams } from './lib/relatedObjects';

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
    // リポジトリIDの取得
    let repository = await prisma.repository.findFirst({
      where: {
        name: REPO_NAME,
        owner: REPO_OWNER,
      },
      select: {
        id: true,
      }
    });
    if (!repository) {
      const { data: repoData } = await octokit.rest.repos.get({
        owner: REPO_OWNER,
        repo: REPO_NAME,
      });
      const { id, name, owner, html_url } = repoData;
      repository = await prisma.repository.upsert(
        generateRepositoryUpsertParams({
          githubId: id,
          name: name,
          owner: owner.login,
          htmlUrl: html_url,
        })
      );
    }
    logger.info(`Repository ID: ${repository.id}`);
    logger.info(`Repository Name: ${REPO_NAME}`);
    logger.info(`Repository Owner: ${REPO_OWNER}`);

    //1. プルリクエスト取得
    await syncPullRequests(repository.id);
    //await getSamplePullRequest();


    // TODO: Issues,

    console.log('GitHub data sync completed successfully!');

  } catch (error) {
    console.error('Error during GitHub data sync:', error);
    process.exitCode = 1; // エラーコードを設定して終了
  } finally {
    await prisma.$disconnect();
    console.log('Prisma client disconnected.');
  }
}

async function syncPullRequests(repositoryId: number) {
  // DBから、リポジトリの中でnumberが最大のPRを取得
  const maxPr = await prisma.pullRequest.findFirst({
    where: {
      repositoryId: repositoryId,
    },
    orderBy: {
      number: 'desc',
    },
    select: {
      number: true,
    }
  });

  // 1. プルリクエストの最大IDを取得
  const { data: latestPr } = await octokit.rest.pulls.list({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    state: 'all',
    per_page: 1,
    page: 1,
    sort: 'created',
    direction: 'desc',
  });

  // 取得したmaxPr と、APIから取得したPRの最大IDを比較して、差分を取得する
  const prNumberDifference = latestPr[0].number - (maxPr ? maxPr.number : 0);
  logger.info(`Latest PR number from API: ${latestPr[0].number}`);
  logger.info(`PR number difference: ${prNumberDifference}`);
  if (prNumberDifference <= 0) {
    logger.info('No new pull requests to sync.');
    return;
  }

  // (prNumberDifference / 30) + 1回繰り返す
  // const perPage = 30; // 1ページあたりのPR数
  // const repetitionNumber = Math.ceil(prNumberDifference / perPage) + 1;
    const perPage = 5; // 1ページあたりのPR数
    const repetitionNumber = 1;

  for (let i = 1; i <= repetitionNumber; i++) {
    const { data: fetchedPRs } = await execApiWithRetry(
      () => octokit.rest.pulls.list({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        state: 'all',
        per_page: perPage,
        page: i,
        sort: 'created',
        direction: 'desc',
      })
    );

    for (const pr of fetchedPRs) {
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
          await prisma.pullRequest.update({
            where: {
              id: pullRequest.id,
            },
            data: {
              labels: {
                connectOrCreate: {
                  where: {
                    pullRequestId_labelId: {
                      pullRequestId: pullRequest.id,
                      labelId: label.id,
                    }
                  },
                  create: {
                    // pullRequestIdはwhereで設定されているので不要
                    labelId: label.id
                  }
                }
              }
            }
          });
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

        await prisma.pullRequest.update({
          where: {
            id: pullRequest.id,
          },
          data: {
            assignees: {
              connectOrCreate: {
                where: {
                  pullRequestId_userId: {
                    pullRequestId: pullRequest.id,
                    userId: assigneeUser.id,
                  }
                },
                create: {
                  // pullRequestIdはwhereで設定されているので不要
                  userId: assigneeUser.id,
                  assignedAt: new Date(assignee.assigned_at),
                }
              }
            }
          }
        });
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

          await prisma.pullRequest.update({
            where: {
              id: pullRequest.id,
            },
            data: {
              requestedReviewers: {
                connectOrCreate: {
                  where: {
                    pullRequestId_userId: {
                      pullRequestId: pullRequest.id,
                      userId: reviewerUser.id,
                    }
                  },
                  create: {
                    // pullRequestIdはwhereで設定されているので不要
                    userId: reviewerUser.id,
                    requestedAt: new Date(reviewer.requested_at),
                  }
                }
              }
            }
          });
        }
      }

      // TODO: reviews
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
    console.error('Unhandled error in main sync script:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 必要であればここでも prisma.$disconnect() を呼ぶ (main内で呼んでいれば不要な場合も)
  });
