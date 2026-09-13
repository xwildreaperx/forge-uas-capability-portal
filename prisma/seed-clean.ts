import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  await db.$transaction([
    db.activityEvent.deleteMany(),
    db.problemSubmission.deleteMany(),
    db.projectMembership.deleteMany(),
    db.unitMembership.deleteMany(),
    db.helpRequest.deleteMany(),
    db.repositoryLink.deleteMany(),
    db.vendorDetail.deleteMany(),
    db.tacticDetail.deleteMany(),
    db.trainingDetail.deleteMany(),
    db.lessonTag.deleteMany(),
    db.lessonLearned.deleteMany(),
    db.projectPhase.deleteMany(),
    db.projectLocation.deleteMany(),
    db.problemLocation.deleteMany(),
    db.projectTag.deleteMany(),
    db.problemTag.deleteMany(),
    db.unitTag.deleteMany(),
    db.projectUnit.deleteMany(),
    db.problemUnit.deleteMany(),
    db.problemProject.deleteMany(),
    db.project.deleteMany(),
    db.problem.deleteMany(),
    db.user.deleteMany(),
    db.unit.deleteMany(),
    db.tag.deleteMany(),
    db.location.deleteMany(),
    db.trackingCounter.deleteMany(),
  ]);
  await db.user.create({
    data: {
      trackingId: 'USR-000001',
      displayName: 'FORGE Bootstrap Administrator',
      identifier: process.env.FORGE_BOOTSTRAP_IDENTIFIER || 'bootstrap-admin',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
      notes:
        'Bootstrap identity record only. Replace or map this identifier during future authentication integration.',
    },
  });
  await db.trackingCounter.createMany({
    data: [
      { entity: 'Problem', value: 0 },
      { entity: 'Project', value: 0 },
      { entity: 'Unit', value: 0 },
      { entity: 'Lesson', value: 0 },
      { entity: 'User', value: 1 },
      { entity: 'Submission', value: 0 },
    ],
  });
  console.log(
    'Created a clean FORGE database with one generic bootstrap administrator and no operational/demo records.',
  );
}

main().finally(() => db.$disconnect());
