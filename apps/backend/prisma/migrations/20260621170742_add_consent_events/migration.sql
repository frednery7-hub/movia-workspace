-- CreateEnum
CREATE TYPE "ConsentAction" AS ENUM ('GRANTED', 'REVOKED');

-- CreateTable
CREATE TABLE "consent_events" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "version" TEXT,
    "locationUse" BOOLEAN,
    "analytics" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_events_deviceId_idx" ON "consent_events"("deviceId");

-- CreateIndex
CREATE INDEX "consent_events_createdAt_idx" ON "consent_events"("createdAt");
