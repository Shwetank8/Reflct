/*
  Warnings:

  - You are about to drop the column `moodImageurl` on the `Entry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Entry" DROP COLUMN "moodImageurl",
ADD COLUMN     "moodImageUrl" TEXT;
