# コードスタイル・規約 ✨

## Biome 設定
- **行幅**: 120文字
- **インデント**: スペース
- **クォート**: ダブルクォート
- **セミコロン**: 必要時のみ (asNeeded)
- **import 整理**: 有効

## TypeScript 設定
- **target**: ES2017
- **厳密モード**: 有効
- **JSX**: preserve
- **パスエイリアス**: `@/*` → `./src/*`

## プロジェクト構成
```
src/
├── app/           # Next.js App Router
├── components/    # UIコンポーネント
├── hooks/         # カスタムフック  
├── lib/           # ユーティリティ
├── types/         # 型定義
└── config/        # 設定ファイル

scripts/           # データ同期スクリプト
prisma/           # データベーススキーマ
```

## ネーミング規約
- **ファイル**: kebab-case
- **コンポーネント**: PascalCase
- **フック**: useXxx
- **型**: PascalCase