import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.TZ = 'Asia/Tokyo'

import { PrismaClient } from '@prisma/client';
import { Octokit } from 'octokit';
import logger from './lib/logging.js'
import { execApiWithRetry } from './utils.js';
import { generateUserUpsertParams } from './lib/relatedObjects.js';

const prisma = new PrismaClient();
const GITHUB_TOKEN_FOR_SYNC = process.env.GITHUB_API_TOKEN;
const REPO_OWNER = process.env.DEFAULT_REPO_OWNER!;
const REPO_NAME = process.env.DEFAULT_REPO_NAME!;
const octokit = new Octokit({ auth: GITHUB_TOKEN_FOR_SYNC });

async function fixAuthorIds() {
  logger.info('Starting author ID fix...');

  // author_github_idがNULLのPRを取得
  const prsWithoutAuthor = await prisma.pullRequest.findMany({
    where: {
      authorId: null
    },
    select: {
      id: true,
      number: true,
      githubId: true
    }
  });

  logger.info(`Found ${prsWithoutAuthor.length} PRs without author information`);

  for (const pr of prsWithoutAuthor) {
    try {
      logger.info(`Processing PR #${pr.number}...`);
      
      // GitHub APIからPR詳細を取得
      const { data: prData } = await execApiWithRetry(
        () => octokit.rest.pulls.get({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          pull_number: pr.number
        })
      );

      if (prData.user) {
        // ユーザー情報をupsert
        const authorUser = await prisma.user.upsert(
          generateUserUpsertParams({
            githubId: prData.user.id,
            login: prData.user.login,
            avatarUrl: prData.user.avatar_url,
            htmlUrl: prData.user.html_url
          })
        );

        // PRのauthor_github_idを更新
        await prisma.pullRequest.update({
          where: {
            id: pr.id
          },
          data: {
            authorId: authorUser.githubId
          }
        });

        logger.info(`Updated PR #${pr.number} with author: ${prData.user.login}`);
      } else {
        logger.warn(`No user data found for PR #${pr.number}`);
      }

      // API rate limitを考慮
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      logger.error(`Error processing PR #${pr.number}:`, error);
    }
  }

  logger.info('Author ID fix completed!');
}

fixAuthorIds()
  .catch((e) => {
    logger.error('Error in fix author IDs script:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected.');
  });