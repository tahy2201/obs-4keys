'use client';

import { Card, Statistic, Row, Col, Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { BaseMetadata, MetricType, METRIC_DISPLAY_INFO } from '@/types/metrics';

// useStyles でスタイルを定義
const useStyles = createStyles(({ token }) => ({
  summaryCard: {
    marginBottom: token.marginLG,
    
    '& .ant-card-body': {
      padding: token.paddingLG,
    },
  },
  
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: token.marginSM,
    marginBottom: token.marginMD,
  },
  
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: '50%',
  },
  
  cardTitle: {
    fontSize: token.fontSizeLG,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextHeading,
    margin: 0,
  },
  
  descriptionCard: {
    marginTop: token.marginMD,
    backgroundColor: token.colorFillAlter,
    border: 'none',
    
    '& .ant-card-body': {
      padding: token.paddingSM,
    },
  },
  
  descriptionText: {
    fontSize: token.fontSizeSM,
    color: token.colorTextSecondary,
    margin: 0,
    
    '& .description-label': {
      fontWeight: token.fontWeightStrong,
    },
  },
  
  skeletonCard: {
    marginBottom: token.marginLG,
    
    '& .ant-card-body': {
      padding: token.paddingLG,
    },
  },
}));

interface MetricsSummaryProps {
  metadata: BaseMetadata | null;
  loading: boolean;
  selectedMetric: MetricType;
  additionalStats?: Record<string, number>;
}

export function MetricsSummary({ 
  metadata, 
  loading, 
  selectedMetric, 
  additionalStats = {} 
}: MetricsSummaryProps) {
  const { styles } = useStyles();
  const currentMetricInfo = METRIC_DISPLAY_INFO[selectedMetric];

  if (loading) {
    return (
      <Card className={styles.skeletonCard}>
        <Skeleton active title={{ width: '25%' }} paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  if (!metadata) {
    return null;
  }

  // 基本的な統計情報
  const basicStats = [
    {
      label: 'リポジトリ',
      value: metadata.repository,
      type: 'text' as const
    },
    {
      label: 'データ期間',
      value: metadata.dateRange.start && metadata.dateRange.end 
        ? `${metadata.dateRange.start} ~ ${metadata.dateRange.end}`
        : '全期間',
      type: 'text' as const
    },
    {
      label: '集計粒度',
      value: metadata.granularity === 'daily' ? '日別' : 
             metadata.granularity === 'weekly' ? '週別' : '月別',
      type: 'text' as const
    },
    {
      label: 'データポイント数',
      value: metadata.totalDataPoints,
      type: 'number' as const
    }
  ];

  // 追加の統計情報を結合
  const additionalStatsList = Object.entries(additionalStats).map(([key, value]) => ({
    label: key,
    value: value,
    type: 'number' as const
  }));

  const allStats = [...basicStats, ...additionalStatsList];

  return (
    <Card className={styles.summaryCard}>
      <div className={styles.cardHeader}>
        <div 
          className={styles.colorIndicator}
          style={{ backgroundColor: currentMetricInfo.color }}
        />
        <h3 className={styles.cardTitle}>
          {currentMetricInfo.title} - サマリー
        </h3>
      </div>

      <Row gutter={[16, 16]}>
        {allStats.map((stat, index) => (
          <Col key={index} xs={24} sm={12} lg={6}>
            <Statistic
              title={stat.label}
              value={stat.type === 'number' ? stat.value : undefined}
              formatter={stat.type === 'number' ? 
                (value) => value?.toLocaleString() : undefined}
              suffix={stat.type === 'text' ? stat.value : undefined}
              valueStyle={{
                fontSize: stat.type === 'text' ? '16px' : '20px',
                fontWeight: 600
              }}
            />
          </Col>
        ))}
      </Row>

      <Card className={styles.descriptionCard}>
        <p className={styles.descriptionText}>
          <span className="description-label">説明:</span> {currentMetricInfo.description}
        </p>
      </Card>
    </Card>
  );
}
