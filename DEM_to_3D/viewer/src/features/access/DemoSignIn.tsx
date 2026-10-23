import {LanguageSwitch} from '../../shared/ui/LanguageSwitch';
import { accessMessages } from './locales';
import { useState } from 'react';
import type { Community, Locale } from '../../types/dear';
import { managerName, type DemoRole } from './demoSession';
import { UiIcon } from '../../shared/ui/UiIcon';
import './access.css';
export function DemoSignIn({
  locale,
  onChangeLocale,
  communities,
  onSignIn
}: {
  locale: Locale;
  onChangeLocale: (locale: Locale) => void;
  communities: Array<Pick<Community, 'id' | 'name'>>;
  onSignIn: (role: DemoRole, name: string, communityId: string | null) => void;
}): JSX.Element {
  const m = accessMessages[locale];
  const [role, setRole] = useState<DemoRole>('resident'),
    [name, setName] = useState('A Phủ'),
    [community, setCommunity] = useState('');
  return (
    <main className="demo-entry">
      <section className="demo-signin" aria-labelledby="demo-entry-title">
        <header>
          <div className="demo-entry-brand"><span className="demo-brand">DEAR</span><LanguageSwitch locale={locale} onChange={onChangeLocale}/></div>
          <h1 id="demo-entry-title">{m.roadInformationAndDisasterResponse}</h1>
          <p>{m.simulatedSignInForTwoRolesSubmissions}</p>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSignIn(role, role === 'manager' ? managerName : name.trim(), community || null);
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
          {role==='resident'&&<label className="geodata-field">
            {locale==='vi'?'Tên của bạn':'Your name'}
            <input
              required
              maxLength={160}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>}
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
