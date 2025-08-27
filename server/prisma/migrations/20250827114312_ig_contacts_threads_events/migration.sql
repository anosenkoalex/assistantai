-- CreateTable
CREATE TABLE "IgContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "igUserId" TEXT NOT NULL,
    "username" TEXT,
    "fullName" TEXT,
    "locale" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'bot',
    "notes" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "IgContact_igUserId_key" ON "IgContact"("igUserId");

-- CreateTable
CREATE TABLE "IgThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "pageId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'active',
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IgThread_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "IgContact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IgEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT,
    "payload" TEXT,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IgEvent_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "IgThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
