/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `ProjectLocation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ProjectLocation_projectId_key";

-- AlterTable
ALTER TABLE "ProjectLocation" DROP COLUMN "updatedAt";

-- CreateIndex
CREATE INDEX "ProjectLocation_projectId_idx" ON "ProjectLocation"("projectId");
