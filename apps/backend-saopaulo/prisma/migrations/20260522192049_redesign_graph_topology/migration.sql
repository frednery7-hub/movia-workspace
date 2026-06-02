/*
  Warnings:

  - You are about to drop the column `lat` on the `stations` table. All the data in the column will be lost.
  - You are about to drop the column `lineId` on the `stations` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `stations` table. All the data in the column will be lost.
  - Added the required column `latitude` to the `stations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `stations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shortCode` to the `stations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "stations" DROP CONSTRAINT "stations_lineId_fkey";

-- AlterTable
ALTER TABLE "stations" DROP COLUMN "lat",
DROP COLUMN "lineId",
DROP COLUMN "lng",
ADD COLUMN     "isAccessible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "shortCode" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "track_segments" (
    "id" TEXT NOT NULL,
    "fromStationId" TEXT NOT NULL,
    "toStationId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "averageDurationSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "fromStationId" TEXT NOT NULL,
    "toStationId" TEXT NOT NULL,
    "walkingSeconds" INTEGER NOT NULL DEFAULT 120,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "track_segments" ADD CONSTRAINT "track_segments_fromStationId_fkey" FOREIGN KEY ("fromStationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_segments" ADD CONSTRAINT "track_segments_toStationId_fkey" FOREIGN KEY ("toStationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_fromStationId_fkey" FOREIGN KEY ("fromStationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_toStationId_fkey" FOREIGN KEY ("toStationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
