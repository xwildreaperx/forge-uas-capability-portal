import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const initializedAt = new Date('2026-09-13T12:00:00.000Z');
const pendingDetail = 'Detailed capability-level problem statement pending stakeholder refinement.';

const organizations = [
  ['1st Special Forces Group (SFG)', '1st SFG', 'Special Forces Group', '1st Special Forces Command (SFC)'],
  ['3rd Special Forces Group (SFG)', '3rd SFG', 'Special Forces Group', '1st Special Forces Command (SFC)'],
  ['5th Special Forces Group (SFG)', '5th SFG', 'Special Forces Group', '1st Special Forces Command (SFC)'],
  ['7th Special Forces Group (SFG)', '7th SFG', 'Special Forces Group', '1st Special Forces Command (SFC)'],
  ['10th Special Forces Group (SFG)', '10th SFG', 'Special Forces Group', '1st Special Forces Command (SFC)'],
  ['19th Special Forces Group (SFG)', '19th SFG', 'Special Forces Group', '1st Special Forces Command (SFC)'],
  ['20th Special Forces Group (SFG)', '20th SFG', 'Special Forces Group', '1st Special Forces Command (SFC)'],
  ['1st Special Forces Command (SFC)', '1st SFC', 'Command', 'USASOC'],
  ['USASOC', 'USASOC', 'Command', null],
] as const;

const problems = [
  ['GPS Denied Navigation', 'Navigation', 'Capability gap involving reliable UxS navigation when normal satellite-based navigation is unavailable or unreliable.'],
  ['One-to-Many UxS Control', 'Autonomy / Control', 'Capability gap involving efficient control and management of multiple unmanned systems by a limited number of operators.'],
  ['Limited UAS — Rotary Wing RF-Control Range', 'RF / Communications', 'Capability gap involving reliable control-link range for rotary-wing unmanned aircraft.'],
  ['Limited UAS — Fixed Wing RF-Control Range', 'RF / Communications', 'Capability gap involving reliable control-link range for fixed-wing unmanned aircraft.'],
  ['Air-to-Ground Target Identification', 'Identification / Sensing', 'Capability gap involving reliable identification between airborne systems and objects or entities on the ground.'],
  ['Air-to-Air Target Identification', 'Identification / Sensing', 'Capability gap involving reliable identification between airborne systems.'],
  ['Ground-to-Air Target Identification', 'Identification / Sensing', 'Capability gap involving reliable identification of airborne objects or systems from a ground-based perspective.'],
  ['Ground-to-Ground Target Identification', 'Identification / Sensing', 'Capability gap involving reliable identification between ground-based systems or observations and objects or entities on the ground.'],
  ['Air-to-Ground Terminal Guidance — Rotary Wing', 'Guidance', 'Capability gap involving terminal guidance from an airborne rotary-wing unmanned system toward a ground-based endpoint or objective.'],
  ['Air-to-Ground Terminal Guidance — Fixed Wing', 'Guidance', 'Capability gap involving terminal guidance from an airborne fixed-wing unmanned system toward a ground-based endpoint or objective.'],
  ['RF Signature Reduction — Prevent GCS Identification', 'RF / Signature Management', 'Capability gap involving reduction or management of detectable RF characteristics associated with a ground control station.'],
  ['RF Signature Reduction — Prevent Aircraft Identification', 'RF / Signature Management', 'Capability gap involving reduction or management of detectable RF characteristics associated with an unmanned aircraft.'],
] as const;

async function main() {
  await db.$transaction([
    db.activityEvent.deleteMany(), db.problemSubmission.deleteMany(), db.projectMembership.deleteMany(),
    db.unitMembership.deleteMany(), db.helpRequest.deleteMany(), db.repositoryLink.deleteMany(),
    db.vendorDetail.deleteMany(), db.tacticDetail.deleteMany(), db.trainingDetail.deleteMany(),
    db.lessonTag.deleteMany(), db.lessonLearned.deleteMany(), db.projectPhase.deleteMany(),
    db.projectLocation.deleteMany(), db.problemLocation.deleteMany(), db.projectTag.deleteMany(),
    db.problemTag.deleteMany(), db.unitTag.deleteMany(), db.projectUnit.deleteMany(),
    db.problemUnit.deleteMany(), db.problemProject.deleteMany(), db.project.deleteMany(),
    db.problem.deleteMany(), db.user.deleteMany(), db.unit.deleteMany(), db.tag.deleteMany(),
    db.location.deleteMany(), db.trackingCounter.deleteMany(),
  ]);

  const tags = new Map<string, number>();
  for (const category of [...new Set(problems.map((item) => item[1]))]) {
    const tag = await db.tag.create({ data: { name: category } });
    tags.set(category, tag.id);
  }
  for (const [index, [name, abbreviation, unitType, parentOrganization]] of organizations.entries()) {
    await db.unit.create({ data: { trackingId: `UNIT-${String(index + 1).padStart(6, '0')}`, name, abbreviation, unitType, parentOrganization } });
  }
  for (const [index, [title, category, summary]] of problems.entries()) {
    await db.problem.create({ data: {
      trackingId: `PRB-${String(index + 1).padStart(6, '0')}`, title,
      shortDescription: summary, detailedDescription: pendingDetail, problemStatement: pendingDetail,
      category, priority: 'Unprioritized', status: 'Open', owner: null, dateIdentified: initializedAt,
      tags: { create: { tagId: tags.get(category)! } },
    } });
  }
  await db.user.create({ data: {
    trackingId: 'USR-000001', displayName: 'FORGE Bootstrap Administrator',
    identifier: process.env.FORGE_BOOTSTRAP_IDENTIFIER || 'bootstrap-admin', role: 'SYSTEM_ADMIN', status: 'ACTIVE',
    notes: 'Bootstrap identity profile only. Replace or map this identifier during future authentication integration.',
  } });
  await db.trackingCounter.createMany({ data: [
    { entity: 'Problem', value: 12 }, { entity: 'Project', value: 0 }, { entity: 'Unit', value: 9 },
    { entity: 'Lesson', value: 0 }, { entity: 'User', value: 1 }, { entity: 'Submission', value: 0 },
  ] });
  console.log('Initialized clean FORGE operational data: 9 approved Units, 12 canonical Problems, 0 Projects, and 1 generic bootstrap administrator.');
}

main().finally(() => db.$disconnect());
