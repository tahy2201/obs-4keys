# レビューコメント分析ツール

## 📋 概要

このツールは、プロジェクトのレビューコメントを分析し、チームやメンバー個人の開発品質を可視化します。

## 🚀 クイックスタート

### 📋 2つの実行方法

#### 方法1: 自動化スクリプト使用（推奨）
```bash
# 全体分析
bun run analyze:reviews

# 個人分析
bun run analyze:reviews:user tahy2201
```
*データチェック・同期確認・プロンプト生成を自動化*

#### 方法2: 直接プロンプト使用
```bash
# prompts/review-comment-analysis.md の内容をClaude Codeに直接渡す
```
*シンプルに分析のみ実行したい場合*

## 📁 生成されるファイル

### 分析レポート
- `review_comments_analysis.md` - 全体分析レポート
- `{username}_review_analysis.md` - 個人別分析レポート

### プロンプトファイル
- `prompts/review-comment-analysis.md` - Claude Code用プロンプト

### スクリプト
- `scripts/analyze-reviews.sh` - 分析実行スクリプト
- `scripts/fix-author-ids.ts` - author情報修復スクリプト

## 🔧 事前準備

### 必要な環境変数
```env
DATABASE_URL=postgresql://...
GITHUB_API_TOKEN=ghp_...
DEFAULT_REPO_OWNER=your-org
DEFAULT_REPO_NAME=your-repo
```

### データ同期
```bash
# GitHub データの同期
bun run run:sync

# レビューコメントのAI分類
bun run run:categorize
```

## 📊 分析内容

### 全体分析
- 📈 指摘カテゴリ別統計（readability, logic, style, etc.）
- 🔍 コメントタイプ別分布（REVIEW_COMMENT vs ISSUE_COMMENT）
- 📝 技術的債務指標（TODO/FIXME関連）
- 💡 改善提案

### 個人分析
- 👤 個人の指摘傾向
- 📊 全体平均との比較
- ✨ 強みと改善ポイント
- 🎯 具体的な改善提案

## 🛠️ トラブルシューティング

### データが古い場合
```bash
bun run run:sync
```

### author情報が欠損している場合
```bash
bun run run:fix-authors
```

### カテゴリ分類が未実施の場合
```bash
bun run run:categorize
```

## 📈 分析指標の説明

### カテゴリ分類
| カテゴリ | 説明 | 例 |
|----------|------|-----|
| readability | 可読性 | 変数名、コメント、構造 |
| logic | ロジック | 条件分岐、エラーハンドリング |
| style | スタイル | フォーマット、命名規則 |
| architecture | アーキテクチャ | 設計、構造、DRY原則 |
| documentation | ドキュメント | README、API仕様 |
| performance | パフォーマンス | 処理速度、メモリ使用量 |
| security | セキュリティ | 脆弱性、認証 |
| testing | テスト | テストケース、カバレッジ |
| ci_automation | CI/自動化 | ビルド、デプロイ |
| other | その他 | 分類困難なもの |

### コメントタイプ
- **REVIEW_COMMENT**: 特定のファイル・行に対するコメント
- **ISSUE_COMMENT**: PR全体に対するコメント

## 🎯 活用方法

### チーム全体での活用
1. 定期的な全体分析でトレンド把握
2. 最も多い指摘カテゴリの改善取り組み
3. レビュー品質向上の施策検討

### 個人での活用
1. 自分の強みと改善点の把握
2. 他メンバーとの比較による学習
3. 成長の定量的測定

### マネジメントでの活用
1. チームメンバーの成長支援
2. 教育・研修計画の策定
3. コードレビュー文化の改善

## 📅 推奨実行頻度

- **全体分析**: 月1回
- **個人分析**: 四半期1回
- **データ同期**: 週1回

## 🔄 継続的な改善

1. 分析結果を基にした改善計画策定
2. 改善施策の効果測定
3. 新しい指摘パターンの発見と対応

---

*このツールは継続的な品質改善を支援するものです。分析結果を活用してより良い開発チームを築いていきましょう！*