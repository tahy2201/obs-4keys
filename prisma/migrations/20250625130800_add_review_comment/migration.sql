-- CreateEnum
CREATE TYPE "ReviewCommentType" AS ENUM ('REVIEW_COMMENT', 'ISSUE_COMMENT');

-- CreateTable
CREATE TABLE "review_comments" (
    "id" SERIAL NOT NULL,
    "github_id" BIGINT NOT NULL,
    "pull_request_id" INTEGER NOT NULL,
    "user_github_id" INTEGER,
    "review_id" INTEGER,
    "body" TEXT NOT NULL,
    "file_path" TEXT,
    "line_number" INTEGER,
    "comment_type" "ReviewCommentType" NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "local_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "local_updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_comments_github_id_key" ON "review_comments"("github_id");

-- CreateIndex
CREATE INDEX "idx_review_comments_pull_request_id" ON "review_comments"("pull_request_id");

-- CreateIndex
CREATE INDEX "idx_review_comments_review_id" ON "review_comments"("review_id");

-- CreateIndex
CREATE INDEX "idx_review_comments_user_github_id" ON "review_comments"("user_github_id");

-- CreateIndex
CREATE INDEX "idx_review_comments_created_at" ON "review_comments"("created_at");

-- CreateIndex
CREATE INDEX "idx_review_comments_category" ON "review_comments"("category");

-- CreateIndex
CREATE INDEX "idx_review_comments_comment_type" ON "review_comments"("comment_type");

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_pull_request_id_fkey" FOREIGN KEY ("pull_request_id") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_user_github_id_fkey" FOREIGN KEY ("user_github_id") REFERENCES "users"("github_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
