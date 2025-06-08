// Lead Time Metrics API共通型定義

// 時系列データポイントの型定義
export interface TimeSeriesDataPoint {
  date: string; // 集計期間の開始日
  averageLeadTime: number; // 平均リードタイム（秒）
  averageLeadTimeHours: number; // 平均リードタイム（時間）
  pullRequestCount: number; // PRの件数
  period: string; // 期間の表示用文字列
}

// メタデータの型定義
export interface TimeSeriesMetadata {
  repository: string;
  granularity: 'daily' | 'weekly' | 'monthly';
  dateField: 'mergedAt' | 'createdAt';
  dateRange: {
    start: string | null;
    end: string | null;
  };
  totalDataPoints: number;
  totalPullRequests: number;
}

// APIレスポンスの型定義
export interface TimeSeriesResponse {
  timeSeries: TimeSeriesDataPoint[];
  metadata: TimeSeriesMetadata;
}

// リクエストパラメータの型定義
export interface TimeSeriesQueryParams {
  startDate?: string;
  endDate?: string;
  repoOwner?: string;
  repoName?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  dateField?: 'mergedAt' | 'createdAt';
  filters?: string; // JSON文字列
}

// フックのパラメータ型（filtersを除く）
export interface UseLeadTimeMetricsParams {
  startDate?: string;
  endDate?: string;
  repoOwner?: string;
  repoName?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  dateField?: 'mergedAt' | 'createdAt';
}

// 粒度の型定義（便利な型エイリアス）
export type Granularity = 'daily' | 'weekly' | 'monthly';
export type DateField = 'mergedAt' | 'createdAt';
