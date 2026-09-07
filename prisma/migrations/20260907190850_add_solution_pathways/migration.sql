-- CreateTable
CREATE TABLE "VendorDetail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "vendorName" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productUrl" TEXT,
    "commercialAvailability" TEXT,
    "estimatedUnitCost" REAL,
    "estimatedTotalCost" REAL,
    "procurementStatus" TEXT,
    "evaluationStatus" TEXT,
    "quantityEvaluated" INTEGER,
    "evaluationObjective" TEXT,
    "integrationRequirements" TEXT,
    "sustainmentNotes" TEXT,
    "evaluationResult" TEXT,
    "recommendation" TEXT,
    CONSTRAINT "VendorDetail_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TacticDetail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "techniqueTitle" TEXT NOT NULL,
    "techniqueDescription" TEXT NOT NULL,
    "conditionsForUse" TEXT,
    "preconditions" TEXT,
    "requiredEquipment" TEXT,
    "requiredTraining" TEXT,
    "demonstratedEffect" TEXT,
    "limitations" TEXT,
    "validationEvent" TEXT,
    "applicableEnvironments" TEXT,
    "recommendation" TEXT,
    CONSTRAINT "TacticDetail_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingDetail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "trainingObjective" TEXT NOT NULL,
    "intendedAudience" TEXT NOT NULL,
    "prerequisites" TEXT,
    "trainingMethod" TEXT,
    "trainingMaterials" TEXT,
    "validationMethod" TEXT,
    "observedEffect" TEXT,
    "recurringFrequency" TEXT,
    CONSTRAINT "TrainingDetail_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
INSERT INTO "new_Project" ("completion", "createdAt", "detailedDescription", "executiveSummary", "expectedCompletionDate", "id", "keyAdvantage", "keyLimitation", "latestResult", "leadUnitId", "maturity", "name", "outcome", "solutionApproach", "startDate", "status", "trackingId", "updatedAt") SELECT "completion", "createdAt", "detailedDescription", "executiveSummary", "expectedCompletionDate", "id", "keyAdvantage", "keyLimitation", "latestResult", "leadUnitId", "maturity", "name", "outcome", "solutionApproach", "startDate", "status", "trackingId", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_trackingId_key" ON "Project"("trackingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "VendorDetail_projectId_key" ON "VendorDetail"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "TacticDetail_projectId_key" ON "TacticDetail"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingDetail_projectId_key" ON "TrainingDetail"("projectId");
