import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.TZ = 'Asia/Tokyo';

import { PrismaClient } from '@prisma/client';
import { Octokit } from 'octokit';
import logger from './lib/logging.js';

const prisma = new PrismaClient();
const GITHUB_TOKEN_FOR_SYNC = process.env.GITHUB_API_TOKEN;
const REPO_OWNER = process.env.DEFAULT_REPO_OWNER!;
const REPO_NAME = process.env.DEFAULT_REPO_NAME!;
const octokit = new Octokit({ auth: GITHUB_TOKEN_FOR_SYNC });

async function main() {
  if (!GITHUB_TOKEN_FOR_SYNC) {
    logger.error('Error: GITHUB_API_TOKEN is not defined in .env.local');
    process.exit(1);
  }
  if (!REPO_OWNER || !REPO_NAME) {
    logger.error('Error: DEFAULT_REPO_OWNER or DEFAULT_REPO_NAME is not defined in .env.local');
    process.exit(1);
  }

  logger.info('Starting PR size update for existing PRs...');

  try {
    // サイズ情報がないPRを取得
    const prsWithoutSize = await prisma.pullRequest.findMany({
      where: {
        OR: [
          { size: null },
          { additions: null },
          { deletions: null }
        ]
      },
      select: {
        id: true,
        number: true,
        githubId: true,
        repository: {
          select: {
            owner: true,
            name: true
          }
        }
      }
    });

    logger.info(`Found ${prsWithoutSize.length} PRs without size information`);

    for (const pr of prsWithoutSize) {
      try {
        // GitHub APIからPRの詳細情報を取得
        const { data: prData } = await octokit.rest.pulls.get({
          owner: pr.repository.owner,
          repo: pr.repository.name,
          pull_number: pr.number,
        });

        const { additions = 0, deletions = 0 } = prData;
        const size = additions + deletions;

        // DBを更新
        await prisma.pullRequest.update({
          where: { id: pr.id },
          data: {
            additions,
            deletions,
            size
          }
        });

        logger.info(`Updated PR #${pr.number}: +${additions} -${deletions} (size: ${size})`);

        // API rate limitを考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.error(`Failed to update PR #${pr.number}:`, error);
      }
    }

    logger.info('PR size update completed successfully!');

  } catch (error) {
    logger.error('Error during PR size update:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected.');
  }
}

main();