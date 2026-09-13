-- Add canonical Unit and Problem governance without rewriting operational records.
ALTER TABLE "Unit" ADD COLUMN "description" TEXT;
ALTER TABLE "Problem" ADD COLUMN "impact" TEXT;
ALTER TABLE "Problem" ADD COLUMN "stewardUserId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Problem" ADD COLUMN "supersededById" INTEGER REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SubmissionReview" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "submissionId" INTEGER NOT NULL,
  "reviewerId" INTEGER NOT NULL,
  "stage" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ProblemSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SubmissionReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "SubmissionReview_submissionId_createdAt_idx" ON "SubmissionReview"("submissionId", "createdAt");

CREATE TABLE "ProblemRelationship" (
  "sourceProblemId" INTEGER NOT NULL,
  "targetProblemId" INTEGER NOT NULL,
  "relationship" TEXT NOT NULL,
  CONSTRAINT "ProblemRelationship_sourceProblemId_fkey" FOREIGN KEY ("sourceProblemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProblemRelationship_targetProblemId_fkey" FOREIGN KEY ("targetProblemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY ("sourceProblemId", "targetProblemId", "relationship")
);
