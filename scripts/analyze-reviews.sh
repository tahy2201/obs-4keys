#!/bin/bash

# レビューコメント分析スクリプト
# 
# 【概要】
# このスクリプトはユーザビリティ向上のためのオプショナルツールです。
# 分析自体は prompts/review-comment-analysis.md を直接Claude Codeに渡すだけでも実行可能。
# 
# 【役割】
# - データ整合性の自動チェック（author情報欠損等）
# - 同期状況確認と更新提案
# - Claude Code用プロンプトの生成・表示
#
# 使用方法: ./scripts/analyze-reviews.sh [username]

set -e

echo "🔍 レビューコメント分析スクリプト開始"
echo "======================================"

# 引数チェック
if [ $# -eq 0 ]; then
    echo "📊 全体分析モードで実行します"
    ANALYSIS_MODE="全体"
    USERNAME=""
elif [ $# -eq 1 ]; then
    echo "👤 個人分析モード: $1"
    ANALYSIS_MODE="個人"
    USERNAME="$1"
else
    echo "❌ エラー: 引数が多すぎます"
    echo "使用方法: $0 [username]"
    exit 1
fi

echo ""

# データ整合性チェック
echo "🔧 データ整合性をチェック中..."
AUTHOR_CHECK=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) - COUNT(author_github_id) FROM pull_requests;" | tr -d ' ')

if [ "$AUTHOR_CHECK" -gt 0 ]; then
    echo "⚠️  警告: ${AUTHOR_CHECK}件のPRでauthor情報が欠損しています"
    read -p "修復スクリプトを実行しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔧 author情報を修復中..."
        bun run build:scripts
        node scripts/dist/fix-author-ids.js
        echo "✅ 修復完了"
    else
        echo "⚠️  修復をスキップしました。分析結果が不完全になる可能性があります。"
    fi
else
    echo "✅ データ整合性OK"
fi

echo ""

# 最新データ同期の確認
echo "📅 最終同期日時を確認中..."
LAST_SYNC=$(psql $DATABASE_URL -t -c "SELECT last_sync FROM repositories ORDER BY last_sync DESC LIMIT 1;" | tr -d ' ')
echo "最終同期: $LAST_SYNC"

read -p "最新データで同期しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 GitHub データを同期中..."
    bun run run:sync
    echo "✅ 同期完了"
fi

echo ""

# Claude Code実行用プロンプト生成
echo "📝 Claude Code用プロンプトを生成中..."

if [ "$ANALYSIS_MODE" = "全体" ]; then
    PROMPT_FILE="prompts/review-comment-analysis.md"
    INSTRUCTION="このプロンプトに従って、全体のレビューコメント分析を実行してください。分析結果は review_comments_analysis.md に出力してください。"
else
    PROMPT_FILE="prompts/review-comment-analysis.md"
    INSTRUCTION="このプロンプトに従って、ユーザー「${USERNAME}」の個人別レビューコメント分析を実行してください。SQLクエリの{USERNAME}部分を「${USERNAME}」に置換して実行し、分析結果は ${USERNAME}_review_analysis.md に出力してください。"
fi

echo ""
echo "🤖 Claude Code用指示"
echo "===================="
echo "以下の指示をClaude Codeに渡してください："
echo ""
echo "---"
cat "$PROMPT_FILE"
echo ""
echo "$INSTRUCTION"
echo "---"

echo ""
echo "✅ 分析準備完了！"
echo "上記の内容をClaude Codeにコピー&ペーストして分析を実行してください。"