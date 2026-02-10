/*
  Warnings:

  - You are about to drop the column `fileName` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `File` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[collectionId,order]` on the table `File` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `collectionId` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_projectId_fkey";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "fileName",
DROP COLUMN "projectId",
ADD COLUMN     "collectionId" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "order" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "VideoCollection" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "File_collectionId_order_key" ON "File"("collectionId", "order");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "VideoCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCollection" ADD CONSTRAINT "VideoCollection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
