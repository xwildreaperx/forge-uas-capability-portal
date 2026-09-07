import { PrismaClient, type SolutionType } from '@prisma/client';
const db = new PrismaClient();
const pathways: { id: string; name: string; solutionType: SolutionType }[] = [
  {
    id: 'PRJ-000001',
    name: 'Airborne Communications Relay',
    solutionType: 'ORGANIC_DEVELOPMENT',
  },
  {
    id: 'PRJ-000004',
    name: 'Commercial Networked Radio Evaluation',
    solutionType: 'VENDOR_SOLUTION',
  },
  {
    id: 'PRJ-000008',
    name: 'Directional Antenna Employment Technique',
    solutionType: 'TACTIC_TECHNIQUE',
  },
  {
    id: 'PRJ-000013',
    name: 'RF Planning and Antenna Employment Training Package',
    solutionType: 'TRAINING',
  },
  {
    id: 'PRJ-000019',
    name: 'Existing Radio Network Configuration Improvement',
    solutionType: 'INTEGRATION_CONFIGURATION',
  },
];
async function main() {
  for (const item of pathways)
    await db.project.update({
      where: { trackingId: item.id },
      data: { name: item.name, solutionType: item.solutionType },
    });
  const vendor = await db.project.findUniqueOrThrow({
    where: { trackingId: 'PRJ-000004' },
  });
  await db.vendorDetail.upsert({
    where: { projectId: vendor.id },
    update: {},
    create: {
      projectId: vendor.id,
      vendorName: 'Aegis Wave Systems',
      productName: 'RavenLink NR-4',
      productUrl: 'https://example.invalid/vendor-product',
      commercialAvailability: 'Commercially available',
      estimatedUnitCost: 18500,
      estimatedTotalCost: 92500,
      procurementStatus: 'Market research',
      evaluationStatus: 'Field evaluation',
      quantityEvaluated: 5,
      evaluationObjective:
        'Assess range, interoperability, operator workload, and sustainment burden.',
      integrationRequirements:
        'Existing power adapter and approved network configuration.',
      sustainmentNotes: 'Vendor support plus unit-level spares package.',
      evaluationResult:
        'Improved link continuity during three fictional terrain runs.',
      recommendation: 'Continue Evaluation',
    },
  });
  const tactic = await db.project.findUniqueOrThrow({
    where: { trackingId: 'PRJ-000008' },
  });
  await db.tacticDetail.upsert({
    where: { projectId: tactic.id },
    update: {},
    create: {
      projectId: tactic.id,
      techniqueTitle: 'Directional Antenna Employment Technique',
      techniqueDescription:
        'Reposition and orient the ground antenna using a repeatable terrain-aware planning card.',
      conditionsForUse: 'Terrain masking or marginal link conditions.',
      preconditions: 'Basic RF survey complete.',
      requiredEquipment:
        'Existing directional antenna, compass, and planning card.',
      requiredTraining: 'One-hour operator practical exercise.',
      demonstratedEffect:
        'Extended usable control-link distance in repeatable trials.',
      limitations:
        'Requires line-of-bearing awareness and additional setup time.',
      validationEvent: 'Fictional Ridgeview field event 26-04.',
      applicableEnvironments: 'Rolling and mountainous terrain.',
      recommendation: 'Adopt with Training',
    },
  });
  const training = await db.project.findUniqueOrThrow({
    where: { trackingId: 'PRJ-000013' },
  });
  await db.trainingDetail.upsert({
    where: { projectId: training.id },
    update: {},
    create: {
      projectId: training.id,
      trainingObjective:
        'Enable operators to plan RF paths and employ antennas consistently.',
      intendedAudience: 'UAS operators and mission planners',
      prerequisites: 'Basic system qualification',
      trainingMethod: 'Classroom module followed by hands-on lane',
      trainingMaterials:
        'RF planning card, terrain vignettes, instructor guide',
      validationMethod: 'Observed practical exercise and link-planning rubric',
      observedEffect:
        'Fewer avoidable antenna-placement errors during evaluation.',
      recurringFrequency: 'Initial qualification and annual refresher',
    },
  });
  const problem = await db.problem.findUniqueOrThrow({
    where: { trackingId: 'PRB-000001' },
  });
  const integration = await db.project.findUniqueOrThrow({
    where: { trackingId: 'PRJ-000019' },
  });
  await db.problemProject.upsert({
    where: {
      problemId_projectId: { problemId: problem.id, projectId: integration.id },
    },
    update: {},
    create: {
      problemId: problem.id,
      projectId: integration.id,
      isPrimary: false,
    },
  });
  console.log(
    'Upgraded five PRB-000001 solution pathways without resetting local data.',
  );
}
main().finally(() => db.$disconnect());
