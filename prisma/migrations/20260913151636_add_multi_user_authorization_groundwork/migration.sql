-- AlterTable
ALTER TABLE "LessonLearned" ADD COLUMN "createdByUserId" INTEGER;

-- AlterTable
ALTER TABLE "ProjectPhase" ADD COLUMN "createdByUserId" INTEGER;

-- AlterTable
ALTER TABLE "RepositoryLink" ADD COLUMN "createdByUserId" INTEGER;

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trackingId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CONTRIBUTOR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "notes" TEXT,
    "primaryUnitId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastActivityAt" DATETIME,
    CONSTRAINT "User_primaryUnitId_fkey" FOREIGN KEY ("primaryUnitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnitMembership" (
    "userId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("userId", "unitId"),
    CONSTRAINT "UnitMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitMembership_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProblemSubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trackingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Uncategorized',
    "operationalImpact" TEXT,
    "supportingContext" TEXT,
    "originatorContact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submitterId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "reviewerId" INTEGER,
    "relatedProblemId" INTEGER,
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProblemSubmission_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProblemSubmission_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProblemSubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProblemSubmission_relatedProblemId_fkey" FOREIGN KEY ("relatedProblemId") REFERENCES "Problem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectMembership" (
    "userId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CONTRIBUTOR',

    PRIMARY KEY ("userId", "projectId"),
    CONSTRAINT "ProjectMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMembership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actor" TEXT,
    "problemId" INTEGER,
    "projectId" INTEGER,
    "unitId" INTEGER,
    "userId" INTEGER,
    CONSTRAINT "ActivityEvent_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ActivityEvent" ("actor", "description", "eventType", "id", "problemId", "projectId", "timestamp", "unitId") SELECT "actor", "description", "eventType", "id", "problemId", "projectId", "timestamp", "unitId" FROM "ActivityEvent";
DROP TABLE "ActivityEvent";
ALTER TABLE "new_ActivityEvent" RENAME TO "ActivityEvent";
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
    "createdByUserId" INTEGER,
    CONSTRAINT "Project_leadUnitId_fkey" FOREIGN KEY ("leadUnitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("accessInstructions", "aiContextNotes", "architectureSummary", "assumptions", "completion", "constraints", "createdAt", "decisionsSummary", "detailedDescription", "documentationAvailability", "executiveSummary", "executiveSummaryPlainLanguage", "expectedCompletionDate", "id", "impactPlainLanguage", "intendedUsers", "keyAdvantage", "keyLimitation", "keyRisk", "latestResult", "leadUnitId", "leadershipAction", "maturity", "methodologySummary", "name", "nextStep", "openIssues", "originatorContact", "outOfScope", "outcome", "problemPlainLanguage", "scope", "solutionApproach", "solutionPlainLanguage", "solutionType", "startDate", "status", "successCriteria", "trackingId", "updatedAt") SELECT "accessInstructions", "aiContextNotes", "architectureSummary", "assumptions", "completion", "constraints", "createdAt", "decisionsSummary", "detailedDescription", "documentationAvailability", "executiveSummary", "executiveSummaryPlainLanguage", "expectedCompletionDate", "id", "impactPlainLanguage", "intendedUsers", "keyAdvantage", "keyLimitation", "keyRisk", "latestResult", "leadUnitId", "leadershipAction", "maturity", "methodologySummary", "name", "nextStep", "openIssues", "originatorContact", "outOfScope", "outcome", "problemPlainLanguage", "scope", "solutionApproach", "solutionPlainLanguage", "solutionType", "startDate", "status", "successCriteria", "trackingId", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_trackingId_key" ON "Project"("trackingId");
CREATE TABLE "new_Unit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trackingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "parentOrganization" TEXT,
    "locationId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "forgePointOfContact" TEXT,
    CONSTRAINT "Unit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Unit" ("abbreviation", "id", "locationId", "name", "parentOrganization", "trackingId", "unitType") SELECT "abbreviation", "id", "locationId", "name", "parentOrganization", "trackingId", "unitType" FROM "Unit";
DROP TABLE "Unit";
ALTER TABLE "new_Unit" RENAME TO "Unit";
CREATE UNIQUE INDEX "Unit_trackingId_key" ON "Unit"("trackingId");
CREATE UNIQUE INDEX "Unit_name_key" ON "Unit"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_trackingId_key" ON "User"("trackingId");

-- CreateIndex
CREATE UNIQUE INDEX "User_identifier_key" ON "User"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemSubmission_trackingId_key" ON "ProblemSubmission"("trackingId");
