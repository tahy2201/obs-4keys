import { getPrismaClient } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api-helpers';
import { DEFAULT_REPO_OWNER, DEFAULT_REPO_NAME } from '@/config/github-config';
import logger from '../../../../../../scripts/lib/logging';

// PRサイズの時系列データポイントの型定義
export interface PRSizeDataPoint {
  date: string; // 集計期間の開始日
  averageSize: number; // 平均サイズ
  medianSize: number; // 中央値サイズ
  totalSize: number; // 合計サイズ
  pullRequestCount: number; // PRの件数
  averageAdditions: number; // 平均追加行数
  averageDeletions: number; // 平均削除行数
  period: string; // 期間の表示用文字列
}

// メタデータの型定義
export interface PRSizeMetadata {
  repository: string;
  granularity: 'daily' | 'weekly' | 'monthly';
  dateField: 'mergedAt' | 'createdAt';
  dateRange: {
    start: string | null;
    end: string | null;
  };
  totalDataPoints: number;
  totalPullRequests: number;
  overallAverageSize: number;
  overallMedianSize: number;
  maxSize: number;
  minSize: number;
}

// APIレスポンスの型定義
export interface PRSizeResponse {
  timeSeries: PRSizeDataPoint[];
  metadata: PRSizeMetadata;
}

// リクエストパラメータの型定義
export interface PRSizeQueryParams {
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
 * 期間の表示用フォーマットを生成
 */
function formatPeriod(date: Date, granularity: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  switch (granularity) {
    case 'weekly':
      return `${year}-${month}-${day} (Week)`;
    case 'monthly':
      return `${year}-${month}`;
    default: // daily
      return `${year}-${month}-${day}`;
  }
}

/**
 * 配列の中央値を計算
 */
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}

async function handlePRSizeTimeSeriesRequest(request: Request) {
  // クエリパラメータを取得
  const { searchParams } = new URL(request.url);
  const granularityParam = searchParams.get('granularity') as Granularity | null;
  const dateFieldParam = searchParams.get('dateField') as DateField | null;
  
  const params: PRSizeQueryParams = {
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
      },
      size: {
        not: null
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
        size: true,
        additions: true,
        deletions: true
      },
      orderBy: {
        [dateField]: 'asc'
      }
    };

    const pullRequests = await prisma.pullRequest.findMany(queryConditions);

    // 日付ごとにPRサイズを集計
    const aggregatedData = new Map<string, {
      sizes: number[];
      additions: number[];
      deletions: number[];
    }>();

    pullRequests.forEach((pr) => {
      const targetDate = pr[dateField];
      if (!targetDate || pr.size === null) return;

      const date = new Date(targetDate);
      
      // 実際の日付キーを生成
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
        aggregatedData.set(actualDateKey, { 
          sizes: [], 
          additions: [], 
          deletions: [] 
        });
      }

      const data = aggregatedData.get(actualDateKey)!;
      data.sizes.push(pr.size);
      if (pr.additions !== null) data.additions.push(pr.additions);
      if (pr.deletions !== null) data.deletions.push(pr.deletions);
    });

    // レスポンスデータを整形
    const formattedData: PRSizeDataPoint[] = Array.from(aggregatedData.entries())
      .map(([dateKey, data]) => {
        const averageSize = data.sizes.length > 0 ? data.sizes.reduce((sum, size) => sum + size, 0) / data.sizes.length : 0;
        const medianSize = calculateMedian(data.sizes);
        const totalSize = data.sizes.reduce((sum, size) => sum + size, 0);
        const averageAdditions = data.additions.length > 0 ? data.additions.reduce((sum, add) => sum + add, 0) / data.additions.length : 0;
        const averageDeletions = data.deletions.length > 0 ? data.deletions.reduce((sum, del) => sum + del, 0) / data.deletions.length : 0;

        return {
          date: dateKey,
          averageSize: Math.round(averageSize * 100) / 100,
          medianSize,
          totalSize,
          pullRequestCount: data.sizes.length,
          averageAdditions: Math.round(averageAdditions * 100) / 100,
          averageDeletions: Math.round(averageDeletions * 100) / 100,
          period: formatPeriod(new Date(dateKey), granularity)
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // 全体統計を計算
    const allSizes = pullRequests.map(pr => pr.size).filter(size => size !== null) as number[];
    const overallAverageSize = allSizes.length > 0 ? allSizes.reduce((sum, size) => sum + size, 0) / allSizes.length : 0;
    const overallMedianSize = calculateMedian(allSizes);
    const maxSize = allSizes.length > 0 ? Math.max(...allSizes) : 0;
    const minSize = allSizes.length > 0 ? Math.min(...allSizes) : 0;

    // メタデータも含めてレスポンス
    const responseData: PRSizeResponse = {
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
        totalPullRequests: allSizes.length,
        overallAverageSize: Math.round(overallAverageSize * 100) / 100,
        overallMedianSize,
        maxSize,
        minSize
      }
    };

    return createSuccessResponse(responseData);

  } catch (error: any) {
    logger.error('Error fetching PR size time series:', error);
    return createErrorResponse(
      'Failed to fetch PR size time series data',
      500,
      { error: error.message }
    );
  }
}

// GETリクエストハンドラー
export const GET = withErrorHandling(handlePRSizeTimeSeriesRequest);