-- AlterTable
ALTER TABLE "IgSetting" ADD COLUMN "aiEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "IgSetting" ADD COLUMN "aiModel" TEXT;
ALTER TABLE "IgSetting" ADD COLUMN "aiTemperature" REAL NOT NULL DEFAULT 0.7;
ALTER TABLE "IgSetting" ADD COLUMN "systemPrompt" TEXT;

-- CreateTable Usage
CREATE TABLE "Usage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "promptTokens" INTEGER NOT NULL,
  "completionTokens" INTEGER NOT NULL,
  "costUsd" REAL NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
