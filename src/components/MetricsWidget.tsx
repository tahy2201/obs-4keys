'use client';

import React from 'react';
import { Card, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { SimpleChart } from './SimpleChart';
import { MetricsSummaryCard } from './MetricsSummaryCard';
import { 
  ClockCircleOutlined, 
  PullRequestOutlined, 
  CodeOutlined,
  RocketOutlined,
  BugOutlined 
} from '@ant-design/icons';

interface MetricsWidgetProps {
  metricType: 'lead-time' | 'pr-count' | 'pr-size' | 'deployment' | 'failure-rate';
  data: any | null; // APIレスポンスの型に柔軟に対応
  loading: boolean;
  error: any;
}

const useStyles = createStyles(({ token, css }) => ({
  widgetContainer: css`
    height: 100%;
    display: flex;
    flex-direction: column;
  `,
  chartCard: css`
    flex: 1;
    margin-top: ${token.marginMD}px;
    
    .ant-card-body {
      padding: ${token.paddingLG}px;
      height: 300px;
      display: flex;
      flex-direction: column;
    }
  `,
  emptyState: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: ${token.colorTextSecondary};
  `,
}));

const metricConfigs = {
  'lead-time': {
    title: 'リードタイム',
    icon: <ClockCircleOutlined />,
    color: '#1677ff',
    chartType: 'line' as const,
    dataKeys: ['averageLeadTimeHours'],
    getSummaryMetrics: (data: any | null) => [
      {
        label: '平均時間',
        value: data?.timeSeries?.length > 0 
          ? data.timeSeries.reduce((sum: number, item: any) => sum + (item.averageLeadTimeHours || 0), 0) / data.timeSeries.length
          : 0,
        suffix: '時間',
        precision: 1,
      },
      {
        label: '総PR数',
        value: data?.metadata?.totalPullRequests || 0,
        suffix: '件',
      },
      {
        label: 'データ点数',
        value: data?.metadata?.totalDataPoints || 0,
        suffix: '点',
      },
    ],
  },
  'pr-count': {
    title: 'PR数',
    icon: <PullRequestOutlined />,
    color: '#52c41a',
    chartType: 'bar' as const,
    dataKeys: ['totalPRs', 'mergedPRs', 'createdPRs'],
    getSummaryMetrics: (data: any | null) => [
      {
        label: '総PR数',
        value: data?.timeSeries?.reduce((sum: number, item: any) => sum + (item.pullRequestCount || 0), 0) || 0,
        suffix: '件',
      },
      {
        label: 'マージ済',
        value: data?.timeSeries?.reduce((sum: number, item: any) => sum + (item.mergedCount || 0), 0) || 0,
        suffix: '件',
      },
    ],
  },
  'pr-size': {
    title: 'PRサイズ',
    icon: <CodeOutlined />,
    color: '#722ed1',
    chartType: 'line' as const,
    dataKeys: ['averageAdditions', 'averageDeletions'],
    getSummaryMetrics: (data: any | null) => [
      {
        label: '平均追加行',
        value: data?.timeSeries?.length > 0 
          ? data.timeSeries.reduce((sum: number, item: any) => sum + (item.averageAdditions || 0), 0) / data.timeSeries.length
          : 0,
        suffix: '行',
        precision: 0,
      },
      {
        label: '平均削除行',
        value: data?.timeSeries?.length > 0 
          ? data.timeSeries.reduce((sum: number, item: any) => sum + (item.averageDeletions || 0), 0) / data.timeSeries.length
          : 0,
        suffix: '行',
        precision: 0,
      },
    ],
  },
  'deployment': {
    title: 'デプロイ頻度',
    icon: <RocketOutlined />,
    color: '#fa8c16',
    chartType: 'bar' as const,
    dataKeys: ['deploymentCount'],
    getSummaryMetrics: (data: any | null) => [
      {
        label: '総デプロイ数',
        value: data?.metadata?.totalDeployments || 0,
        suffix: '回',
      },
      {
        label: '平均頻度',
        value: data?.metadata?.averageDeploymentsPerDay || 0,
        suffix: '回/日',
        precision: 2,
      },
    ],
  },
  'failure-rate': {
    title: '変更失敗率',
    icon: <BugOutlined />,
    color: '#f5222d',
    chartType: 'line' as const,
    dataKeys: ['failureRate'],
    getSummaryMetrics: (data: any | null) => [
      {
        label: '失敗率',
        value: data?.metadata?.failureRate || 0,
        suffix: '%',
        precision: 2,
      },
      {
        label: '総失敗数',
        value: data?.metadata?.totalFailures || 0,
        suffix: '件',
      },
    ],
  },
};

export const MetricsWidget: React.FC<MetricsWidgetProps> = ({
  metricType,
  data,
  loading,
  error,
}) => {
  const { styles } = useStyles();
  const config = metricConfigs[metricType];

  if (error) {
    return (
      <div className={styles.widgetContainer}>
        <MetricsSummaryCard
          title={config.title}
          icon={config.icon}
          color={config.color}
          metrics={[
            { label: 'エラー', value: 'データ取得失敗' }
          ]}
        />
      </div>
    );
  }

  return (
    <div className={styles.widgetContainer}>
      <MetricsSummaryCard
        title={config.title}
        icon={config.icon}
        color={config.color}
        metrics={config.getSummaryMetrics(data)}
        loading={loading}
      />
      
      <Card className={styles.chartCard}>
        {loading ? (
          <div className={styles.emptyState}>
            <Spin size="large" />
          </div>
        ) : data && data.timeSeries?.length > 0 ? (
          <SimpleChart
            data={data.timeSeries}
            metricType={metricType}
            chartType={config.chartType}
            height={250}
          />
        ) : (
          <div className={styles.emptyState}>
            データがありません
          </div>
        )}
      </Card>
    </div>
  );
};