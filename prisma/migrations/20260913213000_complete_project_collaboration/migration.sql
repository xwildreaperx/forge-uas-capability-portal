-- Rebuild HelpRequest to add controlled collaboration lifecycle and attribution.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_HelpRequest" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "projectId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'OTHER',
  "description" TEXT NOT NULL,
  "contact" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" INTEGER NOT NULL,
  "resolutionSummary" TEXT,
  "resolvedAt" DATETIME,
  "resolvedByUserId" INTEGER,
  CONSTRAINT "HelpRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HelpRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "HelpRequest_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_HelpRequest" ("createdAt", "description", "id", "projectId", "status", "title", "createdByUserId")
SELECT "createdAt", "description", "id", "projectId", CASE "status" WHEN 'Open' THEN 'OPEN' ELSE 'OTHER' END, "title", COALESCE((SELECT "createdByUserId" FROM "Project" WHERE "Project"."id" = "HelpRequest"."projectId"), 1) FROM "HelpRequest";
DROP TABLE "HelpRequest";
ALTER TABLE "new_HelpRequest" RENAME TO "HelpRequest";
CREATE INDEX "HelpRequest_status_category_idx" ON "HelpRequest"("status", "category");
CREATE INDEX "HelpRequest_projectId_createdAt_idx" ON "HelpRequest"("projectId", "createdAt");

ALTER TABLE "RepositoryLink" ADD COLUMN "phaseId" INTEGER REFERENCES "ProjectPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
PRAGMA foreign_keys=ON;
