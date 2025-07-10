'use client';

import { BaseMetadata, MetricType, METRIC_DISPLAY_INFO } from '@/types/metrics';

interface MetricsSummaryProps {
  metadata: BaseMetadata | null;
  loading: boolean;
  selectedMetric: MetricType;
  additionalStats?: Record<string, number>;
}

export function MetricsSummary({ 
  metadata, 
  loading, 
  selectedMetric, 
  additionalStats = {} 
}: MetricsSummaryProps) {
  const currentMetricInfo = METRIC_DISPLAY_INFO[selectedMetric];

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return null;
  }

  // 基本的な統計情報
  const basicStats = [
    {
      label: 'リポジトリ',
      value: metadata.repository,
      type: 'text' as const
    },
    {
      label: 'データ期間',
      value: metadata.dateRange.start && metadata.dateRange.end 
        ? `${metadata.dateRange.start} ~ ${metadata.dateRange.end}`
        : '全期間',
      type: 'text' as const
    },
    {
      label: '集計粒度',
      value: metadata.granularity === 'daily' ? '日別' : 
             metadata.granularity === 'weekly' ? '週別' : '月別',
      type: 'text' as const
    },
    {
      label: 'データポイント数',
      value: metadata.totalDataPoints,
      type: 'number' as const
    }
  ];

  // 追加の統計情報を結合
  const additionalStatsList = Object.entries(additionalStats).map(([key, value]) => ({
    label: key,
    value: value,
    type: 'number' as const
  }));

  const allStats = [...basicStats, ...additionalStatsList];

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <div 
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: currentMetricInfo.color }}
        />
        <h3 className="text-lg font-semibold text-gray-800">
          {currentMetricInfo.title} - サマリー
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {allStats.map((stat, index) => (
          <div key={index} className="space-y-1">
            <p className="text-sm text-gray-600">{stat.label}</p>
            <p className="text-xl font-semibold text-gray-900">
              {stat.type === 'number' ? stat.value.toLocaleString() : stat.value}
              {stat.type === 'number' && index < basicStats.length - 1 ? '' : ''}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <span className="font-medium">説明:</span> {currentMetricInfo.description}
        </p>
      </div>
    </div>
  );
}
