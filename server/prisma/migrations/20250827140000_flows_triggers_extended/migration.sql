-- Added new trigger fields for time windows and meta
ALTER TABLE "FlowTrigger" ADD COLUMN "startAt" DATETIME;
ALTER TABLE "FlowTrigger" ADD COLUMN "endAt" DATETIME;
ALTER TABLE "FlowTrigger" ADD COLUMN "daysMask" INTEGER;
ALTER TABLE "FlowTrigger" ADD COLUMN "meta" TEXT;
