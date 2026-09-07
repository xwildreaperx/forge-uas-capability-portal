'use client';
import { useState } from 'react';
import type { PortalProject } from '@/lib/data/types';
import { DOCUMENTATION_OPTIONS } from '@/lib/domain/documentation';

type Action = 'edit' | 'phase' | 'lesson' | 'repository' | null;
export function ProjectActions({ project }: { project: PortalProject }) {
  const [action, setAction] = useState<Action>(null);
  const [error, setError] = useState('');
  const submit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!action) return;
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const suffix =
      action === 'edit'
        ? ''
        : action === 'phase'
          ? '/phases'
          : action === 'lesson'
            ? '/lessons'
            : '/repositories';
    const response = await fetch(`/api/projects/${project.id}${suffix}`, {
      method: action === 'edit' ? 'PATCH' : 'POST',
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
        {(['edit', 'phase', 'lesson', 'repository'] as const).map((value) => (
          <button
            className="secondary"
            key={value}
            onClick={() => setAction(action === value ? null : value)}
          >
            {value === 'edit'
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
          {action === 'edit' && (
            <>
              <label>
                Status
                <select name="status" defaultValue={project.status}>
                  <option>Planning</option>
                  <option>Active</option>
                  <option>Transitioning</option>
                </select>
              </label>
              <label>
                Maturity
                <select name="maturity" defaultValue={project.maturity}>
                  <option>Concept</option>
                  <option>Prototype</option>
                  <option>Field Tested</option>
                  <option>Validated</option>
                </select>
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
                Outcome
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
          {action === 'lesson' && (
            <>
              <label>
                Title
                <input name="title" required />
              </label>
              <label>
                Finding
                <textarea name="finding" required />
              </label>
              <label>
                Recommendation
                <textarea name="recommendation" required />
              </label>
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
