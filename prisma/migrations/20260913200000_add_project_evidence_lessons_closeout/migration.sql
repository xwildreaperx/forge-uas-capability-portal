-- AlterTable
ALTER TABLE "ProjectUpdate" ADD COLUMN "maturityEvidenceDate" DATETIME;
ALTER TABLE "ProjectUpdate" ADD COLUMN "maturityEvidenceEvent" TEXT;
ALTER TABLE "ProjectUpdate" ADD COLUMN "maturityEvidenceReference" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LessonLearned" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trackingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "finding" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "lessonType" TEXT NOT NULL DEFAULT 'CONFIRMED_FINDING',
    "date" DATETIME NOT NULL,
    "projectId" INTEGER NOT NULL,
    "phaseId" INTEGER,
    "unitId" INTEGER,
    "createdByUserId" INTEGER,
    "sourceUpdateId" INTEGER,
    CONSTRAINT "LessonLearned_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LessonLearned_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProjectPhase" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LessonLearned_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LessonLearned_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LessonLearned_sourceUpdateId_fkey" FOREIGN KEY ("sourceUpdateId") REFERENCES "ProjectUpdate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LessonLearned" ("createdByUserId", "date", "finding", "id", "phaseId", "projectId", "recommendation", "title", "trackingId", "unitId") SELECT "createdByUserId", "date", "finding", "id", "phaseId", "projectId", "recommendation", "title", "trackingId", "unitId" FROM "LessonLearned";
DROP TABLE "LessonLearned";
ALTER TABLE "new_LessonLearned" RENAME TO "LessonLearned";
CREATE UNIQUE INDEX "LessonLearned_trackingId_key" ON "LessonLearned"("trackingId");
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
    "outcomeDisposition" TEXT,
    "finalResult" TEXT,
    "whatWorked" TEXT,
    "whatDidNotWork" TEXT,
    "recommendedNextAction" TEXT,
    "closedAt" DATETIME,
    "closedByUserId" INTEGER,
    "successorProjectId" INTEGER,
    "keyAdvantage" TEXT,
    "keyLimitation" TEXT,
    "latestResult" TEXT,
    "startDate" DATETIME NOT NULL,
    "expectedCompletionDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastMeaningfulActivityAt" DATETIME,
    "leadUnitId" INTEGER NOT NULL,
    "createdByUserId" INTEGER,
    CONSTRAINT "Project_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_successorProjectId_fkey" FOREIGN KEY ("successorProjectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_leadUnitId_fkey" FOREIGN KEY ("leadUnitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("accessInstructions", "aiContextNotes", "architectureSummary", "assumptions", "completion", "constraints", "createdAt", "createdByUserId", "decisionsSummary", "detailedDescription", "documentationAvailability", "executiveSummary", "executiveSummaryPlainLanguage", "expectedCompletionDate", "id", "impactPlainLanguage", "intendedUsers", "keyAdvantage", "keyLimitation", "keyRisk", "lastMeaningfulActivityAt", "latestResult", "leadUnitId", "leadershipAction", "maturity", "methodologySummary", "name", "nextStep", "openIssues", "originatorContact", "outOfScope", "outcome", "problemPlainLanguage", "scope", "solutionApproach", "solutionPlainLanguage", "solutionType", "startDate", "status", "successCriteria", "trackingId", "updatedAt") SELECT "accessInstructions", "aiContextNotes", "architectureSummary", "assumptions", "completion", "constraints", "createdAt", "createdByUserId", "decisionsSummary", "detailedDescription", "documentationAvailability", "executiveSummary", "executiveSummaryPlainLanguage", "expectedCompletionDate", "id", "impactPlainLanguage", "intendedUsers", "keyAdvantage", "keyLimitation", "keyRisk", "lastMeaningfulActivityAt", "latestResult", "leadUnitId", "leadershipAction", "maturity", "methodologySummary", "name", "nextStep", "openIssues", "originatorContact", "outOfScope", "outcome", "problemPlainLanguage", "scope", "solutionApproach", "solutionPlainLanguage", "solutionType", "startDate", "status", "successCriteria", "trackingId", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_trackingId_key" ON "Project"("trackingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
