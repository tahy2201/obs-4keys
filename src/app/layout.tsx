import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "4 Keys メトリクス ダッシュボード",
  description: "DevOps 4 Keys メトリクス分析ダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StyleProvider hashPriority="high">
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#1677ff',
                borderRadius: 8,
                fontFamily: 'var(--font-geist-sans)',
              },
            }}
          >
            {children}
          </ConfigProvider>
        </StyleProvider>
      </body>
    </html>
  );
}
