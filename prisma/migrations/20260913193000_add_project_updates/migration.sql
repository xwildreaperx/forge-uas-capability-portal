-- CreateTable
CREATE TABLE "ProjectUpdate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "phaseId" INTEGER,
    "occurredAt" DATETIME NOT NULL,
    "summary" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "nextStep" TEXT NOT NULL,
    "blockerRisk" TEXT,
    "statusAfter" TEXT,
    "maturityAfter" TEXT,
    "completionAfter" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectUpdate_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProjectPhase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "lastMeaningfulActivityAt" DATETIME;

-- AlterTable
ALTER TABLE "ActivityEvent" ADD COLUMN "projectUpdateId" INTEGER REFERENCES "ProjectUpdate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ProjectUpdate_projectId_occurredAt_idx" ON "ProjectUpdate"("projectId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityEvent_projectUpdateId_key" ON "ActivityEvent"("projectUpdateId");
