'use client';

import { useState } from 'react';
import { Card, Button, DatePicker, Select, Input, Row, Col, Divider, Collapse } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import { BaseMetricsParams, MetricType, METRIC_DISPLAY_INFO } from '@/types/metrics';

// useStyles でスタイルを定義
const useStyles = createStyles(({ token }) => ({
  filterCard: {
    marginBottom: token.marginLG,
    
    '& .ant-card-body': {
      padding: token.paddingLG,
    },
  },
  
  cardTitle: {
    fontSize: token.fontSizeLG,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextHeading,
    marginBottom: token.marginMD,
  },
  
  sectionTitle: {
    fontSize: token.fontSize,
    fontWeight: token.fontWeightStrong,
    color: token.colorTextHeading,
    marginBottom: token.marginSM,
    display: 'block',
  },
  
  metricButton: {
    height: 'auto',
    padding: token.paddingSM,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
    
    '&:hover': {
      borderColor: token.colorPrimaryHover,
    },
    
    '&.selected': {
      borderColor: token.colorPrimary,
      backgroundColor: token.colorPrimaryBg,
      color: token.colorPrimary,
    },
  },
  
  metricButtonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: token.marginXS,
    marginBottom: token.marginXXS,
  },
  
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: '50%',
  },
  
  metricTitle: {
    fontWeight: token.fontWeightStrong,
    margin: 0,
  },
  
  metricDescription: {
    fontSize: token.fontSizeSM,
    color: token.colorTextSecondary,
    margin: 0,
  },
  
  buttonGroup: {
    display: 'flex',
    gap: token.marginSM,
    marginTop: token.marginMD,
  },
  
  advancedToggle: {
    color: token.colorPrimary,
    cursor: 'pointer',
    fontSize: token.fontSizeSM,
    
    '&:hover': {
      color: token.colorPrimaryHover,
    },
  },
}));

interface MetricsFiltersProps {
  params: BaseMetricsParams;
  onParamsChange: (newParams: BaseMetricsParams) => void;
  selectedMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  loading?: boolean;
}

export function MetricsFilters({ 
  params, 
  onParamsChange, 
  selectedMetric, 
  onMetricChange, 
  loading = false 
}: MetricsFiltersProps) {
  const { styles } = useStyles();
  const [localParams, setLocalParams] = useState<BaseMetricsParams>(params);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (field: keyof BaseMetricsParams, value: string) => {
    const newParams = { ...localParams, [field]: value || undefined };
    setLocalParams(newParams);
  };

  const handleDateChange = (field: 'startDate' | 'endDate', date: dayjs.Dayjs | null) => {
    const newParams = { ...localParams, [field]: date ? date.format('YYYY-MM-DD') : undefined };
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

  const currentMetricInfo = METRIC_DISPLAY_INFO[selectedMetric];

  return (
    <Card className={styles.filterCard}>
      <h3 className={styles.cardTitle}>メトリクス・フィルター設定</h3>
      
      {/* メトリクス選択 */}
      <div style={{ marginBottom: 24 }}>
        <label className={styles.sectionTitle}>
          表示メトリクス
        </label>
        <Row gutter={[12, 12]}>
          {Object.values(MetricType).map((metric) => {
            const info = METRIC_DISPLAY_INFO[metric];
            const isSelected = selectedMetric === metric;
            return (
              <Col key={metric} xs={24} md={12}>
                <Button
                  className={`${styles.metricButton} ${isSelected ? 'selected' : ''}`}
                  onClick={() => onMetricChange(metric)}
                  disabled={loading}
                  block
                >
                  <div className={styles.metricButtonContent}>
                    <div 
                      className={styles.colorIndicator}
                      style={{ backgroundColor: info.color }}
                    />
                    <span className={styles.metricTitle}>{info.title}</span>
                  </div>
                  <p className={styles.metricDescription}>{info.description}</p>
                </Button>
              </Col>
            );
          })}
        </Row>
      </div>

      {/* 基本フィルター */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <label className={styles.sectionTitle}>開始日</label>
          <DatePicker
            value={localParams.startDate ? dayjs(localParams.startDate) : null}
            onChange={(date) => handleDateChange('startDate', date)}
            style={{ width: '100%' }}
            placeholder="開始日を選択"
          />
        </Col>

        <Col xs={24} md={8}>
          <label className={styles.sectionTitle}>終了日</label>
          <DatePicker
            value={localParams.endDate ? dayjs(localParams.endDate) : null}
            onChange={(date) => handleDateChange('endDate', date)}
            style={{ width: '100%' }}
            placeholder="終了日を選択"
          />
        </Col>
        
        <Col xs={24} md={8}>
          <label className={styles.sectionTitle}>集計粒度</label>
          <Select
            value={localParams.granularity || 'daily'}
            onChange={(value) => handleInputChange('granularity', value)}
            style={{ width: '100%' }}
            options={[
              { value: 'daily', label: '日別' },
              { value: 'weekly', label: '週別' },
              { value: 'monthly', label: '月別' }
            ]}
          />
        </Col>
      </Row>

      {/* 詳細フィルター */}
      <Collapse
        ghost
        items={[
          {
            key: 'advanced',
            label: (
              <span className={styles.advancedToggle}>
                詳細設定 {showAdvanced ? <UpOutlined /> : <DownOutlined />}
              </span>
            ),
            children: (
              <Row gutter={[16, 16]} style={{ paddingTop: 16 }}>
                <Col xs={24} md={8}>
                  <label className={styles.sectionTitle}>日付フィールド</label>
                  <Select
                    value={localParams.dateField || 'mergedAt'}
                    onChange={(value) => handleInputChange('dateField', value)}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'mergedAt', label: 'マージ日' },
                      { value: 'createdAt', label: '作成日' }
                    ]}
                  />
                </Col>

                <Col xs={24} md={8}>
                  <label className={styles.sectionTitle}>リポジトリオーナー</label>
                  <Input
                    value={localParams.repoOwner || ''}
                    onChange={(e) => handleInputChange('repoOwner', e.target.value)}
                    placeholder="hyuga-git"
                  />
                </Col>

                <Col xs={24} md={8}>
                  <label className={styles.sectionTitle}>リポジトリ名</label>
                  <Input
                    value={localParams.repoName || ''}
                    onChange={(e) => handleInputChange('repoName', e.target.value)}
                    placeholder="obs-4keys"
                  />
                </Col>
              </Row>
            )
          }
        ]}
        onChange={(keys) => setShowAdvanced(keys.includes('advanced'))}
      />

      {/* ボタン */}
      <div className={styles.buttonGroup}>
        <Button
          type="primary"
          onClick={handleApplyFilters}
          loading={loading}
        >
          {loading ? '更新中...' : 'フィルター適用'}
        </Button>
        
        <Button
          onClick={handleReset}
          disabled={loading}
        >
          リセット
        </Button>
      </div>
    </Card>
  );
}
