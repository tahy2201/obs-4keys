'use client'; // クライアントコンポーネントとしてマーク

import { useState } from 'react';
import { MetricsFilters } from "@/components/MetricsFilters";
import { MetricsSummary } from "@/components/MetricsSummary";
import { MetricsChart } from "@/components/MetricsChart";
import { BaseMetricsParams, MetricType } from "@/types/metrics";
import { useLeadTimeMetrics } from '@/hooks/useLeadTimeMetrics';
import { usePRCountMetrics } from '@/hooks/usePRCountMetrics';

export default function Dashboard() {
  // フィルターパラメータの状態管理
  const [params, setParams] = useState<BaseMetricsParams>({
    granularity: 'daily',
    dateField: 'mergedAt',
  });

  // 選択されたメトリクスの状態管理
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(MetricType.LEAD_TIME);

  // 各メトリクスのデータを取得
  const leadTimeData = useLeadTimeMetrics(params);
  const prCountData = usePRCountMetrics(params);

  // 現在選択されているメトリクスのデータを取得
  const getCurrentMetricData = () => {
    switch (selectedMetric) {
      case MetricType.LEAD_TIME:
        return leadTimeData;
      case MetricType.PR_COUNT:
        return prCountData;
      default:
        return { data: null, loading: false, error: 'Unsupported metric type' };
    }
  };

  const currentData = getCurrentMetricData();
  
  // デバッグ用ログ
  console.log('Current metric:', selectedMetric);
  console.log('Current data:', currentData);
  console.log('Time series data:', currentData.data?.timeSeries);

  // フィルターのパラメータが変更されたときの処理
  const handleParamsChange = (newParams: BaseMetricsParams) => {
    setParams(newParams);
  };

  // メトリクス変更時の処理
  const handleMetricChange = (metric: MetricType) => {
    setSelectedMetric(metric);
  };

  // 追加統計情報を取得
  const getAdditionalStats = (): Record<string, number> => {
    if (!currentData.data?.metadata) {
      // すべて0で返すようにする
      if (selectedMetric === MetricType.PR_COUNT) {
        return {
          '総PR数': 0,
          'マージ済み': 0,
          'クローズ済み': 0
        };
      }
      return { '総PR数': 0 };
    }
    
    switch (selectedMetric) {
      case MetricType.LEAD_TIME:
        return {
          '総PR数': currentData.data.metadata.totalPullRequests ?? 0
        };
      case MetricType.PR_COUNT:
        const metadata = currentData.data.metadata as any;
        return {
          '総PR数': metadata.totalPullRequests ?? 0,
          'マージ済み': metadata.totalMergedPRs ?? 0,
          'クローズ済み': metadata.totalClosedPRs ?? 0
        };
      default:
        return { '総PR数': 0 };
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
        4 Keys メトリクス ダッシュボード
      </h1>

      {/* フィルターコンポーネント */}
      <MetricsFilters
        params={params}
        onParamsChange={handleParamsChange}
        selectedMetric={selectedMetric}
        onMetricChange={handleMetricChange}
        loading={currentData.loading}
      />

      {/* サマリーコンポーネント */}
      <MetricsSummary 
        metadata={currentData.data?.metadata || null} 
        loading={currentData.loading}
        selectedMetric={selectedMetric}
        additionalStats={getAdditionalStats()}
      />

      {/* チャートコンポーネント */}
      <MetricsChart
        data={currentData.data?.timeSeries || []}
        loading={currentData.loading}
        error={currentData.error}
        selectedMetric={selectedMetric}
        chartType="line"
      />
      
      {/* エラー表示 (任意) */}
      {currentData.error && !currentData.loading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">エラー:</strong>
          <span className="block sm:inline"> {currentData.error}</span>
        </div>
      )}
    </div>
  );
}