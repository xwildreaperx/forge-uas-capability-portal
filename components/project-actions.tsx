'use client';
import { useMemo, useState } from 'react';
import type { PortalData, PortalProject } from '@/lib/data/types';
import { DOCUMENTATION_OPTIONS } from '@/lib/domain/documentation';
import { findProjectsForProblems } from '@/lib/domain/matching';

type Action = 'update' | 'edit' | 'team' | 'relationships' | 'phase' | 'phase_edit' | 'lesson' | 'repository' | 'closeout' | null;
export function ProjectActions({ project, data, canManageTeam }: { project: PortalProject; data: PortalData; canManageTeam: boolean }) {
  const [action, setAction] = useState<Action>(null);
  const [error, setError] = useState('');
  const [problemSearch, setProblemSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const initialLeadUnitId = data.units.find((unit) => unit.id === project.unitId)?.dbId ?? 0;
  const [leadUnitId, setLeadUnitId] = useState(initialLeadUnitId);
  const [selectedPhaseId, setSelectedPhaseId] = useState(project.phases[0]?.id ?? 0);
  const selectedPhase = project.phases.find((phase) => phase.id === selectedPhaseId);
  const [selectedProblemIds, setSelectedProblemIds] = useState(
    data.problems.filter((problem) => project.problems.some((item) => item.id === problem.id)).map((problem) => problem.dbId),
  );
  const [selectedUnitIds, setSelectedUnitIds] = useState(
    data.units.filter((unit) => project.units.some((item) => item.id === unit.id)).map((unit) => unit.dbId),
  );
  const [unitRoles, setUnitRoles] = useState<Record<number, string>>(
    Object.fromEntries(data.units.map((unit) => [unit.dbId, project.units.find((item) => item.id === unit.id)?.role === 'Testing' ? 'Testing' : 'Supporting'])),
  );
  const relatedEfforts = useMemo(
    () => findProjectsForProblems(
      data.problems.filter((problem) => selectedProblemIds.includes(problem.dbId)).map((problem) => problem.id),
      data.projects.filter((item) => item.id !== project.id),
    ),
    [data, project.id, selectedProblemIds],
  );
  const submit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!action) return;
    const form = new FormData(e.currentTarget);
    let values: Record<string, unknown> = Object.fromEntries(form);
    if (action === 'relationships') {
      values = {
        ...values,
        leadUnitId,
        problemIds: selectedProblemIds,
        unitIds: selectedUnitIds,
        unitRoles,
      };
    }
    const suffix =
      action === 'edit'
        ? ''
        : action === 'update'
          ? '/updates'
        : action === 'closeout'
          ? '/closeout'
        : action === 'team'
          ? '/team'
          : action === 'relationships'
            ? '/relationships'
        : action === 'phase'
          ? '/phases'
          : action === 'phase_edit'
            ? `/phases/${selectedPhaseId}`
          : action === 'lesson'
            ? '/lessons'
            : '/repositories';
    const response = await fetch(`/api/projects/${project.id}${suffix}`, {
      method: ['edit', 'team', 'relationships', 'phase_edit'].includes(action) ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error || 'Unable to save.');
      return;
    }
    window.location.reload();
  };
  return (
    <div className="project-actions">
      <div>
          {(['update', 'edit', ...(canManageTeam ? ['team' as const] : []), 'relationships', 'phase', ...(project.phases.length ? ['phase_edit' as const] : []), 'lesson', 'repository', 'closeout'] as const).map((value) => (
          <button
            className={value === 'update' ? 'create' : 'secondary'}
            key={value}
            onClick={() => setAction(action === value ? null : value)}
          >
            {value === 'update'
              ? 'Add Project Update'
              : value === 'team'
                ? 'Manage Team'
                : value === 'relationships'
                  ? 'Manage Relationships'
                : value === 'phase_edit'
                  ? 'Progress phase'
                : value === 'closeout'
                  ? 'Close Out Project'
              : value === 'edit'
              ? 'Edit effort'
              : value === 'phase'
                ? 'Add phase'
                : value === 'lesson'
                  ? 'Add lesson'
                  : 'Add repository'}
          </button>
        ))}
      </div>
      {action && (
        <form className="quick-form" onSubmit={submit}>
          <p className="form-security">
            <strong>UNCLASSIFIED INFORMATION ONLY.</strong> Enter only approved
            capability abstractions and technical information appropriate for
            this environment.
          </p>
          {action === 'update' && (
            <>
              <div className="update-form-intro wide-field">
                <strong>Record progress once.</strong>
                <span>This update will refresh Project history, Latest Result, freshness, and AI Handoff.</span>
              </div>
              <label className="wide-field">
                Update summary
                <textarea name="summary" required placeholder="What happened?" />
              </label>
              <label className="wide-field">
                Result / finding
                <textarea name="result" required placeholder="What changed, worked, failed, or was learned?" />
              </label>
              <label className="wide-field">
                Next step
                <textarea name="nextStep" required placeholder="What happens next?" />
              </label>
              <label>
                Blocker / risk <small>Optional</small>
                <textarea name="blockerRisk" placeholder="What is preventing or threatening progress?" />
              </label>
              <label>
                Associated phase <small>Optional</small>
                <select name="phaseId" defaultValue="">
                  <option value="">No phase selected</option>
                  {project.phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>{phase.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input name="occurredAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>
              <label>
                Status change <small>Optional</small>
                <select name="status" defaultValue="">
                  <option value="">Keep {project.status}</option>
                  <option>Planning</option>
                  <option>Active</option>
                  <option>Transitioning</option>
                  <option>Paused</option>
                </select>
              </label>
              <label>
                Maturity change <small>Optional</small>
                <select name="maturity" defaultValue="">
                  <option value="">Keep {project.maturity}</option>
                  <option>Concept</option>
                  <option>Prototype</option>
                  <option>Field Tested</option>
                  <option>Validated</option>
                </select>
              </label>
              <label>
                Completion change <small>Optional</small>
                <input name="completion" type="number" min="0" max="100" placeholder={`${project.progress}% currently`} />
              </label>
              <fieldset className="wide-field update-integration">
                <legend>Apply this Update to the selected Phase <small>Optional</small></legend>
                <label>Phase status<select name="phaseStatus" defaultValue=""><option value="">No change</option><option>Planned</option><option>In Progress</option><option>Complete</option></select></label>
                <label>Phase completion<input name="phaseCompletion" type="number" min="0" max="100" /></label>
                <label className="checkline"><input type="checkbox" name="updatePhaseResult" value="true" />Use this result as the Phase result</label>
                <label className="checkline"><input type="checkbox" name="updatePhaseRisk" value="true" />Use this blocker/risk in the Phase</label>
                <label className="checkline"><input type="checkbox" name="updatePhaseNextAction" value="true" />Use this next step as the Phase next action</label>
              </fieldset>
              <fieldset className="wide-field update-integration">
                <legend>Maturity evidence <small>Required when advancing to Field Tested or Validated</small></legend>
                <label>Supporting event / evaluation<input name="maturityEvidenceEvent" placeholder="Field event, test, or evaluation" /></label>
                <label>Evidence date<input name="maturityEvidenceDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
                <label>Artifact / reference <small>Optional</small><input name="maturityEvidenceReference" placeholder="Approved reference or access pointer" /></label>
              </fieldset>
              <fieldset className="wide-field update-integration">
                <legend>Save this finding as a Lesson <small>Optional</small></legend>
                <label className="checkline"><input type="checkbox" name="saveAsLesson" value="true" />Create a relational Lesson from this Update</label>
                <label>Lesson Type<select name="lessonType" defaultValue="CONFIRMED_FINDING"><option value="CONFIRMED_FINDING">Confirmed Finding</option><option value="WORKING_HYPOTHESIS">Working Hypothesis</option><option value="FAILED_APPROACH">Failed Approach</option><option value="RECOMMENDATION">Recommendation</option><option value="UNRESOLVED_QUESTION">Unresolved Question</option></select></label>
                <label>Lesson title<input name="lessonTitle" placeholder="Review and name the finding" /></label>
                <label>Recommendation <small>Optional</small><input name="lessonRecommendation" /></label>
              </fieldset>
              <p className="update-author wide-field">Author is recorded from your current FORGE identity.</p>
            </>
          )}
          {action === 'team' && (
            <>
              <div className="wide-field update-form-intro">
                <strong>Manage current responsibility.</strong>
                <span>Historical updates and attribution remain unchanged.</span>
              </div>
              <div className="team-roster wide-field">
                {project.team.map((member) => (
                  <div key={member.userId}>
                    <strong>{member.displayName}</strong>
                    <span>{member.role === 'PROJECT_LEAD' ? 'Project Lead' : 'Contributor'} · {member.primaryUnit}</span>
                    {member.status !== 'ACTIVE' && <b>Inactive account</b>}
                  </div>
                ))}
              </div>
              <label>
                Action
                <select name="operation" required defaultValue="ADD_CONTRIBUTOR">
                  <option value="ADD_CONTRIBUTOR">Add Contributor</option>
                  <option value="REMOVE_CONTRIBUTOR">Remove Contributor</option>
                  <option value="CHANGE_LEAD">Change Project Lead</option>
                </select>
              </label>
              <label className="wide-field">
                User
                <select name="userId" required defaultValue="">
                  <option value="" disabled>Select an active FORGE user</option>
                  {data.projectDirectoryUsers.filter((user) => user.status === 'ACTIVE').map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName} · {user.primaryUnit}{project.units.some((unit) => unit.name === user.primaryUnit) ? ' · Participating Unit' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {action === 'relationships' && (
            <>
              <div className="wide-field update-form-intro">
                <strong>Manage organizational relationships.</strong>
                <span>Problems and Units can evolve without recreating this Project.</span>
              </div>
              <fieldset className="relationship-picker wide-field">
                <legend>Problems addressed</legend>
                <input aria-label="Search Problems" placeholder="Search by Problem ID, title, or category" value={problemSearch} onChange={(event) => setProblemSearch(event.target.value)} />
                {data.problems.filter((problem) => `${problem.id} ${problem.title} ${problem.category}`.toLowerCase().includes(problemSearch.toLowerCase())).map((problem) => (
                  <label className="checkline" key={problem.id}>
                    <input type="checkbox" name="problemIds" value={problem.dbId} checked={selectedProblemIds.includes(problem.dbId)} onChange={(event) => setSelectedProblemIds((current) => event.target.checked ? [...current, problem.dbId] : current.filter((id) => id !== problem.dbId))} />
                    {problem.id} · {problem.title} <small>{problem.category}</small>
                  </label>
                ))}
              </fieldset>
              <label>
                Primary Problem
                <select name="primaryProblemId" required defaultValue={data.problems.find((problem) => project.problems.find((item) => item.id === problem.id)?.isPrimary)?.dbId}>
                  {data.problems.filter((problem) => selectedProblemIds.includes(problem.dbId)).map((problem) => <option key={problem.id} value={problem.dbId}>{problem.id} · {problem.title}</option>)}
                </select>
              </label>
              <section className="existing-work-panel wide-field">
                <h3>Other Solution Efforts Addressing These Problems</h3>
                <p>Parallel work remains allowed. These records are shown for awareness.</p>
                {relatedEfforts.length ? relatedEfforts.map((effort) => <a key={effort.id} href={`/projects/${effort.id}`} target="_blank" rel="noreferrer">{effort.id} · {effort.name} · {effort.unit}</a>) : <small>No other linked efforts found.</small>}
              </section>
              <label>
                Lead Unit
                <input aria-label="Search Lead Units" placeholder="Search by Unit ID, name, or abbreviation" value={unitSearch} onChange={(event) => setUnitSearch(event.target.value)} />
                <select name="leadUnitId" required value={leadUnitId} onChange={(event) => setLeadUnitId(Number(event.target.value))}>
                  {data.units.filter((unit) => unit.dbId === leadUnitId || `${unit.id} ${unit.name} ${unit.abbreviation}`.toLowerCase().includes(unitSearch.toLowerCase())).map((unit) => <option key={unit.id} value={unit.dbId}>{unit.id} · {unit.name}</option>)}
                </select>
                <small>The Lead Unit is automatically retained as a participating Unit.</small>
              </label>
              <fieldset className="relationship-picker wide-field">
                <legend>Participating Units</legend>
                <input aria-label="Search Units" placeholder="Search by Unit ID, name, or abbreviation" value={unitSearch} onChange={(event) => setUnitSearch(event.target.value)} />
                {data.units.filter((unit) => `${unit.id} ${unit.name} ${unit.abbreviation}`.toLowerCase().includes(unitSearch.toLowerCase())).map((unit) => {
                  const isLead = unit.dbId === leadUnitId;
                  const selected = isLead || selectedUnitIds.includes(unit.dbId);
                  return <div className="relationship-unit" key={unit.id}>
                    <label className="checkline">
                      <input type="checkbox" name="unitIds" value={unit.dbId} checked={selected} disabled={isLead} onChange={(event) => setSelectedUnitIds((current) => event.target.checked ? [...current, unit.dbId] : current.filter((id) => id !== unit.dbId))} />
                      {unit.id} · {unit.name}
                    </label>
                    {isLead ? <small>Lead</small> : selected && <select value={unitRoles[unit.dbId]} onChange={(event) => setUnitRoles((current) => ({ ...current, [unit.dbId]: event.target.value }))}><option>Supporting</option><option>Testing</option></select>}
                  </div>;
                })}
              </fieldset>
            </>
          )}
          {action === 'edit' && (
            <>
              <label>
                Status
                <select name="status" defaultValue={project.status}>
                  <option>Planning</option>
                  <option>Active</option>
                  <option>Transitioning</option>
                  <option>Paused</option>
                </select>
                <small>Lifecycle state: Planning, underway, paused, or transitioning. Use Close Out Project for terminal states.</small>
              </label>
              <label>
                Maturity
                <select name="maturity" defaultValue={project.maturity}>
                  <option>Concept</option>
                  <option>Prototype</option>
                  <option>Field Tested</option>
                  <option>Validated</option>
                </select>
                <small>FORGE knowledge maturity: Concept, working Prototype, representative Field Test, or evidence-supported Validation—not formal certification.</small>
              </label>
              <label>
                Completion
                <input
                  name="completion"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={project.progress}
                />
              </label>
              <label>
                Outcome context
                <input name="outcome" defaultValue={project.outcome} />
              </label>
              <label>
                One-sentence executive summary
                <textarea
                  name="executiveSummaryPlainLanguage"
                  defaultValue={project.executiveSummaryPlainLanguage}
                />
              </label>
              <label>
                Problem in plain language
                <textarea
                  name="problemPlainLanguage"
                  defaultValue={project.problemPlainLanguage}
                />
              </label>
              <label>
                Solution in plain language
                <textarea
                  name="solutionPlainLanguage"
                  defaultValue={project.solutionPlainLanguage}
                />
              </label>
              <label>
                Why it matters
                <textarea
                  name="impactPlainLanguage"
                  defaultValue={project.impactPlainLanguage}
                />
              </label>
              <label>
                Key risk
                <input name="keyRisk" defaultValue={project.keyRisk} />
              </label>
              <label>
                Next step
                <input name="nextStep" defaultValue={project.nextStep} />
              </label>
              <label>
                Leadership action
                <input
                  name="leadershipAction"
                  defaultValue={project.leadershipAction}
                />
              </label>
              <label>
                Documentation availability
                <select
                  name="documentationAvailability"
                  defaultValue={project.documentationAvailability}
                >
                  {DOCUMENTATION_OPTIONS.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Originator / contact
                <input
                  name="originatorContact"
                  defaultValue={project.originatorContact}
                />
              </label>
              <label>
                Access instructions
                <textarea
                  name="accessInstructions"
                  defaultValue={project.accessInstructions}
                />
              </label>
              <label className="wide-field">
                AI Context Notes
                <textarea
                  name="aiContextNotes"
                  defaultValue={project.aiContextNotes}
                />
                <small>
                  Do not include classified source context, secrets,
                  credentials, or information withheld from FORGE.
                </small>
              </label>
              <label>
                Architecture summary
                <textarea
                  name="architectureSummary"
                  defaultValue={project.architectureSummary}
                />
              </label>
              <label>
                Methodology
                <textarea
                  name="methodologySummary"
                  defaultValue={project.methodologySummary}
                />
              </label>
              <label>
                Major decisions
                <textarea
                  name="decisionsSummary"
                  defaultValue={project.decisionsSummary}
                />
              </label>
              <label>
                Open issues
                <textarea name="openIssues" defaultValue={project.openIssues} />
              </label>
            </>
          )}
          {action === 'phase' && (
            <>
              <label>
                Phase name
                <input name="phaseName" required />
              </label>
              <label>
                Objective
                <input name="objective" required />
              </label>
              <label>
                Executive summary
                <input name="executiveSummary" required />
              </label>
              <label>
                Technical summary
                <input name="technicalSummary" required />
              </label>
              <input type="hidden" name="status" value="Planned" />
              <input type="hidden" name="completion" value="0" />
              <input
                type="hidden"
                name="sortOrder"
                value={project.phases.length + 1}
              />
            </>
          )}
          {action === 'phase_edit' && selectedPhase && (
            <>
              <div className="wide-field update-form-intro"><strong>Progress an existing Phase.</strong><span>Phase state is distinct from overall Project status, maturity, completion, and outcome.</span></div>
              <label className="wide-field">Phase<select value={selectedPhaseId} onChange={(event) => setSelectedPhaseId(Number(event.target.value))}>{project.phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.name}</option>)}</select></label>
              <label>Phase name<input name="phaseName" defaultValue={selectedPhase.name} required /></label>
              <label>Status<select name="status" defaultValue={selectedPhase.status}><option>Planned</option><option>In Progress</option><option>Complete</option></select></label>
              <label>Completion<input name="completion" type="number" min="0" max="100" defaultValue={selectedPhase.completion} /></label>
              <label>Start date<input name="startedAt" type="date" defaultValue={selectedPhase.startedAt.slice(0, 10)} /></label>
              <label>End date<input name="completedAt" type="date" defaultValue={selectedPhase.completedAt.slice(0, 10)} /></label>
              <label className="wide-field">Objective<textarea name="objective" defaultValue={selectedPhase.objective} /></label>
              <label>Executive summary<textarea name="executiveSummary" defaultValue={selectedPhase.executiveSummary} /></label>
              <label>Technical summary<textarea name="technicalSummary" defaultValue={selectedPhase.summary} /></label>
              <label>Result<textarea name="result" defaultValue={selectedPhase.result} /></label>
              <label>Key accomplishment<textarea name="accomplishment" defaultValue={selectedPhase.accomplishment} /></label>
              <label>Blocker<textarea name="blocker" defaultValue={selectedPhase.blocker} /></label>
              <label>Risk<textarea name="risk" defaultValue={selectedPhase.risk} /></label>
              <label>Next action<textarea name="nextAction" defaultValue={selectedPhase.nextAction} /></label>
            </>
          )}
          {action === 'lesson' && (
            <>
              <label>
                Title
                <input name="title" required />
              </label>
              <label>Lesson Type<select name="lessonType" defaultValue="CONFIRMED_FINDING"><option value="CONFIRMED_FINDING">Confirmed Finding</option><option value="WORKING_HYPOTHESIS">Working Hypothesis</option><option value="FAILED_APPROACH">Failed Approach</option><option value="RECOMMENDATION">Recommendation</option><option value="UNRESOLVED_QUESTION">Unresolved Question</option></select></label>
              <label>Associated Phase <small>Optional</small><select name="phaseId" defaultValue=""><option value="">No Phase selected</option>{project.phases.map((phase) => <option value={phase.id} key={phase.id}>{phase.name}</option>)}</select></label>
              <label>
                Finding
                <textarea name="finding" required />
              </label>
              <label>
                Recommendation
                <textarea name="recommendation" />
              </label>
            </>
          )}
          {action === 'closeout' && (
            <>
              <div className="wide-field closeout-review"><strong>Closeout preserves institutional knowledge—it does not close any related Problem.</strong><p>{project.id} · {project.name}<br />Problems: {project.problems.map((problem) => problem.id).join(', ')} · Lead Unit: {project.unit}<br />Maturity: {project.maturity} · Completion: {project.progress}% · Lessons: {project.lessons.length}</p>{!project.latestResult && <p>Review note: no final/latest result is recorded.</p>}{!project.lessons.length && <p>Review note: no Lessons are recorded.</p>}{project.phases.some((phase) => phase.status !== 'Complete') && <p>Review note: unfinished Phases will remain unchanged.</p>}{project.openHelpRequestCount > 0 && <p>Review note: {project.openHelpRequestCount} open Help Request{project.openHelpRequestCount === 1 ? '' : 's'} will remain open.</p>}</div>
              <label>Final status<select name="status" required defaultValue="Completed"><option>Completed</option><option>Cancelled</option><option>Superseded</option></select></label>
              <label>Outcome / disposition<select name="outcomeDisposition" required><option value="SUCCESSFUL">Successful</option><option value="PARTIALLY_SUCCESSFUL">Partially Successful</option><option value="UNSUCCESSFUL">Unsuccessful</option><option value="INCONCLUSIVE">Inconclusive</option><option value="SUPERSEDED">Superseded</option><option value="CANCELLED">Cancelled</option></select></label>
              <label className="wide-field">Final result<textarea name="finalResult" required defaultValue={project.latestResult} /></label>
              <label>What worked<textarea name="whatWorked" /></label><label>What did not work<textarea name="whatDidNotWork" /></label>
              <label className="wide-field">Recommended next action<textarea name="recommendedNextAction" defaultValue={project.nextStep} /></label>
              <label>Outcome context <small>Optional</small><textarea name="outcomeNarrative" defaultValue={project.outcome} /></label>
              <label>Successor Project <small>Optional</small><select name="successorProjectId" defaultValue=""><option value="">No successor recorded</option>{data.projects.filter((item) => item.dbId !== project.dbId).map((item) => <option key={item.id} value={item.dbId}>{item.id} · {item.name}</option>)}</select></label>
              <label>Final completion <small>Optional</small><input name="completion" type="number" min="0" max="100" defaultValue={project.progress} /></label>
              <label>Closeout date<input name="closedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
              <label>Documentation availability<select name="documentationAvailability" defaultValue={project.documentationAvailability}>{DOCUMENTATION_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <p className="wide-field update-author">Before saving, consider what another Unit should avoid repeating, what remains unresolved, and where supporting knowledge can be obtained. Unfinished Phases and open Help Requests remain preserved.</p>
            </>
          )}
          {action === 'repository' && (
            <>
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                URL
                <input name="url" type="url" required />
              </label>
              <label>
                Description
                <input name="description" required />
              </label>
              <label>
                Artifact type
                <input
                  name="artifactType"
                  placeholder="Repository, report, dataset…"
                />
              </label>
              <label>
                Documentation availability
                <select
                  name="documentationAvailability"
                  defaultValue="EXTERNAL_REFERENCE"
                >
                  {DOCUMENTATION_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <input type="hidden" name="includeInAiHandoff" value="false" />
              <label className="checkline">
                <input
                  type="checkbox"
                  name="includeInAiHandoff"
                  value="true"
                  defaultChecked
                />{' '}
                Include metadata in AI Handoff
              </label>
              <p className="form-security">
                <strong>Do not upload classified material.</strong> FORGE does
                not inspect files or determine classification. This prototype
                stores reference metadata only.
              </p>
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          <div>
            <button className="create">Save</button>
            <button
              className="secondary"
              type="button"
              onClick={() => setAction(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
