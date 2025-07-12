'use client';

import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Card, Button, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { MetricType, METRIC_DISPLAY_INFO } from '@/types/metrics';

Chart.register(...registerables);

// useStyles でスタイルを定義
const useStyles = createStyles(({ token }) => ({
  chartCard: {
    marginBottom: token.marginLG,
    
    '& .ant-card-body': {
      padding: token.paddingLG,
    },
  },
  
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: token.marginMD,
  },
  
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: token.marginSM,
  },
  
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: '50%',
  },
  
  chartTitle: {
    fontSize: token.fontSizeLG,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextHeading,
    margin: 0,
  },
  
  buttonGroup: {
    display: 'flex',
    gap: token.marginXS,
  },
  
  chartContainer: {
    position: 'relative',
    height: 384, // 24rem = 384px
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    gap: token.marginMD,
  },
  
  loadingText: {
    color: token.colorTextSecondary,
    fontSize: token.fontSize,
  },
  
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    backgroundColor: token.colorFillAlter,
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorBorder}`,
  },
  
  emptyText: {
    color: token.colorTextSecondary,
    fontSize: token.fontSize,
  },
  
  errorContainer: {
    backgroundColor: token.colorErrorBg,
    border: `1px solid ${token.colorErrorBorder}`,
    borderRadius: token.borderRadius,
    padding: token.padding,
  },
  
  errorText: {
    color: token.colorError,
    margin: 0,
    
    '& .error-label': {
      fontWeight: token.fontWeightStrong,
    },
  },
}));

interface MetricsChartProps {
  data: any[];
  loading: boolean;
  error: string | null;
  selectedMetric: MetricType;
  chartType?: 'line' | 'bar';
}

export function MetricsChart({ 
  data, 
  loading, 
  error, 
  selectedMetric, 
  chartType = 'line' 
}: MetricsChartProps) {
  const { styles } = useStyles();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const currentMetricInfo = METRIC_DISPLAY_INFO[selectedMetric];

  useEffect(() => {
    if (!chartRef.current || loading || error || !data.length) return;

    // 既存のチャートがあれば破棄
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // メトリクスタイプに応じたデータ抽出
    const getChartData = () => {
      switch (selectedMetric) {
        case MetricType.LEAD_TIME:
          return {
            labels: data.map(d => d.period),
            datasets: [{
              label: `平均${currentMetricInfo.title} (${currentMetricInfo.unit})`,
              data: data.map(d => d.averageLeadTimeHours),
              borderColor: currentMetricInfo.color,
              backgroundColor: currentMetricInfo.color + '20',
              fill: chartType === 'line'
            }]
          };
        case MetricType.PR_COUNT:
          return {
            labels: data.map(d => d.period),
            datasets: [
              {
                label: `総PR数`,
                data: data.map(d => d.pullRequestCount),
                borderColor: currentMetricInfo.color,
                backgroundColor: currentMetricInfo.color + '20',
                fill: chartType === 'line'
              },
              {
                label: `マージ済み`,
                data: data.map(d => d.mergedCount || 0),
                borderColor: '#10B981',
                backgroundColor: '#10B981' + '20',
                fill: chartType === 'line'
              },
              {
                label: `クローズ済み`,
                data: data.map(d => d.closedCount || 0),
                borderColor: '#EF4444',
                backgroundColor: '#EF4444' + '20',
                fill: chartType === 'line'
              }
            ]
          };
        case MetricType.PR_SIZE:
          return {
            labels: data.map(d => d.period),
            datasets: [
              {
                label: `平均サイズ (${currentMetricInfo.unit})`,
                data: data.map(d => d.averageSize),
                borderColor: currentMetricInfo.color,
                backgroundColor: currentMetricInfo.color + '20',
                fill: chartType === 'line'
              },
              {
                label: `中央値 (${currentMetricInfo.unit})`,
                data: data.map(d => d.medianSize || 0),
                borderColor: '#F59E0B',
                backgroundColor: '#F59E0B' + '20',
                fill: chartType === 'line'
              },
              {
                label: `平均追加行数`,
                data: data.map(d => d.averageAdditions || 0),
                borderColor: '#10B981',
                backgroundColor: '#10B981' + '20',
                fill: chartType === 'line'
              },
              {
                label: `平均削除行数`,
                data: data.map(d => d.averageDeletions || 0),
                borderColor: '#EF4444',
                backgroundColor: '#EF4444' + '20',
                fill: chartType === 'line'
              }
            ]
          };
        default:
          return {
            labels: data.map(d => d.period),
            datasets: [{
              label: currentMetricInfo.title,
              data: data.map(d => d.value || 0),
              borderColor: currentMetricInfo.color,
              backgroundColor: currentMetricInfo.color + '20',
              fill: chartType === 'line'
            }]
          };
      }
    };

    const chartData = getChartData();

    const config: ChartConfiguration = {
      type: chartType,
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `${currentMetricInfo.title}の推移`,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: '期間'
            }
          },
          y: {
            title: {
              display: true,
              text: currentMetricInfo.unit
            },
            beginAtZero: true
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        }
      }
    };

    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data, selectedMetric, chartType, loading, error]);

  if (loading) {
    return (
      <Card className={styles.chartCard}>
        <div className={styles.loadingContainer}>
          <Spin size="large" />
          <div className={styles.loadingText}>チャートを読み込み中...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.titleContainer}>
            <div 
              className={styles.colorIndicator}
              style={{ backgroundColor: currentMetricInfo.color }}
            />
            <h3 className={styles.chartTitle}>
              {currentMetricInfo.title}チャート
            </h3>
          </div>
        </div>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>
            <span className="error-label">エラー:</span> {error}
          </p>
        </div>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.titleContainer}>
            <div 
              className={styles.colorIndicator}
              style={{ backgroundColor: currentMetricInfo.color }}
            />
            <h3 className={styles.chartTitle}>
              {currentMetricInfo.title}チャート
            </h3>
          </div>
        </div>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>データがありません</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.titleContainer}>
          <div 
            className={styles.colorIndicator}
            style={{ backgroundColor: currentMetricInfo.color }}
          />
          <h3 className={styles.chartTitle}>
            {currentMetricInfo.title}チャート
          </h3>
        </div>
        <div className={styles.buttonGroup}>
          <Button
            size="small"
            type={chartType === 'line' ? 'primary' : 'default'}
            onClick={() => {/* chartType変更ロジック */}}
          >
            線グラフ
          </Button>
          <Button
            size="small"
            type={chartType === 'bar' ? 'primary' : 'default'}
            onClick={() => {/* chartType変更ロジック */}}
          >
            棒グラフ
          </Button>
        </div>
      </div>
      
      <div className={styles.chartContainer}>
        <canvas ref={chartRef} />
      </div>
    </Card>
  );
}
