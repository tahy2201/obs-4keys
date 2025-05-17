-- CreateEnum
CREATE TYPE "PullRequestState" AS ENUM ('OPEN', 'CLOSED', 'MERGED');

-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('APPROVED', 'COMMENTED', 'CHANGES_REQUESTED', 'DISMISSED', 'PENDING');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('SUCCESS', 'FAILURE', 'IN_PROGRESS', 'CANCELLED', 'QUEUED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "github_id" INTEGER NOT NULL,
    "login" TEXT NOT NULL,
    "avatar_url" TEXT,
    "html_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" SERIAL NOT NULL,
    "github_id" BIGINT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "html_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_requests" (
    "id" SERIAL NOT NULL,
    "github_id" BIGINT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "state" "PullRequestState" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "merged_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "url" TEXT NOT NULL,
    "base_ref_name" TEXT,
    "head_ref_name" TEXT,
    "author_github_id" INTEGER,
    "repository_id" INTEGER NOT NULL,
    "lead_time_in_seconds" INTEGER,

    CONSTRAINT "pull_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labels" (
    "id" SERIAL NOT NULL,
    "github_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "github_id" BIGINT NOT NULL,
    "pull_request_id" INTEGER NOT NULL,
    "user_github_id" INTEGER,
    "state" "ReviewState" NOT NULL,
    "body" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" SERIAL NOT NULL,
    "sha" TEXT,
    "ref" TEXT,
    "environment" TEXT NOT NULL,
    "deployed_at" TIMESTAMP(3) NOT NULL,
    "status" "DeploymentStatus" NOT NULL,
    "duration_seconds" INTEGER,
    "repository_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" SERIAL NOT NULL,
    "github_id" BIGINT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "url" TEXT NOT NULL,
    "repository_id" INTEGER NOT NULL,
    "is_incident" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_request_labels" (
    "pull_request_id" INTEGER NOT NULL,
    "label_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pull_request_labels_pkey" PRIMARY KEY ("pull_request_id","label_id")
);

-- CreateTable
CREATE TABLE "pull_request_assignees" (
    "pull_request_id" INTEGER NOT NULL,
    "user_github_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pull_request_assignees_pkey" PRIMARY KEY ("pull_request_id","user_github_id")
);

-- CreateTable
CREATE TABLE "pull_request_requested_reviewers" (
    "pull_request_id" INTEGER NOT NULL,
    "user_github_id" INTEGER NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pull_request_requested_reviewers_pkey" PRIMARY KEY ("pull_request_id","user_github_id")
);

-- CreateTable
CREATE TABLE "issue_labels" (
    "issue_id" INTEGER NOT NULL,
    "label_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_labels_pkey" PRIMARY KEY ("issue_id","label_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_github_id_key" ON "repositories"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_owner_name_key" ON "repositories"("owner", "name");

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_github_id_key" ON "pull_requests"("github_id");

-- CreateIndex
CREATE INDEX "idx_pull_requests_merged_at" ON "pull_requests"("merged_at");

-- CreateIndex
CREATE INDEX "idx_pull_requests_created_at" ON "pull_requests"("created_at");

-- CreateIndex
CREATE INDEX "idx_pull_requests_repository_id" ON "pull_requests"("repository_id");

-- CreateIndex
CREATE INDEX "idx_pull_requests_author_github_id" ON "pull_requests"("author_github_id");

-- CreateIndex
CREATE INDEX "idx_pull_requests_github_id" ON "pull_requests"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_pull_requests_repository_id_number" ON "pull_requests"("repository_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "labels_github_id_key" ON "labels"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_labels_name" ON "labels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_github_id_key" ON "reviews"("github_id");

-- CreateIndex
CREATE INDEX "idx_reviews_pull_request_id" ON "reviews"("pull_request_id");

-- CreateIndex
CREATE INDEX "idx_reviews_user_github_id" ON "reviews"("user_github_id");

-- CreateIndex
CREATE INDEX "idx_deployments_deployed_at" ON "deployments"("deployed_at");

-- CreateIndex
CREATE INDEX "idx_deployments_repository_id" ON "deployments"("repository_id");

-- CreateIndex
CREATE INDEX "idx_deployments_environment" ON "deployments"("environment");

-- CreateIndex
CREATE UNIQUE INDEX "issues_github_id_key" ON "issues"("github_id");

-- CreateIndex
CREATE INDEX "idx_issues_created_at" ON "issues"("created_at");

-- CreateIndex
CREATE INDEX "idx_issues_closed_at" ON "issues"("closed_at");

-- CreateIndex
CREATE INDEX "idx_issues_repository_id" ON "issues"("repository_id");

-- CreateIndex
CREATE INDEX "idx_issues_github_id" ON "issues"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_issues_repository_id_number" ON "issues"("repository_id", "number");

-- CreateIndex
CREATE INDEX "idx_pull_request_labels_label_id" ON "pull_request_labels"("label_id");

-- CreateIndex
CREATE INDEX "idx_pull_request_assignees_user_github_id" ON "pull_request_assignees"("user_github_id");

-- CreateIndex
CREATE INDEX "idx_pull_request_requested_reviewers_user_github_id" ON "pull_request_requested_reviewers"("user_github_id");

-- CreateIndex
CREATE INDEX "idx_issue_labels_label_id" ON "issue_labels"("label_id");

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_author_github_id_fkey" FOREIGN KEY ("author_github_id") REFERENCES "users"("github_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_pull_request_id_fkey" FOREIGN KEY ("pull_request_id") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_github_id_fkey" FOREIGN KEY ("user_github_id") REFERENCES "users"("github_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_request_labels" ADD CONSTRAINT "pull_request_labels_pull_request_id_fkey" FOREIGN KEY ("pull_request_id") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_request_labels" ADD CONSTRAINT "pull_request_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_request_assignees" ADD CONSTRAINT "pull_request_assignees_pull_request_id_fkey" FOREIGN KEY ("pull_request_id") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_request_assignees" ADD CONSTRAINT "pull_request_assignees_user_github_id_fkey" FOREIGN KEY ("user_github_id") REFERENCES "users"("github_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_request_requested_reviewers" ADD CONSTRAINT "pull_request_requested_reviewers_pull_request_id_fkey" FOREIGN KEY ("pull_request_id") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_request_requested_reviewers" ADD CONSTRAINT "pull_request_requested_reviewers_user_github_id_fkey" FOREIGN KEY ("user_github_id") REFERENCES "users"("github_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
