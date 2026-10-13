import { accessMessages } from './locales';
import { useState } from 'react';
import type { Community, Locale } from '../../types/dear';
import type { DemoRole } from './demoSession';
import { UiIcon } from '../../shared/ui/UiIcon';
import './access.css';
export function DemoSignIn({
  locale,
  communities,
  onSignIn
}: {
  locale: Locale;
  communities: Array<Pick<Community, 'id' | 'name'>>;
  onSignIn: (role: DemoRole, name: string, communityId: string | null) => void;
}): JSX.Element {
  const m = accessMessages[locale];
  const [role, setRole] = useState<DemoRole>('resident'),
    [name, setName] = useState(''),
    [community, setCommunity] = useState('');
  return (
    <main className="demo-entry">
      <section className="demo-signin" aria-labelledby="demo-entry-title">
        <header>
          <span className="demo-brand">DEAR</span>
          <h1 id="demo-entry-title">{m.roadInformationAndDisasterResponse}</h1>
          <p>{m.simulatedSignInForTwoRolesSubmissions}</p>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSignIn(role, name, community || null);
          }}
        >
          <fieldset className="demo-role-options">
            <legend>{m.yourRole}</legend>
            <label>
              <input
                type="radio"
                name="role"
                value="resident"
                checked={role === 'resident'}
                onChange={() => setRole('resident')}
              />
              <span>
                <strong>{m.resident}</strong>
                <small>{m.viewRoadsAndSubmitFieldPhotosAnd}</small>
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="role"
                value="manager"
                checked={role === 'manager'}
                onChange={() => setRole('manager')}
              />
              <span>
                <strong>{m.responseCoordinator}</strong>
                <small>
                  {m.reviewReportsAssessAccessAndCoordinateResponse}
                </small>
              </span>
            </label>
          </fieldset>
          <label className="geodata-field">
            {m.displayName}
            <input
              required
              maxLength={160}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          {role === 'resident' && (
            <label className="geodata-field">
              {m.homeCommunityOptional}
              <select
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
              >
                <option value="">{m.notSelected}</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="button primary" type="submit">
            {m.enterApp}
          </button>
        </form>
      </section>
    </main>
  );
}
