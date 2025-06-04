/**
 * Prismaクライアントの管理
 * Next.jsのAPIルートで使うPrismaクライアントを適切に管理するよ！
 */

import { PrismaClient } from '@prisma/client';

// グローバルのPrismaクライアントインスタンス
declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * シングルトンパターンでPrismaクライアントを管理
 * 開発環境でのホットリロード時のコネクション問題を避けるよ！
 */
export const prisma = globalThis.__prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

/**
 * APIルートで使うためのPrismaクライアント取得関数
 * finally節で自動的にdisconnectする必要がないシングルトンを返すよ
 */
export function getPrismaClient(): PrismaClient {
  return prisma;
}
