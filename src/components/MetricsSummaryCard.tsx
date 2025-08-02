'use client';

import React from 'react';
import { Card, Statistic, Row, Col, Typography } from 'antd';
import { createStyles } from 'antd-style';

const { Title } = Typography;

interface MetricData {
  label: string;
  value: number | string;
  suffix?: string;
  precision?: number;
  valueStyle?: React.CSSProperties;
}

interface MetricsSummaryCardProps {
  title: string;
  icon?: React.ReactNode;
  color?: string;
  metrics: MetricData[];
  loading?: boolean;
}

const useStyles = createStyles(({ token, css }) => ({
  summaryCard: css`
    height: 100%;
    .ant-card-body {
      padding: ${token.paddingLG}px;
    }
  `,
  cardHeader: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
    margin-bottom: ${token.marginMD}px;
  `,
  cardIcon: css`
    width: 32px;
    height: 32px;
    border-radius: ${token.borderRadius}px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: white;
  `,
  cardTitle: css`
    margin: 0 !important;
    font-weight: 600;
    color: ${token.colorTextHeading};
  `,
  metricItem: css`
    text-align: center;
    padding: ${token.paddingSM}px 0;
    border-radius: ${token.borderRadiusSM}px;
    background: ${token.colorFillAlter};
    
    .ant-statistic-title {
      font-size: ${token.fontSizeSM}px;
      color: ${token.colorTextSecondary};
      margin-bottom: ${token.marginXXS}px;
    }
    
    .ant-statistic-content {
      font-weight: 600;
    }
  `,
}));

export const MetricsSummaryCard: React.FC<MetricsSummaryCardProps> = ({
  title,
  icon,
  color = '#1677ff',
  metrics,
  loading = false,
}) => {
  const { styles } = useStyles();

  return (
    <Card className={styles.summaryCard} loading={loading}>
      <div className={styles.cardHeader}>
        {icon && (
          <div className={styles.cardIcon} style={{ backgroundColor: color }}>
            {icon}
          </div>
        )}
        <Title level={4} className={styles.cardTitle}>
          {title}
        </Title>
      </div>
      
      <Row gutter={[12, 12]}>
        {metrics.map((metric, index) => (
          <Col span={metrics.length <= 2 ? 12 : 8} key={index}>
            <div className={styles.metricItem}>
              <Statistic
                title={metric.label}
                value={metric.value}
                suffix={metric.suffix}
                precision={metric.precision}
                valueStyle={metric.valueStyle}
              />
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );
};