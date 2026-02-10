/*
  Warnings:

  - You are about to drop the column `km` on the `ProjectLocation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProjectLocation" DROP COLUMN "km",
ADD COLUMN     "meter" DOUBLE PRECISION;
