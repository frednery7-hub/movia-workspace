-- CreateEnum
CREATE TYPE "LineStatus" AS ENUM ('NORMAL', 'DELAYED', 'FAULTY', 'SUSPENDED');

-- CreateTable
CREATE TABLE "network_state" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "status" "LineStatus" NOT NULL DEFAULT 'NORMAL',
    "delaySeconds" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "network_state_lineId_key" ON "network_state"("lineId");

-- CreateIndex
CREATE INDEX "network_state_lineId_idx" ON "network_state"("lineId");
