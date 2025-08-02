# データベース設計 🗄️

## メインモデル
- **User**: GitHub ユーザー情報
- **Repository**: リポジトリ情報  
- **PullRequest**: プルリクエスト（リードタイム計算の核）
- **Review**: PR レビュー
- **ReviewComment**: レビューコメント（AI分類対象）
- **Deployment**: デプロイメント記録
- **Issue**: イシュー

## 重要な enum
- **PullRequestState**: OPEN, CLOSED, MERGED
- **ReviewState**: APPROVED, COMMENTED, CHANGES_REQUESTED, DISMISSED, PENDING
- **ReviewCommentType**: REVIEW_COMMENT, ISSUE_COMMENT
- **DeploymentStatus**: SUCCESS, FAILURE, IN_PROGRESS, CANCELLED, QUEUED

## データフロー
1. GitHub API → sync-github-data.ts → データベース
2. AI 分類 → categorize-review-comments.ts → ReviewComment 更新
3. API Routes → Prisma → フロントエンド

## メトリクス計算
- **リードタイム**: PR作成〜マージまでの時間（秒）
- **PR スループット**: 期間内のPR数（日/週/月単位）
- **PR サイズ**: 追加行/削除行/合計行数