import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.TZ = 'Asia/Tokyo';

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import logger from './lib/logging.js';

// Claude API設定
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const prisma = new PrismaClient();

// レビューコメントのカテゴリ
enum ReviewCommentCategory {
  STYLE = 'style',                 // コードスタイル、フォーマット
  LOGIC = 'logic',                 // ロジック、バグ
  PERFORMANCE = 'performance',     // パフォーマンス
  SECURITY = 'security',           // セキュリティ
  READABILITY = 'readability',     // 可読性、命名
  TESTING = 'testing',             // テスト関連
  DOCUMENTATION = 'documentation', // ドキュメント、コメント
  ARCHITECTURE = 'architecture',   // 設計、アーキテクチャ
  CI_AUTOMATION = 'ci_automation', // CI/CDツールの自動コメント
  OTHER = 'other'                  // その他
}

/**
 * Claude APIを使ってコメント内容からカテゴリを推定する（3回リトライ）
 */
async function categorizeCommentWithAI(body: string, filePath?: string): Promise<ReviewCommentCategory> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required but not found in environment variables');
  }

  // httpで始まるコメントはCI_AUTOMATIONに分類
  if (body.trim().toLowerCase().startsWith('http')) {
    logger.info('Comment starts with "http", categorizing as CI_AUTOMATION');
    return ReviewCommentCategory.CI_AUTOMATION;
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  // Anthropic Claude クライアントを初期化
  const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Categorizing comment (attempt ${attempt}/${maxRetries})...`);
      
      const prompt = `あなたはソフトウェア開発のコードレビューの専門家です。以下のレビューコメントを分析し、最も適切なカテゴリを1つ選択してください。

<categories>
- style: コードスタイル、フォーマット、インデント、命名規則
- logic: ロジック、バグ、条件分岐、アルゴリズム、エラーハンドリング
- performance: パフォーマンス、最適化、メモリ使用量、処理速度
- security: セキュリティ、認証、認可、バリデーション、脆弱性
- readability: 可読性、理解しやすさ、複雑さ、変数名、関数名
- testing: テスト、テストケース、モック、カバレッジ
- documentation: ドキュメント、コメント、説明、例
- architecture: 設計、アーキテクチャ、構造、パターン、依存関係
- ci_automation: CI/CDツールによる自動生成コメント
- other: その他
</categories>

<review_comment>
${body}
</review_comment>

${filePath ? `<file_path>${filePath}</file_path>` : ''}

JSON形式で回答してください:
{"category": "選択したカテゴリ"}`;

      const message = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });
      
      const content = message.content[0].type === 'text' ? message.content[0].text : '';

      if (!content) {
        throw new Error('No content in Gemini response');
      }

      logger.info(`Claude response: ${content}`);

      // JSON部分を抽出
      const jsonMatch = content.match(/\{[^}]*\}/);
      if (!jsonMatch) {
        throw new Error(`No JSON found in response: ${content}`);
      }

      let parsedResult;
      try {
        parsedResult = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON: ${jsonMatch[0]}`);
      }

      const category = parsedResult.category;
      
      // カテゴリが有効かチェック
      if (!Object.values(ReviewCommentCategory).includes(category)) {
        throw new Error(`Invalid category returned: ${category}`);
      }

      logger.info(`Successfully categorized as: ${category}`);
      return category as ReviewCommentCategory;

    } catch (error) {
      lastError = error as Error;
      logger.warn(`Attempt ${attempt} failed: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        // リトライ前に少し待機
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // 全ての試行が失敗した場合
  throw new Error(`Failed to categorize comment after ${maxRetries} attempts. Last error: ${lastError?.message}`);
}

/**
 * 未分類のレビューコメントを分類する
 */
async function categorizeReviewComments() {
  logger.info('Starting review comment categorization...');

  try {
    // 未分類のコメントを取得（テスト用に10件に制限、REVIEW_COMMENTのみ対象）
    const uncategorizedComments = await prisma.reviewComment.findMany({
      where: {
        category: null,
        commentType: 'REVIEW_COMMENT' // 行に対するレビューコメントのみ
      },
      select: {
        id: true,
        body: true,
        filePath: true,
        commentType: true
      },
      take: 200 // 最初は10件でテスト
    });

    logger.info(`Found ${uncategorizedComments.length} uncategorized REVIEW_COMMENT comments (testing with 10 comments).`);

    let categorizedCount = 0;
    const categoryStats: Record<string, number> = {};

    for (const comment of uncategorizedComments) {
      const category = await categorizeCommentWithAI(comment.body, comment.filePath || undefined);
      
      // カテゴリを更新
      await prisma.reviewComment.update({
        where: { id: comment.id },
        data: { category }
      });

      // 統計を更新
      categoryStats[category] = (categoryStats[category] || 0) + 1;
      categorizedCount++;

      if (categorizedCount % 5 === 0) {
        logger.info(`Categorized ${categorizedCount}/${uncategorizedComments.length} comments...`);
      }
      
      // API rate limitを考慮して必ず待機
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    }

    logger.info('Categorization completed!');
    logger.info('Category statistics:');
    for (const [category, count] of Object.entries(categoryStats)) {
      logger.info(`  ${category}: ${count} comments`);
    }

  } catch (error) {
    logger.error('Error during categorization:', error);
    throw error;
  }
}

/**
 * カテゴリ分類結果のサマリーを表示
 */
async function showCategorizationSummary() {
  logger.info('Review Comment Categorization Summary:');

  const categoryStats = await prisma.reviewComment.groupBy({
    by: ['category'],
    _count: {
      category: true
    },
    orderBy: {
      _count: {
        category: 'desc'
      }
    }
  });

  let totalComments = 0;
  for (const stat of categoryStats) {
    const category = stat.category || 'uncategorized';
    const count = stat._count.category;
    totalComments += count;
    logger.info(`  ${category}: ${count} comments`);
  }

  logger.info(`Total: ${totalComments} comments`);
}

async function main() {
  logger.info('Starting review comment categorization script...');

  try {
    await categorizeReviewComments();
    await showCategorizationSummary();
    
    logger.info('Review comment categorization completed successfully!');
  } catch (error) {
    logger.error('Error in categorization script:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected.');
  }
}

// スクリプト実行
main()
  .catch((e) => {
    logger.error('Unhandled error in categorization script:', e);
    process.exitCode = 1;
  });
