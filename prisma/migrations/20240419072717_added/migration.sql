/*
  Warnings:

  - Made the column `profile` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "profile" SET NOT NULL,
ALTER COLUMN "profile" SET DEFAULT 'https://res.cloudinary.com/dri5u2nqb/image/upload/v1713511395/zrtp9p7eote4ixokmwjx.jpg';
