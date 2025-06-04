/**
 * API レスポンス用のヘルパー関数
 * Next.js API ルートで統一されたレスポンス形式を提供するよ！
 */

import { NextResponse } from 'next/server';
import { serializeForAPI } from './serialization';

/**
 * 成功レスポンスを作成するヘルパー関数
 * @param data レスポンスデータ
 * @param status HTTPステータスコード（デフォルト: 200）
 * @returns NextResponse
 */
export function createSuccessResponse(data: any, status: number = 200) {
  const serializedData = serializeForAPI(data);
  return NextResponse.json({ 
    success: true,
    data: serializedData 
  }, { status });
}

/**
 * エラーレスポンスを作成するヘルパー関数
 * @param message エラーメッセージ
 * @param status HTTPステータスコード（デフォルト: 500）
 * @param details 詳細なエラー情報（オプション）
 * @returns NextResponse
 */
export function createErrorResponse(message: string, status: number = 500, details?: any) {
  return NextResponse.json({ 
    success: false,
    error: message,
    ...(details && { details: serializeForAPI(details) })
  }, { status });
}

/**
 * APIハンドラーをラップして共通のエラーハンドリングを提供
 * @param handler APIハンドラー関数
 * @returns ラップされたハンドラー関数
 */
export function withErrorHandling(handler: (request: Request) => Promise<NextResponse>) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error: any) {
      console.error('API Error:', error);
      const status = error.status || 500;
      const message = error.message || 'Internal server error';
      return createErrorResponse(message, status, error.response?.data);
    }
  };
}
