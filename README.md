# obs-4keys

# 準備

マイグレーション

```sh
npx prisma migrate dev
```

# 実行

## web ui

```sh
npm run dev
```

## リポジトリのデータを取得するscript

**事前準備**

`.env.local`ファイルを作成し、必要な値に修正する

```sh
cp env.sample .env.local
```

**実行**

```sh
# GitHubデータの同期
npm run run:sync

# 既存PRのサイズ情報を更新（初回のみ実行推奨）
npm run run:update-pr-sizes

# レビューコメントのAI分類
npm run run:categorize
```
