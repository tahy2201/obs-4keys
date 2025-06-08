'use client';

import { useState } from 'react';
import { UseLeadTimeMetricsParams } from '@/types/lead-time-metrics';

interface LeadTimeFiltersProps {
  params: UseLeadTimeMetricsParams;
  onParamsChange: (newParams: UseLeadTimeMetricsParams) => void;
  loading?: boolean;
}

export function LeadTimeFilters({ params, onParamsChange, loading = false }: LeadTimeFiltersProps) {
  const [localParams, setLocalParams] = useState<UseLeadTimeMetricsParams>(params);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (field: keyof UseLeadTimeMetricsParams, value: string) => {
    const newParams = { ...localParams, [field]: value || undefined };
    setLocalParams(newParams);
  };

  const handleApplyFilters = () => {
    onParamsChange(localParams);
  };

  const handleReset = () => {
    const resetParams = {
      granularity: 'daily' as const,
      dateField: 'mergedAt' as const
    };
    setLocalParams(resetParams);
    onParamsChange(resetParams);
  };

  const getInputClass = (field: keyof UseLeadTimeMetricsParams) => {
    return `w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${localParams[field] ? 'text-gray-900 font-medium' : 'text-gray-500'}`;
  };
  
  const getSelectClass = (field: keyof UseLeadTimeMetricsParams) => {
    return `w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${localParams[field] ? 'text-gray-900 font-medium' : 'text-gray-500'}`;
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">フィルター設定</h3>
      
      {/* 基本フィルター: 横一列 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            開始日
          </label>
          <input
            type="date"
            value={localParams.startDate || ''}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            className={getInputClass('startDate')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            終了日
          </label>
          <input
            type="date"
            value={localParams.endDate || ''}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
            className={getInputClass('endDate')}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            集計粒度
          </label>
          <select
            value={localParams.granularity || 'daily'}
            onChange={(e) => handleInputChange('granularity', e.target.value)}
            className={getSelectClass('granularity')}
          >
            <option value="daily">日別</option>
            <option value="weekly">週別</option>
            <option value="monthly">月別</option>
          </select>
        </div>
      </div>

      {/* 詳細フィルター: アコーディオン */}
      <div>
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-700 focus:outline-none mb-2"
        >
          {showAdvanced ? '詳細設定を隠す' : '詳細設定を表示'} {showAdvanced ? '▲' : '▼'}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                リポジトリオーナー
              </label>
              <input
                type="text"
                value={localParams.repoOwner || ''}
                onChange={(e) => handleInputChange('repoOwner', e.target.value)}
                placeholder="例: microsoft"
                className={getInputClass('repoOwner')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                リポジトリ名
              </label>
              <input
                type="text"
                value={localParams.repoName || ''}
                onChange={(e) => handleInputChange('repoName', e.target.value)}
                placeholder="例: vscode"
                className={getInputClass('repoName')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日付基準
              </label>
              <select
                value={localParams.dateField || 'mergedAt'}
                onChange={(e) => handleInputChange('dateField', e.target.value)}
                className={getSelectClass('dateField')}
              >
                <option value="mergedAt">マージ日</option>
                <option value="createdAt">作成日</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ボタン */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleApplyFilters}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '更新中...' : 'フィルター適用'}
        </button>
        
        <button
          onClick={handleReset}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          リセット
        </button>
      </div>
    </div>
  );
}
