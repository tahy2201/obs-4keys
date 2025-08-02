'use client';

import React from 'react';
import { Card, Row, Col, DatePicker, Select, Button } from 'antd';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import { BaseMetricsParams } from '@/types/metrics';

const { RangePicker } = DatePicker;

interface GlobalFiltersProps {
  params: BaseMetricsParams;
  onParamsChange: (newParams: BaseMetricsParams) => void;
  onResetFilters: () => void;
}

// 相対期間のオプション
const RELATIVE_PERIODS = [
  { label: 'カスタム期間', value: 'custom' },
  { label: '直近1週間', value: '1week' },
  { label: '直近1ヶ月', value: '1month' },
  { label: '直近3ヶ月', value: '3months' },
  { label: '直近6ヶ月', value: '6months' },
  { label: '直近1年', value: '1year' },
];

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
  resetButton: css`
    display: flex;
    justify-content: flex-end;
  `,
}));

export const GlobalFilters: React.FC<GlobalFiltersProps> = ({
  params,
  onParamsChange,
  onResetFilters,
}) => {
  const { styles } = useStyles();

  // 相対期間の判定
  const getRelativePeriod = () => {
    if (!params.startDate || !params.endDate) return 'custom';
    
    const now = dayjs();
    const start = dayjs(params.startDate);
    const end = dayjs(params.endDate);
    
    // 終了日が今日で、開始日が特定の期間前の場合
    if (end.isSame(now, 'day')) {
      const diffDays = now.diff(start, 'days');
      if (diffDays === 7) return '1week';
      if (diffDays >= 29 && diffDays <= 31) return '1month';
      if (diffDays >= 89 && diffDays <= 92) return '3months';
      if (diffDays >= 179 && diffDays <= 183) return '6months';
      if (diffDays >= 364 && diffDays <= 366) return '1year';
    }
    
    return 'custom';
  };

  const handleRelativePeriodChange = (value: string) => {
    if (value === 'custom') return;
    
    const now = dayjs();
    let startDate: string;
    
    switch (value) {
      case '1week':
        startDate = now.subtract(1, 'week').format('YYYY-MM-DD');
        break;
      case '1month':
        startDate = now.subtract(1, 'month').format('YYYY-MM-DD');
        break;
      case '3months':
        startDate = now.subtract(3, 'months').format('YYYY-MM-DD');
        break;
      case '6months':
        startDate = now.subtract(6, 'months').format('YYYY-MM-DD');
        break;
      case '1year':
        startDate = now.subtract(1, 'year').format('YYYY-MM-DD');
        break;
      default:
        return;
    }
    
    onParamsChange({
      ...params,
      startDate,
      endDate: now.format('YYYY-MM-DD'),
    });
  };

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

  const relativePeriod = getRelativePeriod();

  return (
    <div className={styles.filtersHeader}>
      <Card className={styles.filtersCard}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={5}>
            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>期間選択</div>
              <Select
                value={relativePeriod}
                onChange={handleRelativePeriodChange}
                style={{ width: '100%' }}
                options={RELATIVE_PERIODS}
              />
            </div>
          </Col>
          
          <Col xs={24} sm={16} md={7}>
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
                disabled={relativePeriod !== 'custom'}
              />
            </div>
          </Col>
          
          <Col xs={12} sm={8} md={4}>
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
          
          <Col xs={12} sm={8} md={4}>
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
          
          <Col xs={24} sm={8} md={4}>
            <div className={styles.filterItem}>
              <div className={styles.filterLabel}>&nbsp;</div>
              <div className={styles.resetButton}>
                <Button onClick={onResetFilters}>リセット</Button>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};