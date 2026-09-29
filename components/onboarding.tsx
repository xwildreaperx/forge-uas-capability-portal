'use client';

import { useState } from 'react';
import { ArrowRight, ShieldCheck, UserRoundCheck } from 'lucide-react';

type UnitOption = {
  id: number;
  trackingId: string;
  name: string;
  abbreviation: string;
};

export function Onboarding({ units }: { units: UnitOption[] }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error || 'Unable to create your profile.');
      setSaving(false);
      return;
    }
    window.location.assign('/');
  };

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card">
        <div className="onboarding-intro">
          <div className="onboarding-mark"><ShieldCheck /></div>
          <p className="eyebrow">WELCOME TO FORGE</p>
          <h1>Set up your profile</h1>
          <p>
            Tell FORGE who you are, the position you serve in, and your primary
            Unit. You can start working immediately after this one-time setup.
          </p>
        </div>
        <form className="onboarding-form" onSubmit={submit}>
          <label>
            Name
            <input name="displayName" autoComplete="name" required />
          </label>
          <label>
            Work email or username
            <input name="identifier" autoComplete="username" required />
          </label>
          <label>
            Position or duty title
            <input name="title" placeholder="e.g. UAS Program Manager" required />
          </label>
          <label>
            Primary Unit
            <select name="unitId" required defaultValue="">
              <option value="" disabled>Select your Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.abbreviation})
                </option>
              ))}
            </select>
          </label>
          <label>
            FORGE user level
            <select name="role" defaultValue="CONTRIBUTOR">
              <option value="CONTRIBUTOR">Contributor — discover and submit knowledge</option>
              <option value="PROJECT_USER">Project User — create and maintain solution efforts</option>
              <option value="UNIT_ADMIN">Unit Administrator — manage your Unit workspace</option>
            </select>
          </label>
          <div className="onboarding-note">
            <UserRoundCheck />
            <p>
              Choose the level that matches your assigned responsibilities.
              System Administrator access is managed separately.
            </p>
          </div>
          {error && <p className="form-warning" role="alert">{error}</p>}
          <button className="create onboarding-submit" type="submit" disabled={saving || !units.length}>
            {saving ? 'Creating profile…' : 'Enter FORGE'} <ArrowRight />
          </button>
        </form>
      </section>
    </main>
  );
}
