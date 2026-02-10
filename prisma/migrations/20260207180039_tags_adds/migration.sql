/*
  Warnings:

  - You are about to drop the column `tags` on the `File` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "File" DROP COLUMN "tags",
ADD COLUMN     "tagIds" INTEGER[];

-- AlterTable
ALTER TABLE "VideoCollection" ADD COLUMN     "tagIds" INTEGER[];
