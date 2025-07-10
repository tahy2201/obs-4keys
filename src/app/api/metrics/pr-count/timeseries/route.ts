import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api-helpers';
import logger from '../../../../../../scripts/lib/logging';

const DEFAULT_REPO_OWNER = process.env.REPO_OWNER;
const DEFAULT_REPO_NAME = process.env.REPO_NAME;

// PR数の時系列データポイントの型定義
export interface PRCountDataPoint {
  date: string; // 集計期間の開始日
  pullRequestCount: number; // PRの件数
  mergedCount: number; // マージされたPRの件数
  closedCount: number; // クローズされたPRの件数
  period: string; // 期間の表示用文字列
}

// メタデータの型定義
export interface PRCountMetadata {
  repository: string;
  granularity: 'daily' | 'weekly' | 'monthly';
  dateField: 'mergedAt' | 'createdAt';
  dateRange: {
    start: string | null;
    end: string | null;
  };
  totalDataPoints: number;
  totalPullRequests: number;
  totalMergedPRs: number;
  totalClosedPRs: number;
}

// APIレスポンスの型定義
export interface PRCountResponse {
  timeSeries: PRCountDataPoint[];
  metadata: PRCountMetadata;
}

// リクエストパラメータの型定義
export interface PRCountQueryParams {
  startDate?: string;
  endDate?: string;
  repoOwner?: string;
  repoName?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  dateField?: 'mergedAt' | 'createdAt';
  filters?: string; // JSON文字列
}

type Granularity = 'daily' | 'weekly' | 'monthly';
type DateField = 'mergedAt' | 'createdAt';

/**
 * 日付の集計粒度に応じたSQLのDATE_TRUNC関数を生成
 */
function getDateTruncExpression(granularity: string, dateField: string): string {
  switch (granularity) {
    case 'weekly':
      return `DATE_TRUNC('week', "${dateField}")`;
    case 'monthly':
      return `DATE_TRUNC('month', "${dateField}")`;
    default: // daily
      return `DATE_TRUNC('day', "${dateField}")`;
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

async function handlePRCountTimeSeriesRequest(request: Request) {
  // クエリパラメータを取得
  const { searchParams } = new URL(request.url);
  const granularityParam = searchParams.get('granularity') as Granularity | null;
  const dateFieldParam = searchParams.get('dateField') as DateField | null;
  
  const params: PRCountQueryParams = {
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    repoOwner: searchParams.get('repoOwner') || DEFAULT_REPO_OWNER,
    repoName: searchParams.get('repoName') || DEFAULT_REPO_NAME,
    granularity: granularityParam && ['daily', 'weekly', 'monthly'].includes(granularityParam) ? granularityParam : 'daily',
    dateField: dateFieldParam && ['mergedAt', 'createdAt'].includes(dateFieldParam) ? dateFieldParam : 'mergedAt',
    filters: searchParams.get('filters') || undefined
  };

  const granularity = params.granularity as Granularity;
  const dateField = params.dateField as DateField;

  const prisma = getPrismaClient();

  try {
    const whereCondition: any = {
      repository: {
        owner: params.repoOwner,
        name: params.repoName
      }
    };

    // 日付フィルターを追加
    whereCondition[dateField] = {
      not: null,
      ...(params.startDate && { gte: new Date(params.startDate) }),
      ...(params.endDate && { lte: new Date(params.endDate) })
    };

    const queryConditions: any = {
      where: whereCondition,
      select: {
        [dateField]: true,
        state: true,
        ...(dateField !== 'mergedAt' && { mergedAt: true })
      },
      orderBy: {
        [dateField]: 'asc'
      }
    };

    const pullRequests = await prisma.pullRequest.findMany(queryConditions);

    // 日付ごとにPR数を集計
    const aggregatedData = new Map<string, { totalCount: number; mergedCount: number; closedCount: number }>();

    pullRequests.forEach((pr) => {
      const targetDate = pr[dateField];
      if (!targetDate) return;

      const date = new Date(targetDate);
      const dateKey = getDateTruncExpression(granularity, 'temp').replace('"temp"', date.toISOString());
      
      // 実際の日付キーを生成（簡単な方法）
      let actualDateKey: string;
      switch (granularity) {
        case 'weekly':
          // 週の開始日（月曜日）を取得
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay() + 1);
          actualDateKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          actualDateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        default: // daily
          actualDateKey = date.toISOString().split('T')[0];
          break;
      }

      if (!aggregatedData.has(actualDateKey)) {
        aggregatedData.set(actualDateKey, { totalCount: 0, mergedCount: 0, closedCount: 0 });
      }

      const data = aggregatedData.get(actualDateKey)!;
      data.totalCount++;
      
      if (pr.state === 'CLOSED' && pr.mergedAt) {
        data.mergedCount++;
      } else if (pr.state === 'CLOSED') {
        data.closedCount++;
      }
    });

    // レスポンスデータを整形
    const formattedData: PRCountDataPoint[] = Array.from(aggregatedData.entries())
      .map(([dateKey, data]) => ({
        date: dateKey,
        pullRequestCount: data.totalCount,
        mergedCount: data.mergedCount,
        closedCount: data.closedCount,
        period: formatPeriod(new Date(dateKey), granularity)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // メタデータを計算
    const totalPullRequests = formattedData.reduce((sum, point) => sum + point.pullRequestCount, 0);
    const totalMergedPRs = formattedData.reduce((sum, point) => sum + point.mergedCount, 0);
    const totalClosedPRs = formattedData.reduce((sum, point) => sum + point.closedCount, 0);

    // メタデータも含めてレスポンス
    const responseData: PRCountResponse = {
      timeSeries: formattedData,
      metadata: {
        repository: `${params.repoOwner}/${params.repoName}`,
        granularity: granularity,
        dateField: dateField,
        dateRange: {
          start: params.startDate || null,
          end: params.endDate || null
        },
        totalDataPoints: formattedData.length,
        totalPullRequests,
        totalMergedPRs,
        totalClosedPRs
      }
    };

    return createSuccessResponse(responseData);

  } catch (error: any) {
    logger.error('Error fetching PR count time series:', error);
    return createErrorResponse(
      'Failed to fetch PR count time series data',
      500,
      { error: error.message }
    );
  }
}

// GETリクエストハンドラー
export const GET = withErrorHandling(handlePRCountTimeSeriesRequest);
