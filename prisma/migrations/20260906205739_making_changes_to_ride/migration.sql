/*
  Warnings:

  - Added the required column `dropOffAddress` to the `Ride` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickupAddress` to the `Ride` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "dropOffAddress" TEXT NOT NULL,
ADD COLUMN     "estimatedDurationMin" INTEGER,
ADD COLUMN     "estimatedPrice" INTEGER,
ADD COLUMN     "finalPrice" INTEGER,
ADD COLUMN     "pickupAddress" TEXT NOT NULL,
ADD COLUMN     "startedAt" TIMESTAMP(3);
