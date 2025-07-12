// 汎用メトリクス用の型定義

// メトリクス種別の列挙型
export enum MetricType {
  LEAD_TIME = 'lead-time',
  PR_COUNT = 'pr-count',
  PR_SIZE = 'pr-size',
  DEPLOYMENT_FREQUENCY = 'deployment-frequency',
  CHANGE_FAILURE_RATE = 'change-failure-rate'
}

// 汎用的なメトリクスパラメータ
export interface BaseMetricsParams {
  startDate?: string;
  endDate?: string;
  repoOwner?: string;
  repoName?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  dateField?: 'mergedAt' | 'createdAt';
}

// 各メトリクスで使用する基本的なメタデータ
export interface BaseMetadata {
  repository: string;
  granularity: 'daily' | 'weekly' | 'monthly';
  dateField: 'mergedAt' | 'createdAt';
  dateRange: {
    start: string | null;
    end: string | null;
  };
  totalDataPoints: number;
}

// 粒度の型定義
export type Granularity = 'daily' | 'weekly' | 'monthly';
export type DateField = 'mergedAt' | 'createdAt';

// 表示用のメトリクス情報
export interface MetricDisplayInfo {
  type: MetricType;
  title: string;
  description: string;
  unit: string;
  color: string;
}

// 各メトリクスの表示情報
export const METRIC_DISPLAY_INFO: Record<MetricType, MetricDisplayInfo> = {
  [MetricType.LEAD_TIME]: {
    type: MetricType.LEAD_TIME,
    title: 'リードタイム',
    description: 'PRの作成からマージまでの時間',
    unit: '時間',
    color: '#3B82F6'
  },
  [MetricType.PR_COUNT]: {
    type: MetricType.PR_COUNT,
    title: 'PR数',
    description: 'プルリクエストの作成・マージ数',
    unit: '件',
    color: '#10B981'
  },
  [MetricType.PR_SIZE]: {
    type: MetricType.PR_SIZE,
    title: 'PRサイズ',
    description: 'プルリクエストのサイズ（追加・削除行数）',
    unit: '行',
    color: '#8B5CF6'
  },
  [MetricType.DEPLOYMENT_FREQUENCY]: {
    type: MetricType.DEPLOYMENT_FREQUENCY,
    title: 'デプロイ頻度',
    description: '本番環境へのデプロイ頻度',
    unit: '回',
    color: '#F59E0B'
  },
  [MetricType.CHANGE_FAILURE_RATE]: {
    type: MetricType.CHANGE_FAILURE_RATE,
    title: '変更失敗率',
    description: 'デプロイ後の障害・ロールバック率',
    unit: '%',
    color: '#EF4444'
  }
};
