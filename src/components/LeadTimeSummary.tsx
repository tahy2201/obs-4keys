'use client';

import { TimeSeriesMetadata } from '@/types/lead-time-metrics';

interface LeadTimeSummaryProps {
  metadata: TimeSeriesMetadata | null;
  loading?: boolean;
}

export function LeadTimeSummary({ metadata, loading = false }: LeadTimeSummaryProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
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

  const formatDateField = (dateField: string) => {
    return dateField === 'mergedAt' ? 'マージ日基準' : '作成日基準';
  };

  const formatGranularity = (granularity: string) => {
    switch (granularity) {
      case 'daily': return '日別';
      case 'weekly': return '週別';
      case 'monthly': return '月別';
      default: return granularity;
    }
  };

  const formatDateRange = () => {
    if (metadata.dateRange.start && metadata.dateRange.end) {
      return `${metadata.dateRange.start} 〜 ${metadata.dateRange.end}`;
    } else if (metadata.dateRange.start) {
      return `${metadata.dateRange.start} 以降`;
    } else if (metadata.dateRange.end) {
      return `${metadata.dateRange.end} 以前`;
    }
    return '全期間';
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">データサマリー</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* リポジトリ情報 */}
        <div className="space-y-1">
          <div className="text-sm text-gray-500">リポジトリ</div>
          <div className="text-lg font-medium text-gray-800">
            {metadata.repository}
          </div>
        </div>

        {/* 集計設定 */}
        <div className="space-y-1">
          <div className="text-sm text-gray-500">集計設定</div>
          <div className="text-lg font-medium text-gray-800">
            {formatGranularity(metadata.granularity)}
          </div>
          <div className="text-xs text-blue-600">
            {formatDateField(metadata.dateField)}
          </div>
        </div>

        {/* 対象期間 */}
        <div className="space-y-1">
          <div className="text-sm text-gray-500">対象期間</div>
          <div className="text-lg font-medium text-gray-800">
            {formatDateRange()}
          </div>
        </div>

        {/* 統計情報 */}
        <div className="space-y-1">
          <div className="text-sm text-gray-500">統計情報</div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">データポイント:</span>
              <span className="font-medium">{metadata.totalDataPoints}件</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">総PR数:</span>
              <span className="font-medium">{metadata.totalPullRequests}件</span>
            </div>
          </div>
        </div>
      </div>

      {/* 詳細情報を小さく表示 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          💡 ヒント: {metadata.dateField === 'mergedAt' ? 'PRがマージされた日付' : 'PRが作成された日付'}
          でリードタイムを{formatGranularity(metadata.granularity).toLowerCase()}集計しています
        </div>
      </div>
    </div>
  );
}
