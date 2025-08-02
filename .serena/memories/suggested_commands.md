# 推奨コマンド 💫

## 開発
```bash
bun install                    # 依存関係インストール
bun dev                       # 開発サーバー起動（turbo付き）
bun run build                 # プロダクションビルド
bun start                     # プロダクションサーバー起動
bun run lint                  # Next.js リント実行
```

## データベース
```bash
bunx prisma migrate dev       # マイグレーション実行
bunx prisma generate          # Prisma クライアント生成
```

## データ同期スクリプト
```bash
bun run build:scripts         # TypeScript スクリプトビルド
bun run run:sync              # GitHub データ同期
bun run run:categorize        # AI レビューコメント分類
bun run run:update-pr-sizes   # PR サイズデータ更新
```

## システムコマンド (Darwin)
- `git` - Git操作
- `ls` - ファイル一覧
- `cd` - ディレクトリ移動
- `grep` - テキスト検索
- `find` - ファイル検索

## テスト・品質
- **フォーマット**: Biome 自動フォーマット
- **リント**: `bun run lint`
- **テスト**: Playwright (設定済み)