/*
  Warnings:

  - Made the column `last_sync` on table `repositories` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "repositories" ALTER COLUMN "last_sync" SET NOT NULL;
