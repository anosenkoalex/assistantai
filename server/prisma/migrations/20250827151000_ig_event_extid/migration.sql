-- AlterTable
ALTER TABLE "IgEvent" ADD COLUMN "extId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IgEvent_extId_key" ON "IgEvent"("extId");
