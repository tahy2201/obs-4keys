import { useState, useEffect } from 'react';
import { PRCountResponse, PRCountQueryParams } from '@/app/api/metrics/pr-count/timeseries/route';

export interface UsePRCountMetricsParams {
  startDate?: string;
  endDate?: string;
  repoOwner?: string;
  repoName?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  dateField?: 'mergedAt' | 'createdAt';
}

export interface UsePRCountMetricsReturn {
  data: PRCountResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePRCountMetrics(params: UsePRCountMetricsParams): UsePRCountMetricsReturn {
  const [data, setData] = useState<PRCountResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // URLSearchParamsを使ってクエリパラメータを構築
      const searchParams = new URLSearchParams();
      
      // パラメータを追加
      if (params.startDate) searchParams.append('startDate', params.startDate);
      if (params.endDate) searchParams.append('endDate', params.endDate);
      if (params.repoOwner) searchParams.append('repoOwner', params.repoOwner);
      if (params.repoName) searchParams.append('repoName', params.repoName);
      if (params.granularity) searchParams.append('granularity', params.granularity);
      if (params.dateField) searchParams.append('dateField', params.dateField);

      const url = `/api/metrics/pr-count/timeseries?${searchParams.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('PR Count API Response:', result);
      console.log('PR Count API Data Structure:', result.data);
      console.log('PR Count API TimeSeries:', result.data?.timeSeries);
      
      // createSuccessResponseの構造に合わせる
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error('Invalid response structure');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching PR count metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    params.startDate,
    params.endDate,
    params.repoOwner,
    params.repoName,
    params.granularity,
    params.dateField
  ]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}
