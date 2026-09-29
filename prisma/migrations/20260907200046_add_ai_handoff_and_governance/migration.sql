-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trackingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "detailedDescription" TEXT NOT NULL,
    "solutionApproach" TEXT NOT NULL,
    "solutionType" TEXT NOT NULL DEFAULT 'ORGANIC_DEVELOPMENT',
    "documentationAvailability" TEXT NOT NULL DEFAULT 'AVAILABLE_IN_FORGE',
    "executiveSummaryPlainLanguage" TEXT,
    "problemPlainLanguage" TEXT,
    "solutionPlainLanguage" TEXT,
    "impactPlainLanguage" TEXT,
    "aiContextNotes" TEXT,
    "scope" TEXT,
    "outOfScope" TEXT,
    "intendedUsers" TEXT,
    "successCriteria" TEXT,
    "constraints" TEXT,
    "assumptions" TEXT,
    "architectureSummary" TEXT,
    "methodologySummary" TEXT,
    "decisionsSummary" TEXT,
    "openIssues" TEXT,
    "nextStep" TEXT,
    "keyRisk" TEXT,
    "leadershipAction" TEXT,
    "originatorContact" TEXT,
    "accessInstructions" TEXT,
    "status" TEXT NOT NULL,
    "maturity" TEXT NOT NULL,
    "completion" INTEGER NOT NULL,
    "outcome" TEXT,
    "keyAdvantage" TEXT,
    "keyLimitation" TEXT,
    "latestResult" TEXT,
    "startDate" DATETIME NOT NULL,
    "expectedCompletionDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "leadUnitId" INTEGER NOT NULL,
    CONSTRAINT "Project_leadUnitId_fkey" FOREIGN KEY ("leadUnitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("completion", "createdAt", "detailedDescription", "executiveSummary", "expectedCompletionDate", "id", "keyAdvantage", "keyLimitation", "latestResult", "leadUnitId", "maturity", "name", "outcome", "solutionApproach", "solutionType", "startDate", "status", "trackingId", "updatedAt") SELECT "completion", "createdAt", "detailedDescription", "executiveSummary", "expectedCompletionDate", "id", "keyAdvantage", "keyLimitation", "latestResult", "leadUnitId", "maturity", "name", "outcome", "solutionApproach", "solutionType", "startDate", "status", "trackingId", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_trackingId_key" ON "Project"("trackingId");
CREATE TABLE "new_RepositoryLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "artifactType" TEXT,
    "documentationAvailability" TEXT NOT NULL DEFAULT 'EXTERNAL_REFERENCE',
    "includeInAiHandoff" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "RepositoryLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RepositoryLink" ("description", "id", "name", "projectId", "url") SELECT "description", "id", "name", "projectId", "url" FROM "RepositoryLink";
DROP TABLE "RepositoryLink";
ALTER TABLE "new_RepositoryLink" RENAME TO "RepositoryLink";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
