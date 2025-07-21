'use client';

import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { createStyles } from 'antd-style';

Chart.register(...registerables);

interface SimpleChartProps {
  data: any[];
  metricType: 'lead-time' | 'pr-count' | 'pr-size' | 'deployment' | 'failure-rate';
  chartType?: 'line' | 'bar';
  height?: number;
}

const useStyles = createStyles(({ token, css }) => ({
  chartContainer: css`
    position: relative;
    width: 100%;
    height: 100%;
  `,
}));

export const SimpleChart: React.FC<SimpleChartProps> = ({
  data,
  metricType,
  chartType = 'line',
  height = 250,
}) => {
  const { styles } = useStyles();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // 既存のチャートがあれば破棄
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // メトリクスタイプに応じたチャート設定
    const getChartConfig = (): ChartConfiguration => {
      const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
            labels: {
              boxWidth: 12,
              font: {
                size: 11,
              },
            },
          },
          title: {
            display: false,
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false,
            },
            ticks: {
              font: {
                size: 10,
              },
              maxRotation: 45,
            },
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
            ticks: {
              font: {
                size: 10,
              },
            },
          },
        },
        interaction: {
          mode: 'index' as const,
          intersect: false,
        },
      };

      switch (metricType) {
        case 'lead-time':
          return {
            type: chartType,
            data: {
              labels: data.map(d => d.period || d.date),
              datasets: [{
                label: '平均リードタイム (時間)',
                data: data.map(d => d.averageLeadTimeHours || 0),
                borderColor: '#1677ff',
                backgroundColor: chartType === 'bar' ? '#1677ff20' : '#1677ff10',
                fill: chartType === 'line',
                tension: 0.4,
              }],
            },
            options: {
              ...commonOptions,
              scales: {
                ...commonOptions.scales,
                y: {
                  ...commonOptions.scales?.y,
                  title: {
                    display: true,
                    text: '時間',
                  },
                },
              },
            },
          };

        case 'pr-count':
          return {
            type: chartType,
            data: {
              labels: data.map(d => d.period || d.date),
              datasets: [
                {
                  label: '総PR数',
                  data: data.map(d => d.pullRequestCount || d.totalPRs || 0),
                  borderColor: '#52c41a',
                  backgroundColor: chartType === 'bar' ? '#52c41a60' : '#52c41a20',
                  fill: chartType === 'line',
                  tension: 0.4,
                },
                {
                  label: 'マージ済み',
                  data: data.map(d => d.mergedCount || d.mergedPRs || 0),
                  borderColor: '#10B981',
                  backgroundColor: chartType === 'bar' ? '#10B98160' : '#10B98120',
                  fill: chartType === 'line',
                  tension: 0.4,
                },
              ],
            },
            options: {
              ...commonOptions,
              scales: {
                ...commonOptions.scales,
                y: {
                  ...commonOptions.scales?.y,
                  title: {
                    display: true,
                    text: '件数',
                  },
                },
              },
            },
          };

        case 'pr-size':
          return {
            type: chartType,
            data: {
              labels: data.map(d => d.period || d.date),
              datasets: [
                {
                  label: '平均追加行数',
                  data: data.map(d => d.averageAdditions || 0),
                  borderColor: '#722ed1',
                  backgroundColor: chartType === 'bar' ? '#722ed160' : '#722ed120',
                  fill: chartType === 'line',
                  tension: 0.4,
                },
                {
                  label: '平均削除行数',
                  data: data.map(d => d.averageDeletions || 0),
                  borderColor: '#f5222d',
                  backgroundColor: chartType === 'bar' ? '#f5222d60' : '#f5222d20',
                  fill: chartType === 'line',
                  tension: 0.4,
                },
              ],
            },
            options: {
              ...commonOptions,
              scales: {
                ...commonOptions.scales,
                y: {
                  ...commonOptions.scales?.y,
                  title: {
                    display: true,
                    text: '行数',
                  },
                },
              },
            },
          };

        default:
          return {
            type: chartType,
            data: {
              labels: data.map(d => d.period || d.date),
              datasets: [{
                label: 'データ',
                data: data.map(d => d.value || 0),
                borderColor: '#999',
                backgroundColor: chartType === 'bar' ? '#99960' : '#99920',
                fill: chartType === 'line',
                tension: 0.4,
              }],
            },
            options: commonOptions,
          };
      }
    };

    const config = getChartConfig();
    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data, metricType, chartType]);

  return (
    <div className={styles.chartContainer} style={{ height }}>
      <canvas ref={chartRef} />
    </div>
  );
};