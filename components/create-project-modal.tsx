'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import type { PortalData } from '@/lib/data/types';
import { SOLUTION_TYPES } from '@/lib/domain/solution-types';
import { DOCUMENTATION_OPTIONS } from '@/lib/domain/documentation';

export function CreateProjectModal({
  data,
  onClose,
  onProblem,
  onCreated,
}: {
  data: PortalData;
  onClose: () => void;
  onProblem: () => void;
  onCreated: (id: string) => void;
}) {
  const [type, setType] = useState('ORGANIC_DEVELOPMENT');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const includesVendor = type === 'VENDOR_SOLUTION' || type === 'HYBRID';
  const includesTactic = type === 'TACTIC_TECHNIQUE' || type === 'HYBRID';
  const includesTraining = type === 'TRAINING' || type === 'HYBRID';
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="modal wide"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError('');
          const form = new FormData(e.currentTarget);
          const unitIds = form.getAll('unitIds').map(Number);
          const leadUnitId = Number(form.get('leadUnitId'));
          if (!unitIds.includes(leadUnitId)) unitIds.push(leadUnitId);
          const body = {
            name: form.get('name'),
            solutionType: type,
            executiveSummary: form.get('executiveSummary'),
            detailedDescription: form.get('detailedDescription'),
            solutionApproach: form.get('solutionApproach'),
            status: form.get('status'),
            maturity: form.get('maturity'),
            completion: form.get('completion'),
            leadUnitId,
            unitIds,
            problemIds: form.getAll('problemIds').map(Number),
            tags: form.getAll('tags'),
            locations: form.getAll('locations'),
            documentationAvailability: form.get('documentationAvailability'),
            executiveSummaryPlainLanguage: form.get(
              'executiveSummaryPlainLanguage',
            ),
            problemPlainLanguage: form.get('problemPlainLanguage'),
            solutionPlainLanguage: form.get('solutionPlainLanguage'),
            impactPlainLanguage: form.get('impactPlainLanguage'),
            aiContextNotes: form.get('aiContextNotes'),
            nextStep: form.get('nextStep'),
            keyRisk: form.get('keyRisk'),
            leadershipAction: form.get('leadershipAction'),
            originatorContact: form.get('originatorContact'),
            accessInstructions: form.get('accessInstructions'),
            vendor: {
              vendorName: form.get('vendorName'),
              productName: form.get('productName'),
              procurementStatus: form.get('procurementStatus'),
              evaluationStatus: form.get('evaluationStatus'),
              recommendation: form.get('recommendation'),
              estimatedUnitCost: form.get('estimatedUnitCost'),
            },
            tactic: {
              techniqueTitle: form.get('techniqueTitle'),
              techniqueDescription: form.get('techniqueDescription'),
              conditionsForUse: form.get('conditionsForUse'),
              demonstratedEffect: form.get('demonstratedEffect'),
              recommendation: form.get('recommendation'),
            },
            training: {
              trainingObjective: form.get('trainingObjective'),
              intendedAudience: form.get('intendedAudience'),
              trainingMethod: form.get('trainingMethod'),
              validationMethod: form.get('validationMethod'),
            },
          };
          try {
            const response = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body),
            });
            const item = (await response.json()) as {
              trackingId?: string;
              error?: string;
            };
            if (!response.ok || !item.trackingId)
              throw new Error(
                item.error || 'Unable to create solution effort.',
              );
            onCreated(item.trackingId);
          } catch (value) {
            setError(
              value instanceof Error
                ? value.message
                : 'Unable to create solution effort.',
            );
            setSaving(false);
          }
        }}
      >
        <button className="modal-x" type="button" onClick={onClose}>
          <X />
        </button>
        <div className="record-tabs">
          <button type="button" onClick={onProblem}>
            Problem
          </button>
          <button type="button" className="selected">
            Solution effort
          </button>
        </div>
        <p className="eyebrow">NEW RECORD</p>
        <h2>Create solution effort</h2>
        <p>
          Capture any pathway that addresses one or more capability problems.
        </p>
        <div className="security-callout">
          <strong>UNCLASSIFIED INFORMATION ONLY.</strong>
          <p>
            Capture only approved capability requirements and information
            appropriate for this environment. Do not include sensitive
            operational source context.
          </p>
        </div>
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Solution type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {SOLUTION_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Executive summary
          <textarea name="executiveSummary" required />
        </label>
        <label>
          Detailed description
          <textarea name="detailedDescription" required />
        </label>
        <label>
          Solution approach
          <textarea name="solutionApproach" required />
        </label>
        <fieldset>
          <legend>Executive communication</legend>
          <label>
            One-sentence summary
            <textarea name="executiveSummaryPlainLanguage" />
          </label>
          <label>
            The Problem in plain language
            <textarea name="problemPlainLanguage" />
          </label>
          <label>
            What we are doing
            <textarea name="solutionPlainLanguage" />
          </label>
          <label>
            Why it matters
            <textarea name="impactPlainLanguage" />
          </label>
          <label>
            Key risk
            <input name="keyRisk" />
          </label>
          <label>
            Next step
            <input name="nextStep" />
          </label>
          <label>
            Leadership action
            <input
              name="leadershipAction"
              placeholder="No leadership action required at this time."
            />
          </label>
        </fieldset>
        <fieldset>
          <legend>Knowledge and AI continuity</legend>
          <label>
            Documentation availability
            <select name="documentationAvailability">
              {DOCUMENTATION_OPTIONS.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Originator / contact
            <input name="originatorContact" />
          </label>
          <label>
            Access instructions
            <textarea name="accessInstructions" />
          </label>
          <label>
            AI Context Notes
            <textarea name="aiContextNotes" />
            <small>
              Do not enter classified source context, secrets, or intentionally
              withheld technical details.
            </small>
          </label>
        </fieldset>
        <div className="form-grid">
          <label>
            Status
            <select name="status">
              <option>Planning</option>
              <option>Active</option>
              <option>Transitioning</option>
            </select>
          </label>
          <label>
            Maturity
            <select name="maturity">
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
              defaultValue="0"
            />
          </label>
        </div>
        <fieldset>
          <legend>Problems addressed</legend>
          {data.problems.map((p) => (
            <label className="checkline" key={p.id}>
              <input type="checkbox" name="problemIds" value={p.dbId} />
              {p.id} · {p.title}
            </label>
          ))}
        </fieldset>
        <label>
          Lead unit
          <select name="leadUnitId">
            {data.units.map((u) => (
              <option key={u.id} value={u.dbId}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Participating units</legend>
          {data.units.map((u) => (
            <label className="checkline" key={u.id}>
              <input type="checkbox" name="unitIds" value={u.dbId} />
              {u.name}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Capabilities / tags</legend>
          {[
            ...new Set([
              ...data.projects.flatMap((p) => p.tags),
              ...data.problems.flatMap((p) => p.tags),
            ]),
          ].map((tag) => (
            <label className="checkline" key={tag}>
              <input type="checkbox" name="tags" value={tag} />
              {tag}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Locations</legend>
          {[...new Set(data.units.map((u) => u.location))].map((location) => (
            <label className="checkline" key={location}>
              <input type="checkbox" name="locations" value={location} />
              {location}
            </label>
          ))}
        </fieldset>
        {includesVendor && (
          <fieldset>
            <legend>Vendor evaluation</legend>
            <label>
              Vendor name
              <input required name="vendorName" />
            </label>
            <label>
              Product name
              <input required name="productName" />
            </label>
            <label>
              Estimated unit cost
              <input name="estimatedUnitCost" type="number" />
            </label>
            <label>
              Procurement status
              <input name="procurementStatus" />
            </label>
            <label>
              Evaluation status
              <input name="evaluationStatus" />
            </label>
            <label>
              Recommendation
              <input name="recommendation" />
            </label>
          </fieldset>
        )}
        {includesTactic && (
          <fieldset>
            <legend>Tactic / technique</legend>
            <label>
              Technique title
              <input required name="techniqueTitle" />
            </label>
            <label>
              Description
              <textarea required name="techniqueDescription" />
            </label>
            <label>
              Conditions for use
              <input name="conditionsForUse" />
            </label>
            <label>
              Demonstrated effect
              <input name="demonstratedEffect" />
            </label>
          </fieldset>
        )}
        {includesTraining && (
          <fieldset>
            <legend>Training package</legend>
            <label>
              Training objective
              <input required name="trainingObjective" />
            </label>
            <label>
              Intended audience
              <input required name="intendedAudience" />
            </label>
            <label>
              Training method
              <input name="trainingMethod" />
            </label>
            <label>
              Validation method
              <input name="validationMethod" />
            </label>
          </fieldset>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="create" disabled={saving}>
            {saving ? 'Creating…' : 'Create solution effort'}
          </button>
        </div>
      </form>
    </div>
  );
}
