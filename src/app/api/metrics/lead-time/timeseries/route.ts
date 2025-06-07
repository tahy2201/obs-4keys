// app/api/metrics/lead-time/timeseries/route.ts

import { GITHUB_API_TOKEN, DEFAULT_REPO_OWNER, DEFAULT_REPO_NAME } from '@/config/github-config';
import { getPrismaClient } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api-helpers';
import logger from '../../../../../../scripts/lib/logging';

// リクエストパラメータの型定義
interface TimeSeriesQueryParams {
  startDate?: string;
  endDate?: string;
  repoOwner?: string;
  repoName?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  filters?: string; // JSON文字列
}

// レスポンスデータの型定義
interface TimeSeriesDataPoint {
  date: string; // 集計期間の開始日
  averageLeadTime: number; // 平均リードタイム（秒）
  averageLeadTimeHours: number; // 平均リードタイム（時間）
  pullRequestCount: number; // PRの件数
  period: string; // 期間の表示用文字列
}

/**
 * 日付の集計粒度に応じたSQLのDATE_TRUNC関数を生成
 */
function getDateTruncExpression(granularity: string): string {
  switch (granularity) {
    case 'weekly':
      return "DATE_TRUNC('week', \"mergedAt\")";
    case 'monthly':
      return "DATE_TRUNC('month', \"mergedAt\")";
    default: // daily
      return "DATE_TRUNC('day', \"mergedAt\")";
  }
}

/**
 * 期間の表示用フォーマットを生成
 */
function formatPeriod(date: Date, granularity: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  switch (granularity) {
    case 'weekly':
      // 週の開始日を表示
      return `${year}-${month}-${day} (Week)`;
    case 'monthly':
      return `${year}-${month}`;
    default: // daily
      return `${year}-${month}-${day}`;
  }
}

async function handleTimeSeriesRequest(request: Request) {
  if (!GITHUB_API_TOKEN) {
    return createErrorResponse('GitHub token not configured', 500);
  }

  // クエリパラメータを取得
  const { searchParams } = new URL(request.url);
  const granularityParam = searchParams.get('granularity') as 'daily' | 'weekly' | 'monthly' | null;
  
  const params: TimeSeriesQueryParams = {
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    repoOwner: searchParams.get('repoOwner') || DEFAULT_REPO_OWNER,
    repoName: searchParams.get('repoName') || DEFAULT_REPO_NAME,
    granularity: granularityParam && ['daily', 'weekly', 'monthly'].includes(granularityParam) ? granularityParam : 'daily',
    filters: searchParams.get('filters') || undefined
  };

  // パラメータバリデーション
  if (!params.repoOwner || !params.repoName) {
    return createErrorResponse('Repository owner and name are required', 400);
  }

  // granularityは既にバリデーション済みなので安全
  const granularity = params.granularity as 'daily' | 'weekly' | 'monthly';

  const prisma = getPrismaClient();

  try {

    const whereConditions: any = {
      where: {
        repository: {
          owner: params.repoOwner,
          name: params.repoName
        },
        state: 'CLOSED', // マージされたPRのみ
        leadTimeInSeconds: {
          not: null // リードタイムが計算されているもののみ
        },
        mergedAt: {
          not: null,
          // 開始日と終了日の条件をここにまとめる！
          ...(params.startDate && { gte: new Date(params.startDate) }),
          ...(params.endDate && { lte: new Date(params.endDate) })
        },
      },
      select: {
        mergedAt: true,
        leadTimeInSeconds: true
      },
      orderBy: {
        mergedAt: 'asc'
      }
    }

    const pullRequests = await prisma.pullRequest.findMany(whereConditions);

    // メモリ上で集計処理
    const aggregatedData = new Map<string, { totalLeadTime: number; count: number }>();

    pullRequests.forEach((pr) => {
      if (!pr.mergedAt || !pr.leadTimeInSeconds) return;

      // 集計期間のキーを生成
      let periodKey: string;
      const mergedDate = new Date(pr.mergedAt);
      
      switch (granularity) {
        case 'weekly':
          // 週の始まり（月曜日）を計算
          const weekStart = new Date(mergedDate);
          weekStart.setDate(mergedDate.getDate() - mergedDate.getDay() + 1);
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodKey = `${mergedDate.getFullYear()}-${String(mergedDate.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        default: // daily
          periodKey = mergedDate.toISOString().split('T')[0];
      }

      // データを集計
      const existing = aggregatedData.get(periodKey) || { totalLeadTime: 0, count: 0 };
      existing.totalLeadTime += pr.leadTimeInSeconds;
      existing.count += 1;
      aggregatedData.set(periodKey, existing);
    });

    // レスポンスデータを整形
    const formattedData: TimeSeriesDataPoint[] = Array.from(aggregatedData.entries())
      .map(([dateKey, data]) => {
        const avgLeadTimeSeconds = Math.round(data.totalLeadTime / data.count);
        const avgLeadTimeHours = Number((avgLeadTimeSeconds / 3600).toFixed(2));
        const periodStart = new Date(dateKey);
        
        return {
          date: dateKey,
          averageLeadTime: avgLeadTimeSeconds,
          averageLeadTimeHours: avgLeadTimeHours,
          pullRequestCount: data.count,
          period: formatPeriod(periodStart, granularity)
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // メタデータも含めてレスポンス
    const responseData = {
      timeSeries: formattedData,
      metadata: {
        repository: `${params.repoOwner}/${params.repoName}`,
        granularity: granularity,
        dateRange: {
          start: params.startDate || null,
          end: params.endDate || null
        },
        totalDataPoints: formattedData.length,
        totalPullRequests: formattedData.reduce((sum, point) => sum + point.pullRequestCount, 0)
      }
    };

    return createSuccessResponse(responseData);

  } catch (error: any) {
    logger.error('Error fetching lead time time series:', error);
    return createErrorResponse(
      'Failed to fetch lead time time series data',
      500,
      { error: error.message }
    );
  }
}

// GETリクエストハンドラー
export const GET = withErrorHandling(handleTimeSeriesRequest);