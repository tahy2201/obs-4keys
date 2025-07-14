import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AntdProvider } from '@/components/AntdProvider';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <AntdProvider>
          {children}
        </AntdProvider>
      </body>
    </html>
  );
}
