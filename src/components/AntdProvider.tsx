'use client';

import { ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';

interface AntdProviderProps {
  children: React.ReactNode;
}

export function AntdProvider({ children }: AntdProviderProps) {
  return (
    <StyleProvider hashPriority="high">
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 8,
            fontFamily: 'var(--font-geist-sans)',
            fontSize: 14,
            // 追加のテーマ設定
            colorBgContainer: '#ffffff',
            colorBorder: '#e5e7eb',
            colorText: '#374151',
            colorTextSecondary: '#6b7280',
            colorTextHeading: '#1f2937',
          },
          components: {
            // コンポーネント固有のテーマ設定
            Card: {
              borderRadius: 12,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
            },
            Button: {
              borderRadius: 8,
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </StyleProvider>
  );
}
