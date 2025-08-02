# obs-4keys プロジェクト概要 💎

## プロジェクトの目的
4 Keys DevOps メトリクスダッシュボード。GitHubリポジトリのデータを分析し、ソフトウェア配信パフォーマンスの主要メトリクス（変更のリードタイム、PR スループット）に関するインサイトを提供する。

## 技術スタック
- **フロントエンド**: Next.js 14, TypeScript, React 18
- **UI ライブラリ**: Ant Design, antd-style, TailwindCSS  
- **チャート**: Chart.js, Recharts
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL + Prisma ORM
- **外部API**: GitHub API (Octokit), Gemini API
- **ランタイム**: Bun
- **コード品質**: Biome (フォーマット・リント)
- **テスト**: Playwright

## 主要機能
- 4 Keys メトリクス（変更のリードタイム、PR スループット、PR サイズ分析）
- GitHub API との包括的な統合
- 時系列分析と可視化
- AI によるレビューコメント分類