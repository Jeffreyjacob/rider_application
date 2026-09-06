/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Ride` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Ride` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Ride" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";
