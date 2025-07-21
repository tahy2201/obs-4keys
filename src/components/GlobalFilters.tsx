'use client';

import React from 'react';
import { Card, Row, Col, DatePicker, Select, Button, Space } from 'antd';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import { BaseMetricsParams } from '@/types/metrics';

const { RangePicker } = DatePicker;

interface GlobalFiltersProps {
  params: BaseMetricsParams;
  onParamsChange: (newParams: BaseMetricsParams) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

const useStyles = createStyles(({ token, css }) => ({
  filtersHeader: css`
    position: sticky;
    top: 0;
    z-index: 1000;
    background: ${token.colorBgContainer};
    border-bottom: 1px solid ${token.colorBorder};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    margin-bottom: ${token.marginLG}px;
  `,
  filtersCard: css`
    border: none;
    border-radius: 0;
    .ant-card-body {
      padding: ${token.paddingMD}px ${token.paddingLG}px;
    }
  `,
  filterItem: css`
    display: flex;
    flex-direction: column;
    gap: ${token.marginXS}px;
  `,
  filterLabel: css`
    font-weight: 500;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
  actionButtons: css`
    display: flex;
    justify-content: flex-end;
    gap: ${token.marginSM}px;
  `,
}));

export const GlobalFilters: React.FC<GlobalFiltersProps> = ({
  params,
  onParamsChange,
  onApplyFilters,
  onResetFilters,
}) => {
  const { styles } = useStyles();

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      onParamsChange({
        ...params,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
      });
    }
  };

  const handleGranularityChange = (value: string) => {
    onParamsChange({
      ...params,
      granularity: value as 'daily' | 'weekly' | 'monthly',
    });
  };

  const handleDateFieldChange = (value: string) => {
    onParamsChange({
      ...params,
      dateField: value as 'mergedAt' | 'createdAt',
    });
  };

  return (
    <div className={styles.filtersHeader}>
      <Card className={styles.filtersCard}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>期間設定</div>
              <RangePicker
                value={[
                  params.startDate ? dayjs(params.startDate) : null,
                  params.endDate ? dayjs(params.endDate) : null,
                ]}
                onChange={handleDateRangeChange}
                format="YYYY-MM-DD"
                placeholder={['開始日', '終了日']}
                style={{ width: '100%' }}
              />
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={4}>
            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>集計粒度</div>
              <Select
                value={params.granularity}
                onChange={handleGranularityChange}
                style={{ width: '100%' }}
                options={[
                  { value: 'daily', label: '日別' },
                  { value: 'weekly', label: '週別' },
                  { value: 'monthly', label: '月別' },
                ]}
              />
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={4}>
            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>日付基準</div>
              <Select
                value={params.dateField}
                onChange={handleDateFieldChange}
                style={{ width: '100%' }}
                options={[
                  { value: 'mergedAt', label: 'マージ日' },
                  { value: 'createdAt', label: '作成日' },
                ]}
              />
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>&nbsp;</div>
              <Space className={styles.actionButtons}>
                <Button onClick={onResetFilters}>リセット</Button>
                <Button type="primary" onClick={onApplyFilters}>
                  フィルター適用
                </Button>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};