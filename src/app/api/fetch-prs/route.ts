// app/api/fetch-prs/route.ts

import { NextResponse } from 'next/server';
// 共通設定ファイルからインポート
import { GITHUB_API_TOKEN, DEFAULT_REPO_OWNER, DEFAULT_REPO_NAME } from '@/config/github-config';
// 共通部品をインポート
import { getPrismaClient } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api-helpers';

async function handleFetchPRs(request: Request) {
  if (!GITHUB_API_TOKEN) {
    return createErrorResponse('GitHub token not configured', 500);
  }

  let owner = DEFAULT_REPO_OWNER;
  let repo = DEFAULT_REPO_NAME;
  const prisma = getPrismaClient();

  // DBからPRを最新7件取得
  const pullRequests = await prisma.pullRequest.findMany({
    where: {
      repository: {
        owner: owner,
        name: repo
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 7
  });

  return createSuccessResponse(pullRequests);
}

// エラーハンドリングをラップしたメイン関数
export const POST = withErrorHandling(handleFetchPRs);