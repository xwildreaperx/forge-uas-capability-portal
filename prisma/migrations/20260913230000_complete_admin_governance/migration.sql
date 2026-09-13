-- Final pilot governance refinements; all existing records retain identity and relationships.
ALTER TABLE "Project" ADD COLUMN "leadUnitTransferPending" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "leadUnitTransferAcknowledgedAt" DATETIME;
ALTER TABLE "LessonLearned" ADD COLUMN "knowledgeStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "RepositoryLink" ADD COLUMN "accessInstructions" TEXT;
ALTER TABLE "ActivityEvent" ADD COLUMN "entityType" TEXT;
ALTER TABLE "ActivityEvent" ADD COLUMN "entityId" TEXT;
ALTER TABLE "ActivityEvent" ADD COLUMN "entityHref" TEXT;
