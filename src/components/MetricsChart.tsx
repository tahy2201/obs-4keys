'use client';

import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { MetricType, METRIC_DISPLAY_INFO } from '@/types/metrics';

Chart.register(...registerables);

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
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: currentMetricInfo.color }}
          />
          <h3 className="text-lg font-semibold text-gray-800">
            {currentMetricInfo.title}チャート
          </h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">
            <span className="font-medium">エラー:</span> {error}
          </p>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: currentMetricInfo.color }}
          />
          <h3 className="text-lg font-semibold text-gray-800">
            {currentMetricInfo.title}チャート
          </h3>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">データがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: currentMetricInfo.color }}
          />
          <h3 className="text-lg font-semibold text-gray-800">
            {currentMetricInfo.title}チャート
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {/* chartType変更ロジック */}}
            className={`px-3 py-1 rounded text-sm ${
              chartType === 'line' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            線グラフ
          </button>
          <button
            onClick={() => {/* chartType変更ロジック */}}
            className={`px-3 py-1 rounded text-sm ${
              chartType === 'bar' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            棒グラフ
          </button>
        </div>
      </div>
      
      <div className="relative h-96">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}
