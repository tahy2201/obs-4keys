# レビューコメント分析プロンプト

## 概要
このプロンプトは、4 Keys DevOpsメトリクスプロジェクトにおけるレビューコメントデータを分析し、指摘パターンや改善点を明らかにするためのものです。

## 前提条件
- PostgreSQL データベースに以下のテーブルが存在すること:
  - `review_comments` (レビューコメント)
  - `pull_requests` (プルリクエスト)
  - `users` (ユーザー)
- GitHub API同期スクリプトが正常に実行されていること
- AIによるコメント分類（category）が実施されていること

## 実行手順

### 1. データ整合性チェック
```sql
-- PRの作成者情報の確認
SELECT 
    COUNT(*) as total_prs,
    COUNT(author_github_id) as prs_with_author,
    COUNT(*) - COUNT(author_github_id) as prs_without_author
FROM pull_requests;
```

**期待値**: `prs_without_author` が 0 であること

**問題がある場合**: `scripts/fix-author-ids.ts` を実行してauthor情報を修復

### 2. 全体分析の実行

#### 基本統計
```sql
-- 総コメント数とタイプ別分布
SELECT 
    comment_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM review_comments), 2) as percentage
FROM review_comments 
GROUP BY comment_type;
```

#### カテゴリ別分析
```sql
-- AI分類によるカテゴリ別統計
SELECT 
    category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM review_comments WHERE category IS NOT NULL), 2) as percentage,
    AVG(LENGTH(body)) as avg_length
FROM review_comments 
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC;
```

#### 技術的債務の確認
```sql
-- TODO/FIXME関連コメントの分布
SELECT 
    category,
    COUNT(*) as count
FROM review_comments 
WHERE (body LIKE '%TODO%' OR body LIKE '%FIXME%' OR body LIKE '%XXX%')
AND category IS NOT NULL
GROUP BY category
ORDER BY count DESC;
```

### 3. 個人別分析の実行

#### 対象ユーザーの確認
```sql
-- PR作成者の一覧取得
SELECT DISTINCT u.login, COUNT(pr.id) as pr_count
FROM users u 
JOIN pull_requests pr ON pr.author_github_id = u.github_id 
GROUP BY u.login
ORDER BY pr_count DESC;
```

#### 特定ユーザーの分析（{USERNAME}を実際のユーザー名に置換）
```sql
-- 個人別カテゴリ分析
SELECT 
    rc.category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM review_comments rc
JOIN pull_requests pr ON pr.id = rc.pull_request_id
JOIN users u ON u.github_id = pr.author_github_id
WHERE u.login = '{USERNAME}'
AND rc.category IS NOT NULL
GROUP BY rc.category
ORDER BY count DESC;

-- 個人別総コメント数
SELECT 
    COUNT(*) as total_comments_on_user_prs,
    COUNT(CASE WHEN rc.category IS NOT NULL THEN 1 END) as categorized_comments
FROM review_comments rc
JOIN pull_requests pr ON pr.id = rc.pull_request_id
JOIN users u ON u.github_id = pr.author_github_id
WHERE u.login = '{USERNAME}';

-- 最新のPR一覧
SELECT 
    pr.number,
    pr.title,
    pr.created_at
FROM pull_requests pr
JOIN users u ON u.github_id = pr.author_github_id
WHERE u.login = '{USERNAME}'
ORDER BY pr.created_at DESC
LIMIT 10;
```

### 4. レポート生成

#### 全体レポートの作成
以下の項目を含むMarkdownファイルを生成:
- 📊 概要統計
- 📈 指摘カテゴリ別分析（トップ10）
- 💡 主な指摘パターン
- 🚨 技術的債務の指標
- 📝 コメント文字数による特徴
- 🎯 改善提案

#### 個人別レポートの作成
以下の項目を含むMarkdownファイルを生成:
- 📊 個人の基本統計
- 📈 指摘カテゴリ別分析
- 💡 全体平均との比較
- ✨ 強みと改善ポイント
- 🚀 具体的な改善提案
- 📊 総合評価

## 出力ファイル

### ファイル命名規則
- 全体分析: `review_comments_analysis.md`
- 個人分析: `{username}_review_analysis.md`

### 推奨保存場所
プロジェクトルート直下

## トラブルシューティング

### よくある問題と対処法

#### 1. `author_github_id` が NULL の場合
**症状**: 個人別分析で結果が0件になる
**対処**: `scripts/fix-author-ids.ts` を実行

#### 2. カテゴリが未分類の場合
**症状**: `category` が NULL のコメントが多い
**対処**: AI分類スクリプト `bun run run:categorize` を実行

#### 3. GitHub API Rate Limit エラー
**症状**: 修復スクリプト実行時にエラー
**対処**: 待機時間を延長（100ms → 200ms）

#### 4. データが古い場合
**対処**: GitHub同期スクリプト `bun run run:sync` を実行

## 使用例

```bash
# 1. データ同期
bun run run:sync

# 2. カテゴリ分類（必要に応じて）
bun run run:categorize

# 3. author情報修復（必要に応じて）
bun run build:scripts && node scripts/dist/fix-author-ids.js

# 4. 分析実行（このプロンプトを使用してClaude Codeに依頼）
```

## 更新履歴
- 2025-08-02: 初版作成
- 対象データ: review_comments, pull_requests, users テーブル
- 分析対象: 4,872件のレビューコメント（初回時点）

---

**使用方法**: このプロンプトファイルの内容をClaude Codeに渡して、「このプロンプトに従ってレビューコメント分析を実行してください」と依頼する。