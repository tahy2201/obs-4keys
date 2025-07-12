'use client'; // クライアントコンポーネントとしてマーク

import { useState } from 'react';
import { Card } from 'antd';
import { createStyles } from 'antd-style';
import { MetricsFilters } from "@/components/MetricsFilters";
import { MetricsSummary } from "@/components/MetricsSummary";
import { MetricsChart } from "@/components/MetricsChart";
import { BaseMetricsParams, MetricType } from "@/types/metrics";
import { useLeadTimeMetrics } from '@/hooks/useLeadTimeMetrics';
import { usePRCountMetrics } from '@/hooks/usePRCountMetrics';
import { usePRSizeMetrics } from '@/hooks/usePRSizeMetrics';

// useStyles を使用してスタイルを定義
const useStyles = createStyles(({ token }) => ({
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: `${token.padding}px ${token.paddingLG}px`,
    
    [`@media (max-width: ${token.screenMD}px)`]: {
      padding: `${token.paddingSM}px ${token.padding}px`,
    },
    
    [`@media (max-width: ${token.screenSM}px)`]: {
      padding: `${token.paddingXS}px ${token.paddingSM}px`,
    },
  },
  
  title: {
    fontSize: token.fontSizeHeading1,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextHeading,
    marginBottom: token.marginLG,
    textAlign: 'center',
    
    [`@media (max-width: ${token.screenMD}px)`]: {
      fontSize: token.fontSizeHeading2,
    },
    
    [`@media (max-width: ${token.screenSM}px)`]: {
      fontSize: token.fontSizeHeading3,
    },
  },
  
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginLG,
  },
  
  errorCard: {
    borderColor: token.colorError,
    
    '& .ant-card-body': {
      backgroundColor: token.colorErrorBg,
    },
  },
  
  errorTitle: {
    color: token.colorError,
    fontWeight: token.fontWeightStrong,
    marginBottom: token.marginXS,
  },
  
  errorMessage: {
    color: token.colorErrorText,
    margin: 0,
    
    [`@media (max-width: ${token.screenSM}px)`]: {
      display: 'block',
    },
  },
}));

export default function Dashboard() {
  const { styles } = useStyles();
  
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
  const prSizeData = usePRSizeMetrics(params);

  // 現在選択されているメトリクスのデータを取得
  const getCurrentMetricData = () => {
    switch (selectedMetric) {
      case MetricType.LEAD_TIME:
        return leadTimeData;
      case MetricType.PR_COUNT:
        return prCountData;
      case MetricType.PR_SIZE:
        return prSizeData;
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
      } else if (selectedMetric === MetricType.PR_SIZE) {
        return {
          '総PR数': 0,
          '最大サイズ': 0,
          '最小サイズ': 0
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
        const prCountMetadata = currentData.data.metadata as any;
        return {
          '総PR数': prCountMetadata.totalPullRequests ?? 0,
          'マージ済み': prCountMetadata.totalMergedPRs ?? 0,
          'クローズ済み': prCountMetadata.totalClosedPRs ?? 0
        };
      case MetricType.PR_SIZE:
        const prSizeMetadata = currentData.data.metadata as any;
        return {
          '総PR数': prSizeMetadata.totalPullRequests ?? 0,
          '最大サイズ': prSizeMetadata.maxSize ?? 0,
          '最小サイズ': prSizeMetadata.minSize ?? 0
        };
      default:
        return { '総PR数': 0 };
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        4 Keys メトリクス ダッシュボード
      </h1>

      <div className={styles.content}>
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
        
        {/* エラー表示 */}
        {currentData.error && !currentData.loading && (
          <Card className={styles.errorCard}>
            <div className={styles.errorTitle}>エラー:</div>
            <div className={styles.errorMessage}>{currentData.error}</div>
          </Card>
        )}
      </div>
    </div>
  );
}