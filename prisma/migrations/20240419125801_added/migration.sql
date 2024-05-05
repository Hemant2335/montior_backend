/*
  Warnings:

  - Added the required column `ChatId` to the `Messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Messages" ADD COLUMN     "ChatId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_ChatId_fkey" FOREIGN KEY ("ChatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
