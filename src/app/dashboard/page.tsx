'use client';

import { useState } from 'react';
import { Row, Col, Typography } from 'antd';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import { GlobalFilters } from '@/components/GlobalFilters';
import { MetricsWidget } from '@/components/MetricsWidget';
import { BaseMetricsParams } from '@/types/metrics';
import { useLeadTimeMetrics } from '@/hooks/useLeadTimeMetrics';
import { usePRCountMetrics } from '@/hooks/usePRCountMetrics';
import { usePRSizeMetrics } from '@/hooks/usePRSizeMetrics';

const { Title } = Typography;

const useStyles = createStyles(({ token, css }) => ({
  dashboardContainer: css`
    min-height: 100vh;
    background: ${token.colorBgContainer};
  `,
  header: css`
    background: ${token.colorBgContainer};
    padding: ${token.paddingLG}px ${token.paddingLG}px 0;
    border-bottom: 1px solid ${token.colorBorder};
  `,
  title: css`
    text-align: center;
    color: ${token.colorTextHeading};
    margin-bottom: ${token.marginLG}px;
    font-weight: 700;
    
    @media (max-width: ${token.screenMD}px) {
      font-size: ${token.fontSizeHeading2}px;
    }
    
    @media (max-width: ${token.screenSM}px) {
      font-size: ${token.fontSizeHeading3}px;
    }
  `,
  content: css`
    padding: ${token.paddingLG}px;
    max-width: 1400px;
    margin: 0 auto;
    
    @media (max-width: ${token.screenMD}px) {
      padding: ${token.paddingMD}px;
    }
    
    @media (max-width: ${token.screenSM}px) {
      padding: ${token.paddingSM}px;
    }
  `,
  metricsGrid: css`
    margin-top: ${token.marginLG}px;
  `,
  widgetCol: css`
    margin-bottom: ${token.marginLG}px;
  `,
}));

export default function Dashboard() {
  const { styles } = useStyles();
  
  // グローバルフィルターパラメータ（デフォルトで直近3ヶ月）
  const [params, setParams] = useState<BaseMetricsParams>({
    granularity: 'daily',
    dateField: 'mergedAt',
    startDate: dayjs().subtract(3, 'months').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
  });

  // 各メトリクスのデータを並列取得
  const leadTimeData = useLeadTimeMetrics(params);
  const prCountData = usePRCountMetrics(params);
  const prSizeData = usePRSizeMetrics(params);

  const handleParamsChange = (newParams: BaseMetricsParams) => {
    setParams(newParams);
  };

  const handleApplyFilters = () => {
    // フィルター適用時の追加処理があれば実装
    console.log('Filters applied with params:', params);
  };

  const handleResetFilters = () => {
    const defaultParams: BaseMetricsParams = {
      granularity: 'daily',
      dateField: 'mergedAt',
      startDate: dayjs().subtract(3, 'months').format('YYYY-MM-DD'),
      endDate: dayjs().format('YYYY-MM-DD'),
    };
    setParams(defaultParams);
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* ヘッダー部分 */}
      <div className={styles.header}>
        <Title level={1} className={styles.title}>
          4 Keys メトリクス ダッシュボード
        </Title>
        
        {/* 上部固定フィルター */}
        <GlobalFilters
          params={params}
          onParamsChange={handleParamsChange}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* メインコンテンツ */}
      <div className={styles.content}>
        <Row gutter={[24, 24]} className={styles.metricsGrid}>
          {/* リードタイム */}
          <Col xs={24} lg={12} className={styles.widgetCol}>
            <MetricsWidget
              metricType="lead-time"
              data={leadTimeData.data}
              loading={leadTimeData.loading}
              error={leadTimeData.error}
            />
          </Col>

          {/* PR数 */}
          <Col xs={24} lg={12} className={styles.widgetCol}>
            <MetricsWidget
              metricType="pr-count"
              data={prCountData.data}
              loading={prCountData.loading}
              error={prCountData.error}
            />
          </Col>

          {/* PRサイズ */}
          <Col xs={24} lg={12} className={styles.widgetCol}>
            <MetricsWidget
              metricType="pr-size"
              data={prSizeData.data}
              loading={prSizeData.loading}
              error={prSizeData.error}
            />
          </Col>

          {/* デプロイ頻度 (将来実装用) */}
          <Col xs={24} lg={12} className={styles.widgetCol}>
            <MetricsWidget
              metricType="deployment"
              data={null}
              loading={false}
              error="実装予定"
            />
          </Col>
        </Row>
      </div>
    </div>
  );
}