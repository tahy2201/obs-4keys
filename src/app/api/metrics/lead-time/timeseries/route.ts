// app/api/metrics/lead-time/timeseries/route.ts

import { GITHUB_API_TOKEN, DEFAULT_REPO_OWNER, DEFAULT_REPO_NAME } from '@/config/github-config';
import { getPrismaClient } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, withErrorHandling } from '@/lib/api-helpers';
import { TimeSeriesQueryParams, TimeSeriesDataPoint, Granularity, DateField } from '@/types/lead-time-metrics';
import logger from '../../../../../../scripts/lib/logging';

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

async function handleTimeSeriesRequest(request: Request) {
  if (!GITHUB_API_TOKEN) {
    return createErrorResponse('GitHub token not configured', 500);
  }

  // クエリパラメータを取得
  const { searchParams } = new URL(request.url);
  const granularityParam = searchParams.get('granularity') as Granularity | null;
  const dateFieldParam = searchParams.get('dateField') as DateField | null;
  
  const params: TimeSeriesQueryParams = {
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    repoOwner: searchParams.get('repoOwner') || DEFAULT_REPO_OWNER,
    repoName: searchParams.get('repoName') || DEFAULT_REPO_NAME,
    granularity: granularityParam && ['daily', 'weekly', 'monthly'].includes(granularityParam) ? granularityParam : 'daily',
    dateField: dateFieldParam && ['mergedAt', 'createdAt'].includes(dateFieldParam) ? dateFieldParam : 'mergedAt',
    filters: searchParams.get('filters') || undefined
  };

  if (!params.repoOwner || !params.repoName) {
    return createErrorResponse('Repository owner and name are required', 400);
  }

  const granularity = params.granularity as Granularity;
  const dateField = params.dateField as DateField;

  const prisma = getPrismaClient();

  try {
    const whereCondition: any = {
      repository: {
        owner: params.repoOwner,
        name: params.repoName
      },
      state: 'CLOSED', // マージされたPRのみ
      leadTimeInSeconds: {
        not: null // リードタイムが計算されているもののみ
      }
    };

    whereCondition[dateField] = {
      not: null,
      ...(params.startDate && { gte: new Date(params.startDate) }),
      ...(params.endDate && { lte: new Date(params.endDate) })
    }

    // createdAtを選択した場合は、mergedAtもnullでないことを確認
    if (dateField === 'createdAt') {
      whereCondition.mergedAt = { not: null };
    }

    const queryConditions: any = {
      where: whereCondition,
      select: {
        [dateField]: true,
        leadTimeInSeconds: true,
        // 常にmergedAtも取得（mergedAtでの集計時に必要）
        ...(dateField !== 'mergedAt' && { mergedAt: true })
      },
      orderBy: {
        [dateField]: 'asc'
      }
    }

    const pullRequests = await prisma.pullRequest.findMany(queryConditions);

    const aggregatedData = new Map<string, { totalLeadTime: number; count: number }>();

    pullRequests.forEach((pr) => {
      if (!pr.leadTimeInSeconds) return;
      
      // 選択された日付フィールドの値を取得
      const targetDate = (pr as any)[dateField];
      if (!targetDate) return;

      // 集計期間のキーを生成
      let periodKey: string;
      const date = new Date(targetDate);
      
      switch (granularity) {
        case 'weekly':
          // 週の始まり（月曜日）を計算
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay() + 1);
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        default: // daily
          periodKey = date.toISOString().split('T')[0];
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
        dateField: dateField, // 使用した日付フィールドを追加
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