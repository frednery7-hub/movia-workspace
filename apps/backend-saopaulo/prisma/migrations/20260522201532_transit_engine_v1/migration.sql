/*
  Warnings:

  - You are about to drop the column `isAccessible` on the `stations` table. All the data in the column will be lost.
  - You are about to drop the column `fromStationId` on the `track_segments` table. All the data in the column will be lost.
  - You are about to drop the column `toStationId` on the `track_segments` table. All the data in the column will be lost.
  - You are about to drop the `transfers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[fromPlatformId,toPlatformId,lineId,direction]` on the table `track_segments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fromPlatformId` to the `track_segments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toPlatformId` to the `track_segments` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `direction` on the `track_segments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('INBOUND', 'OUTBOUND', 'CIRCULAR');

-- DropForeignKey
ALTER TABLE "track_segments" DROP CONSTRAINT "track_segments_fromStationId_fkey";

-- DropForeignKey
ALTER TABLE "track_segments" DROP CONSTRAINT "track_segments_toStationId_fkey";

-- DropForeignKey
ALTER TABLE "transfers" DROP CONSTRAINT "transfers_fromStationId_fkey";

-- DropForeignKey
ALTER TABLE "transfers" DROP CONSTRAINT "transfers_toStationId_fkey";

-- AlterTable
ALTER TABLE "stations" DROP COLUMN "isAccessible",
ADD COLUMN     "hasElevator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasEscalator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isUnderground" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wheelchairAccessible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "track_segments" DROP COLUMN "fromStationId",
DROP COLUMN "toStationId",
ADD COLUMN     "fromPlatformId" TEXT NOT NULL,
ADD COLUMN     "toPlatformId" TEXT NOT NULL,
DROP COLUMN "direction",
ADD COLUMN     "direction" "Direction" NOT NULL;

-- DropTable
DROP TABLE "transfers";

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "platforms" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_time_profiles" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "startTimeSeconds" INTEGER NOT NULL,
    "endTimeSeconds" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segment_time_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_transfers" (
    "id" TEXT NOT NULL,
    "fromPlatformId" TEXT NOT NULL,
    "toPlatformId" TEXT NOT NULL,
    "walkingSeconds" INTEGER NOT NULL DEFAULT 180,
    "accessibilityFriendly" BOOLEAN NOT NULL DEFAULT true,
    "platformChange" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_entrances" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accessible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "station_entrances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platforms_stationId_idx" ON "platforms"("stationId");

-- CreateIndex
CREATE INDEX "platforms_lineId_idx" ON "platforms"("lineId");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_stationId_lineId_key" ON "platforms"("stationId", "lineId");

-- CreateIndex
CREATE INDEX "segment_time_profiles_segmentId_idx" ON "segment_time_profiles"("segmentId");

-- CreateIndex
CREATE INDEX "segment_time_profiles_serviceId_idx" ON "segment_time_profiles"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "segment_time_profiles_segmentId_serviceId_startTimeSeconds_key" ON "segment_time_profiles"("segmentId", "serviceId", "startTimeSeconds");

-- CreateIndex
CREATE INDEX "internal_transfers_fromPlatformId_idx" ON "internal_transfers"("fromPlatformId");

-- CreateIndex
CREATE INDEX "internal_transfers_toPlatformId_idx" ON "internal_transfers"("toPlatformId");

-- CreateIndex
CREATE UNIQUE INDEX "internal_transfers_fromPlatformId_toPlatformId_key" ON "internal_transfers"("fromPlatformId", "toPlatformId");

-- CreateIndex
CREATE INDEX "track_segments_fromPlatformId_idx" ON "track_segments"("fromPlatformId");

-- CreateIndex
CREATE INDEX "track_segments_toPlatformId_idx" ON "track_segments"("toPlatformId");

-- CreateIndex
CREATE INDEX "track_segments_lineId_idx" ON "track_segments"("lineId");

-- CreateIndex
CREATE UNIQUE INDEX "track_segments_fromPlatformId_toPlatformId_lineId_direction_key" ON "track_segments"("fromPlatformId", "toPlatformId", "lineId", "direction");

-- AddForeignKey
ALTER TABLE "platforms" ADD CONSTRAINT "platforms_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_segments" ADD CONSTRAINT "track_segments_fromPlatformId_fkey" FOREIGN KEY ("fromPlatformId") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_segments" ADD CONSTRAINT "track_segments_toPlatformId_fkey" FOREIGN KEY ("toPlatformId") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_segments" ADD CONSTRAINT "track_segments_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_time_profiles" ADD CONSTRAINT "segment_time_profiles_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "track_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_fromPlatformId_fkey" FOREIGN KEY ("fromPlatformId") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_toPlatformId_fkey" FOREIGN KEY ("toPlatformId") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_entrances" ADD CONSTRAINT "station_entrances_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- btree_gist: necessário para EXCLUDE com tipos não-geométricos
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Previne sobreposição de janelas de tempo para o mesmo segmento e serviço
ALTER TABLE "segment_time_profiles"
ADD CONSTRAINT "no_time_overlap"
EXCLUDE USING gist (
  "segmentId" WITH =,
  "serviceId" WITH =,
  int4range("startTimeSeconds", "endTimeSeconds") WITH &&
);