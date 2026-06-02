-- CreateEnum
CREATE TYPE "NetworkStateSourceType" AS ENUM ('OPERATOR', 'ADMIN', 'AI_ENGINE');

-- AlterTable
ALTER TABLE "network_state" ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceType" "NetworkStateSourceType";

-- CreateTable
CREATE TABLE "network_state_events" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "oldStatus" "LineStatus",
    "newStatus" "LineStatus" NOT NULL,
    "oldDelaySeconds" INTEGER,
    "newDelaySeconds" INTEGER NOT NULL,
    "oldMessage" TEXT,
    "newMessage" TEXT,
    "sourceId" TEXT,
    "sourceType" "NetworkStateSourceType" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_state_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "network_state_events_lineId_idx" ON "network_state_events"("lineId");

-- CreateIndex
CREATE INDEX "network_state_events_createdAt_idx" ON "network_state_events"("createdAt");

-- AddForeignKey
ALTER TABLE "network_state" ADD CONSTRAINT "network_state_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
