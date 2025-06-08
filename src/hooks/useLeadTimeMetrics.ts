import { useState, useEffect, useCallback } from 'react';
import { TimeSeriesResponse, UseLeadTimeMetricsParams } from '@/types/lead-time-metrics';

export function useLeadTimeMetrics(params: UseLeadTimeMetricsParams = {}) {
  const [data, setData] = useState<TimeSeriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // クエリパラメータを構築
      const queryParams = new URLSearchParams();
      
      if (params.startDate) queryParams.set('startDate', params.startDate);
      if (params.endDate) queryParams.set('endDate', params.endDate);
      if (params.repoOwner) queryParams.set('repoOwner', params.repoOwner);
      if (params.repoName) queryParams.set('repoName', params.repoName);
      if (params.granularity) queryParams.set('granularity', params.granularity);
      if (params.dateField) queryParams.set('dateField', params.dateField);

      const response = await fetch(`/api/metrics/lead-time/timeseries?${queryParams}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [params.startDate, params.endDate, params.repoOwner, params.repoName, params.granularity, params.dateField]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}
