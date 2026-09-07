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
  await db.project.update({
    where: { trackingId: 'PRJ-000001' },
    data: {
      executiveSummaryPlainLanguage:
        'This Project is testing an airborne relay that can carry control and video signals around terrain that blocks the current ground system.',
      problemPlainLanguage:
        'Teams lose reliable communications when distance or terrain blocks the direct link to an aircraft.',
      solutionPlainLanguage:
        'We are building and field-testing an additional airborne communications node.',
      impactPlainLanguage:
        'Reliable communications increase usable range and flexibility without replacing the entire ground system.',
      aiContextNotes:
        'Use recorded evidence and distinguish demonstrated results from planned outcomes. All information is fictional and approved for this unclassified prototype.',
      scope:
        'Assess an airborne relay against the linked communications Problem and identify a practical transition recommendation.',
      intendedUsers:
        'UAS operators, capability developers, and decision-makers',
      successCriteria:
        'Repeatable control and video continuity around a terrain obstruction.',
      architectureSummary:
        'Ground control connects to an airborne relay, which forwards control and video links to the operating aircraft.',
      methodologySummary:
        'Staged bench integration followed by repeatable fictional field evaluation against documented criteria.',
      decisionsSummary:
        'The team selected an airborne relay after direct ground placement could not address the terrain mask.',
      openIssues:
        'Additional airborne-node burden and final mounting configuration.',
      nextStep:
        'Complete the next multi-unit field event and decide whether to transition the relay package.',
      keyRisk:
        'The additional airborne node adds equipment and operator burden.',
      leadershipAction:
        'Approve testing support for the next multi-unit event.',
    },
  });
  await db.project.update({
    where: { trackingId: 'PRJ-000004' },
    data: {
      executiveSummaryPlainLanguage:
        'This Project is evaluating an existing commercial radio before leaders decide whether it is worth buying.',
      problemPlainLanguage:
        'Current communications do not remain reliable in all required terrain and distance conditions.',
      solutionPlainLanguage:
        'We are evaluating a commercially available networked radio.',
      impactPlainLanguage:
        'A suitable commercial product could provide capability sooner, but cost, integration, and sustainment must be understood first.',
      aiContextNotes:
        'Do not equate commercial availability with suitability. Retain test caveats and procurement uncertainty.',
      scope:
        'Evaluate performance, interoperability, cost, and sustainment before any procurement recommendation.',
      architectureSummary:
        'Commercial radios are evaluated as a networked replacement or adjunct to the current link.',
      methodologySummary:
        'Staged bench and field evaluation against documented performance and integration criteria.',
      decisionsSummary:
        'The team is evaluating before procurement rather than assuming commercial availability equals suitability.',
      openIssues: 'Long-term support cost and full interoperability evidence.',
      nextStep:
        'Complete interoperability testing and prepare a procurement recommendation.',
      keyRisk:
        'The product may perform well but create unacceptable integration or sustainment costs.',
      leadershipAction:
        'No procurement decision is requested until evaluation evidence is complete.',
    },
  });
  await db.project.update({
    where: { trackingId: 'PRJ-000008' },
    data: {
      documentationAvailability: 'AVAILABLE_FROM_ORIGINATOR',
      executiveSummaryPlainLanguage:
        'This Project records a validated way to improve communications with equipment units already possess; the authoritative technique remains with the originator.',
      problemPlainLanguage:
        'Existing equipment can underperform when antennas are placed or aimed without accounting for terrain.',
      solutionPlainLanguage:
        'We are validating a different way to position and employ existing antennas.',
      impactPlainLanguage:
        'A reusable technique may improve performance quickly without buying new equipment.',
      aiContextNotes:
        'This is a metadata-only discovery record. Do not reconstruct or invent the authoritative technique.',
      scope:
        'Preserve approved metadata, validation status, general effect, and the route to the information owner.',
      decisionsSummary:
        'The originator retains the authoritative procedure; FORGE stores approved discovery metadata and general effect only.',
      openIssues:
        'Access to the authoritative technique requires coordination with the originator.',
      nextStep:
        'Coordinate with the originator for authorized access and adoption support.',
      keyRisk:
        'Units may apply an incomplete version if they do not obtain the authoritative documentation.',
      leadershipAction: 'No leadership action required at this time.',
      originatorContact: 'Fictional Unit H Capability Integration Office',
      accessInstructions:
        'Contact the originating Unit through the listed FORGE coordination channel to request approved supporting documentation.',
    },
  });
  await db.repositoryLink.updateMany({
    data: {
      artifactType: 'Repository',
      documentationAvailability: 'EXTERNAL_REFERENCE',
      includeInAiHandoff: true,
    },
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
