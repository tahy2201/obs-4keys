'use client'; // クライアントコンポーネントとしてマーク

import { useState } from 'react';
import { LeadTimeFilters } from "@/components/LeadTimeFilters";
import { LeadTimeSummary } from "@/components/LeadTimeSummary";
import { LeadTimeChart } from "@/components/LeadTimeChart"; // Chartコンポーネントをインポート
import { UseLeadTimeMetricsParams } from "@/types/lead-time-metrics";
import { useLeadTimeMetrics } from '@/hooks/useLeadTimeMetrics'; // カスタムフックをインポート

export default function Home() {
  // フィルターパラメータの状態管理
  const [params, setParams] = useState<UseLeadTimeMetricsParams>({
    // 初期値を設定 (任意)
    granularity: 'daily',
    dateField: 'mergedAt',
  });

  // カスタムフックでデータを取得
  const { data, loading, error, refetch } = useLeadTimeMetrics(params);

  // フィルターのパラメータが変更されたときの処理
  const handleParamsChange = (newParams: UseLeadTimeMetricsParams) => {
    setParams(newParams);
    // refetch(); // paramsの変更をuseEffectが検知して自動で再フェッチされるので、通常は不要
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
        リードタイム分析ダッシュボード
      </h1>

      {/* フィルターコンポーネント */}
      <LeadTimeFilters
        params={params}
        onParamsChange={handleParamsChange}
        loading={loading}
      />

      {/* サマリーコンポーネント */}
      <LeadTimeSummary 
        metadata={data?.metadata || null} 
        loading={loading} 
      />

      {/* チャートコンポーネント */}
      <LeadTimeChart
        data={data?.timeSeries || []}
        loading={loading}
        error={error}
        // オプション: 表示を時間単位にするか、チャートタイプを選択
        // showHours={true} 
        // chartType='line' 
      />
      
      {/* エラー表示 (任意) */}
      {error && !loading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">エラー:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
    </div>
  );
}