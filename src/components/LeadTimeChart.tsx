'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TimeSeriesDataPoint } from '@/types/lead-time-metrics';

interface LeadTimeChartProps {
  data: TimeSeriesDataPoint[];
  loading?: boolean;
  error?: string | null;
  showHours?: boolean; // 時間単位で表示するかどうか
  chartType?: 'line' | 'bar'; // チャートタイプの選択
}

export function LeadTimeChart({ 
  data, 
  loading = false, 
  error = null, 
  showHours = true,
  chartType = 'line'
}: LeadTimeChartProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">データを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center">
          <div className="text-red-600 font-medium">エラーが発生しました</div>
          <div className="text-red-500 text-sm mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium">データがありません</div>
          <div className="text-sm mt-1">指定した条件でのデータが見つかりませんでした</div>
        </div>
      </div>
    );
  }

  // データを整形（日付フォーマットとか）
  const chartData = data.map(point => ({
    ...point,
    displayValue: showHours ? point.averageLeadTimeHours : point.averageLeadTime,
    displayDate: point.period || point.date,
  }));

  const valueLabel = showHours ? 'リードタイム (時間)' : 'リードタイム (秒)';
  const valueDataKey = 'displayValue';

  // カスタムTooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800">{`期間: ${label}`}</p>
          <p className="text-blue-600">
            {`${valueLabel}: ${payload[0].value}${showHours ? '時間' : '秒'}`}
          </p>
          <p className="text-green-600">
            {`PR数: ${data.pullRequestCount}件`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-96 p-4 bg-white rounded-lg border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          リードタイム推移
        </h3>
        <p className="text-sm text-gray-600">
          {showHours ? '平均リードタイム（時間単位）' : '平均リードタイム（秒単位）'}
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'line' ? (
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate" 
              stroke="#666"
              fontSize={12}
              tick={{ fill: '#666' }}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tick={{ fill: '#666' }}
              label={{ value: valueLabel, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={valueDataKey} 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              name={valueLabel}
            />
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate" 
              stroke="#666"
              fontSize={12}
              tick={{ fill: '#666' }}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tick={{ fill: '#666' }}
              label={{ value: valueLabel, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey={valueDataKey} 
              fill="#3b82f6"
              name={valueLabel}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
