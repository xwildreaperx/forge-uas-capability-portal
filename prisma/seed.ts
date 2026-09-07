import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const d = (value: string) => new Date(`${value}T12:00:00.000Z`);
const tracking = (prefix: string, value: number) =>
  `${prefix}-${String(value).padStart(6, '0')}`;

const problemNames = [
  'Short RF Range',
  'Video Link Degradation in Complex Terrain',
  'Navigation Reliability in Degraded Environments',
  'Limited Flight Endurance',
  'Lack of Common Ground Control Integration',
  'Difficult Field Firmware Management',
  'Limited Payload Capacity',
  'Inconsistent Video Distribution',
  'Limited Cross-Platform Interoperability',
  'Field Repairability',
  'Operator Training Standardization',
  'Data Sharing Between Systems',
];

const projectNames = [
  'Airborne Communications Relay',
  'Terrain-Aware Video Routing',
  'Degraded Navigation Toolkit',
  'Commercial Networked Radio Evaluation',
  'Modular Power Endurance Pack',
  'Common GCS Adapter',
  'Field Firmware Manager',
  'Directional Antenna Employment Technique',
  'Lightweight Payload Interface',
  'Distributed Video Gateway',
  'Cross-Platform Message Bridge',
  'Rapid Repair Kit',
  'RF Planning and Antenna Employment Training Package',
  'Operator Qualification Lab',
  'Edge Data Exchange',
  'Vision-Aided Navigation',
  'Adaptive Video Encoder',
  'Composite Airframe Study',
  'Existing Radio Network Configuration Improvement',
  'Mission Data Packaging Standard',
];

async function main() {
  await db.$transaction([
    db.activityEvent.deleteMany(),
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
    db.unit.deleteMany(),
    db.tag.deleteMany(),
    db.location.deleteMany(),
    db.trackingCounter.deleteMany(),
  ]);

  const locations = await Promise.all(
    [
      ['Ridgeview', 'CO', 39.61, -105.21],
      ['Northpoint', 'VA', 38.84, -77.31],
      ['Red Mesa', 'AZ', 34.61, -111.82],
      ['Pine Harbor', 'WA', 47.51, -122.52],
      ['Lakehurst', 'FL', 28.41, -81.48],
      ['Granite Field', 'NV', 39.16, -119.76],
      ['Cedar Plain', 'TX', 31.12, -97.72],
      ['Blue Ridge', 'NC', 35.58, -82.55],
    ].map(([name, region, latitude, longitude]) =>
      db.location.create({
        data: {
          name: String(name),
          region: String(region),
          latitude: Number(latitude),
          longitude: Number(longitude),
        },
      }),
    ),
  );

  const tagNames = [
    'RF / Communications',
    'Video',
    'Navigation',
    'Networking',
    'Payloads',
    'Power',
    'Software',
    'Data',
    'Mapping',
    'Training',
    'Maintenance',
    'Ground Control Stations',
  ];
  const tags = await Promise.all(
    tagNames.map((name) => db.tag.create({ data: { name } })),
  );

  const units = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      db.unit.create({
        data: {
          trackingId: tracking('UNIT', i + 1),
          name: `Fictional Unit ${String.fromCharCode(65 + i)}`,
          abbreviation: `Unit ${String.fromCharCode(65 + i)}`,
          unitType:
            i % 3 === 0 ? 'Integration' : i % 3 === 1 ? 'Test' : 'Development',
          parentOrganization: 'Fictional Capability Network',
          locationId: locations[i % locations.length].id,
          capabilities: {
            create: [
              { tagId: tags[i % tags.length].id },
              { tagId: tags[(i + 3) % tags.length].id },
            ],
          },
        },
      }),
    ),
  );

  const problems = await Promise.all(
    problemNames.map((title, i) =>
      db.problem.create({
        data: {
          trackingId: tracking('PRB', i + 1),
          title,
          shortDescription: `A recurring capability gap involving ${title.toLowerCase()}.`,
          detailedDescription: `Fictional units have documented repeatable operational constraints related to ${title.toLowerCase()}. The portal preserves competing approaches and evidence without implying sensitive real-world activity.`,
          problemStatement: `How might participating units reduce the effects of ${title.toLowerCase()} while preserving interoperability and field usability?`,
          category: tagNames[i % tagNames.length],
          priority: i < 4 ? 'High' : i < 9 ? 'Medium' : 'Low',
          status: i % 5 === 0 ? 'Monitoring' : 'Open',
          owner: units[i % units.length].name,
          dateIdentified: d(`2026-${String((i % 6) + 1).padStart(2, '0')}-15`),
          tags: {
            create: [
              { tagId: tags[i % tags.length].id },
              { tagId: tags[(i + 3) % tags.length].id },
            ],
          },
          locations: {
            create: [{ locationId: locations[i % locations.length].id }],
          },
          unitLinks: {
            create: [
              { unitId: units[i % units.length].id, relationship: 'Reporter' },
              {
                unitId: units[(i + 2) % units.length].id,
                relationship: 'Affected',
              },
            ],
          },
        },
      }),
    ),
  );

  const maturities = ['Concept', 'Prototype', 'Field Tested', 'Validated'];
  const statuses = ['Planning', 'Active', 'Active', 'Transitioning'];
  const projects = [];
  const solutionTypes = [
    'ORGANIC_DEVELOPMENT',
    'VENDOR_SOLUTION',
    'TACTIC_TECHNIQUE',
    'TRAINING',
    'INTEGRATION_CONFIGURATION',
    'PROCESS_POLICY',
    'HYBRID',
  ] as const;
  for (let i = 0; i < projectNames.length; i++) {
    const problemIndexes = i === 0 ? [0, 1] : [i % 12];
    if ([3, 7, 12, 18].includes(i) && !problemIndexes.includes(0))
      problemIndexes.push(0);
    if (i !== 0 && i % 4 === 0 && !problemIndexes.includes((i + 3) % 12))
      problemIndexes.push((i + 3) % 12);
    const maturity =
      (
        {
          0: 'Field Tested',
          3: 'Prototype',
          7: 'Validated',
          12: 'Concept',
        } as Record<number, string>
      )[i] ?? maturities[(i + 2) % maturities.length];
    const completion =
      ({ 0: 72, 3: 48, 7: 91, 12: 22 } as Record<number, number>)[i] ??
      Math.min(95, 22 + ((i * 13) % 74));
    const lead = units[i % units.length];
    const solutionType: (typeof solutionTypes)[number] =
      (
        {
          0: 'ORGANIC_DEVELOPMENT',
          3: 'VENDOR_SOLUTION',
          7: 'TACTIC_TECHNIQUE',
          12: 'TRAINING',
          18: 'INTEGRATION_CONFIGURATION',
        } as Record<number, (typeof solutionTypes)[number]>
      )[i] ?? solutionTypes[i % solutionTypes.length];
    const project = await db.project.create({
      data: {
        trackingId: tracking('PRJ', i + 1),
        name: projectNames[i],
        solutionType,
        documentationAvailability:
          i === 7 ? 'AVAILABLE_FROM_ORIGINATOR' : 'AVAILABLE_IN_FORGE',
        executiveSummaryPlainLanguage:
          i === 0
            ? 'This Project is testing an airborne relay that can carry control and video signals around terrain that blocks the current ground system.'
            : i === 3
              ? 'This Project is evaluating an existing commercial radio before leaders decide whether it is worth buying.'
              : i === 7
                ? 'This Project records a validated way to improve communications with equipment units already possess; the authoritative technique remains with the originator.'
                : null,
        problemPlainLanguage:
          i === 0
            ? 'Teams lose reliable communications when distance or terrain blocks the direct link to an aircraft.'
            : i === 3
              ? 'Current communications do not remain reliable in all required terrain and distance conditions.'
              : i === 7
                ? 'Existing equipment can underperform when antennas are placed or aimed without accounting for terrain.'
                : null,
        solutionPlainLanguage:
          i === 0
            ? 'We are building and field-testing an additional airborne communications node.'
            : i === 3
              ? 'We are evaluating a commercially available networked radio.'
              : i === 7
                ? 'We are validating a different way to position and employ existing antennas.'
                : null,
        impactPlainLanguage:
          i === 0
            ? 'Reliable communications increase usable range and flexibility without replacing the entire ground system.'
            : i === 3
              ? 'A suitable commercial product could provide capability sooner, but cost, integration, and sustainment must be understood first.'
              : i === 7
                ? 'A reusable technique may improve performance quickly without buying new equipment.'
                : null,
        aiContextNotes: [0, 3, 7].includes(i)
          ? 'Use recorded evidence and distinguish demonstrated results from planned outcomes. All information is fictional and approved for this unclassified prototype.'
          : null,
        scope: [0, 3, 7].includes(i)
          ? 'Assess the selected pathway against the linked capability Problem, preserve evidence, and identify a practical transition recommendation.'
          : null,
        intendedUsers: [0, 3, 7].includes(i)
          ? 'UAS operators, capability developers, and decision-makers'
          : null,
        successCriteria:
          i === 0
            ? 'Repeatable control and video continuity around a terrain obstruction.'
            : i === 3
              ? 'Documented performance, interoperability, cost, and sustainment recommendation.'
              : i === 7
                ? 'Repeatable improvement using existing authorized equipment.'
                : null,
        architectureSummary:
          i === 0
            ? 'Ground control connects to an airborne relay, which forwards the control and video links to the operating aircraft.'
            : i === 3
              ? 'Commercial radios are evaluated as a networked replacement or adjunct to the current link.'
              : null,
        methodologySummary: [0, 3, 7].includes(i)
          ? 'Staged bench integration followed by repeatable fictional field evaluation against documented criteria.'
          : null,
        decisionsSummary:
          i === 0
            ? 'The team selected an airborne relay after direct ground placement could not address the terrain mask.'
            : i === 3
              ? 'The team is evaluating before procurement rather than assuming commercial availability equals suitability.'
              : i === 7
                ? 'The originator retains the authoritative procedure; FORGE stores approved discovery metadata and general effect only.'
                : null,
        openIssues:
          i === 0
            ? 'Additional airborne-node burden and final mounting configuration.'
            : i === 3
              ? 'Long-term support cost and full interoperability evidence.'
              : i === 7
                ? 'Access to the authoritative technique requires coordination with the originator.'
                : null,
        nextStep:
          i === 0
            ? 'Complete the next multi-unit field event and decide whether to transition the relay package.'
            : i === 3
              ? 'Complete interoperability testing and prepare a procurement recommendation.'
              : i === 7
                ? 'Coordinate with the originator for authorized access and adoption support.'
                : null,
        keyRisk:
          i === 0
            ? 'The additional airborne node adds equipment and operator burden.'
            : i === 3
              ? 'The product may perform well but create unacceptable integration or sustainment costs.'
              : i === 7
                ? 'Units may apply an incomplete version if they do not obtain the authoritative documentation.'
                : null,
        leadershipAction:
          i === 0
            ? 'Approve testing support for the next multi-unit event.'
            : i === 3
              ? 'No procurement decision is requested until evaluation evidence is complete.'
              : i === 7
                ? 'No leadership action required at this time.'
                : null,
        originatorContact:
          i === 7
            ? 'Fictional Unit H Capability Integration Office'
            : lead.name,
        accessInstructions:
          i === 7
            ? 'Contact the originating Unit through the listed FORGE coordination channel to request the approved supporting documentation.'
            : null,
        executiveSummary: `${projectNames[i]} is a fictional ${maturity.toLowerCase()} effort connecting units, evidence, and lessons around shared capability problems.`,
        detailedDescription: `The team is evaluating a maintainable solution approach, documenting technical results, limitations, and transition considerations for reuse across the capability network.`,
        solutionApproach:
          i === 0
            ? 'Use an additional airborne node to relay control and video around terrain masks.'
            : `Apply a focused ${tagNames[i % tagNames.length].toLowerCase()} approach with staged bench and field evaluation.`,
        status: statuses[i % statuses.length],
        maturity,
        completion,
        outcome:
          maturity === 'Validated'
            ? 'Validated result available'
            : maturity === 'Field Tested'
              ? 'Promising field result'
              : 'Evaluation ongoing',
        keyAdvantage:
          i === 0
            ? 'Extends connectivity around terrain limitations.'
            : 'Modular approach that can be evaluated independently.',
        keyLimitation:
          i === 0
            ? 'Requires an additional airborne node.'
            : 'Requires further integration and field evidence.',
        latestResult:
          maturity === 'Validated'
            ? 'Validated at two fictional sites.'
            : maturity === 'Field Tested'
              ? 'Successful repeatable field test.'
              : 'Prototype milestone completed.',
        startDate: d('2026-02-01'),
        expectedCompletionDate: d('2026-12-15'),
        leadUnitId: lead.id,
        problemLinks: {
          create: problemIndexes.map((index, linkIndex) => ({
            problemId: problems[index].id,
            isPrimary: linkIndex === 0,
          })),
        },
        unitLinks: {
          create: [
            { unitId: lead.id, role: 'Lead' },
            { unitId: units[(i + 1) % units.length].id, role: 'Supporting' },
            { unitId: units[(i + 2) % units.length].id, role: 'Testing' },
          ],
        },
        tags: {
          create: [
            { tagId: tags[i % tags.length].id },
            { tagId: tags[(i + 3) % tags.length].id },
          ],
        },
        locations: {
          create: [{ locationId: locations[i % locations.length].id }],
        },
        vendorDetail:
          solutionType === 'VENDOR_SOLUTION' || solutionType === 'HYBRID'
            ? {
                create: {
                  vendorName:
                    i === 3 ? 'Aegis Wave Systems' : 'Fictional Systems Group',
                  productName:
                    i === 3 ? 'RavenLink NR-4' : 'Commercial Evaluation Kit',
                  productUrl: 'https://example.invalid/vendor-product',
                  commercialAvailability: 'Commercially available',
                  estimatedUnitCost: 18500,
                  estimatedTotalCost: 92500,
                  procurementStatus: i === 3 ? 'Market research' : 'Planning',
                  evaluationStatus:
                    i === 3 ? 'Field evaluation' : 'Bench evaluation',
                  quantityEvaluated: 5,
                  evaluationObjective:
                    'Assess range, interoperability, operator workload, and sustainment burden.',
                  integrationRequirements:
                    'Existing power adapter and approved network configuration.',
                  sustainmentNotes:
                    'Vendor support plus unit-level spares package.',
                  evaluationResult:
                    'Improved link continuity during three fictional terrain runs.',
                  recommendation: 'Continue Evaluation',
                },
              }
            : undefined,
        tacticDetail:
          solutionType === 'TACTIC_TECHNIQUE' || solutionType === 'HYBRID'
            ? {
                create: {
                  techniqueTitle:
                    i === 7
                      ? 'Directional Antenna Employment Technique'
                      : 'Combined employment technique',
                  techniqueDescription:
                    'Reposition and orient the ground antenna using a repeatable terrain-aware planning card.',
                  conditionsForUse:
                    'Terrain masking or marginal link conditions.',
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
              }
            : undefined,
        trainingDetail:
          solutionType === 'TRAINING' || solutionType === 'HYBRID'
            ? {
                create: {
                  trainingObjective:
                    'Enable operators to plan RF paths and employ antennas consistently.',
                  intendedAudience: 'UAS operators and mission planners',
                  prerequisites: 'Basic system qualification',
                  trainingMethod: 'Classroom module followed by hands-on lane',
                  trainingMaterials:
                    'RF planning card, terrain vignettes, instructor guide',
                  validationMethod:
                    'Observed practical exercise and link-planning rubric',
                  observedEffect:
                    'Fewer avoidable antenna-placement errors during evaluation.',
                  recurringFrequency:
                    'Initial qualification and annual refresher',
                },
              }
            : undefined,
      },
    });
    projects.push(project);
    const phases = [];
    for (let phase = 0; phase < 2; phase++)
      phases.push(
        await db.projectPhase.create({
          data: {
            projectId: project.id,
            phaseName: phase === 0 ? 'Bench integration' : 'Field evaluation',
            objective:
              phase === 0
                ? 'Integrate and verify the prototype.'
                : 'Collect repeatable field evidence.',
            status:
              phase === 0
                ? 'Complete'
                : completion > 65
                  ? 'Complete'
                  : 'In Progress',
            completion: phase === 0 ? 100 : completion,
            executiveSummary:
              phase === 0
                ? 'Core components integrated.'
                : 'Field evidence collection underway.',
            technicalSummary:
              phase === 0
                ? 'Interfaces and power paths verified.'
                : 'Repeat runs recorded against the test plan.',
            result: phase === 0 ? 'Bench criteria met.' : project.latestResult,
            accomplishment: 'Reusable evidence recorded.',
            blocker:
              phase === 1 && completion < 50
                ? 'Additional test support required.'
                : null,
            risk: 'Integration complexity',
            nextAction: 'Review evidence and plan the next event.',
            sortOrder: phase + 1,
            startedAt: d(phase === 0 ? '2026-02-10' : '2026-06-01'),
            completedAt: phase === 0 ? d('2026-05-14') : null,
          },
        }),
      );
    await db.lessonLearned.create({
      data: {
        trackingId: tracking('LES', i + 1),
        title:
          i === 0
            ? 'Mounting position affects link stability'
            : `${projectNames[i]} integration lesson`,
        finding:
          i === 0
            ? 'Airframe shadowing was more significant than predicted.'
            : 'Early interface checks reduced field troubleshooting time.',
        recommendation:
          i === 0
            ? 'Elevate the relay mounting position and verify antenna clearance.'
            : 'Use the shared pre-field integration checklist.',
        date: d('2026-08-20'),
        projectId: project.id,
        phaseId: phases[1].id,
        unitId: lead.id,
        tags: { create: [{ tagId: tags[i % tags.length].id }] },
      },
    });
    await db.repositoryLink.create({
      data: {
        projectId: project.id,
        name: `${projectNames[i].toLowerCase().replaceAll(' ', '-')}-prototype`,
        url: `https://example.invalid/forge/project-${i + 1}`,
        description:
          'Fictional repository metadata for prototype demonstration.',
        artifactType: 'Repository',
        documentationAvailability: 'EXTERNAL_REFERENCE',
        includeInAiHandoff: true,
      },
    });
    if (i % 6 === 1)
      await db.helpRequest.create({
        data: {
          projectId: project.id,
          title: 'Integration support requested',
          description:
            'Seeking a fictional partner for the next evaluation event.',
        },
      });
  }

  for (let i = 0; i < 44; i++)
    await db.activityEvent.create({
      data: {
        timestamp: new Date(
          Date.UTC(2026, 8, 7, 12 - (i % 10), 0, 0) - i * 86400000,
        ),
        eventType:
          i % 4 === 0
            ? 'TEST_RESULT'
            : i % 4 === 1
              ? 'LESSON_ADDED'
              : i % 4 === 2
                ? 'PROJECT_UPDATED'
                : 'LINK_ADDED',
        description:
          i % 4 === 0
            ? `Field result recorded for ${projects[i % projects.length].name}`
            : i % 4 === 1
              ? `Lesson published by ${units[i % units.length].name}`
              : `Capability record updated for ${projects[i % projects.length].name}`,
        actor: 'Portal Analyst',
        projectId: projects[i % projects.length].id,
        problemId: problems[i % problems.length].id,
        unitId: units[i % units.length].id,
      },
    });

  await Promise.all(
    [
      ['Problem', 12],
      ['Project', 20],
      ['Unit', 12],
      ['Lesson', 20],
    ].map(([entity, value]) =>
      db.trackingCounter.create({
        data: { entity: String(entity), value: Number(value) },
      }),
    ),
  );
  console.log(
    `Seeded ${problems.length} problems, ${projects.length} projects, ${units.length} units, 40 phases, 20 lessons, and 44 activities.`,
  );
}

main().finally(() => db.$disconnect());
