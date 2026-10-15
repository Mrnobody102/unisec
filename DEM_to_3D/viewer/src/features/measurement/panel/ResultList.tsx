import type { Dispatch } from 'react';
import type { Locale } from '../../../types/dear';
import { UiIcon } from '../../../shared/ui/UiIcon';
import type { MeasureAction, MeasurementSession } from '../core/session';
import { measurementResults, modeName, type MeasureUnits } from '../core/results';
import { measurementMessages } from '../locales';

type Props = { session: MeasurementSession; dispatch: Dispatch<MeasureAction>; units: MeasureUnits; locale: Locale };

/** Every completed measurement; the one shown in the Measurement view is marked current. */
export function ResultList({ session, dispatch, units, locale }: Props): JSX.Element {
  const m = measurementMessages[locale];
  return <div className="measure-history">
    {!session.saved.length && <p className="measure-empty">{m.noResults}</p>}
    {session.saved.map(item => <div className="measure-history-row" key={item.id} data-active={item.id === session.activeId || undefined}>
      <label>
        <input type="checkbox" checked={item.visible} onChange={() => dispatch({ type: 'visible', id: item.id })}/>
        <span>
          <strong>{modeName(item.mode, locale)} {item.id}{item.id === session.activeId && <em>{m.current}</em>}</strong>
          <small>{measurementResults(item.mode, item.points, units, locale)[0]?.[1]}</small>
        </span>
      </label>
      <button className="icon-button" aria-label={m.deleteResult.replace('{n}', String(item.id))} onClick={() => dispatch({ type: 'delete', id: item.id })}><UiIcon name="trash" size={16}/></button>
    </div>)}
    {session.saved.length > 0 && <button className="text-button measure-feature" disabled={session.editing} onClick={() => dispatch({ type: 'reset' })}>{m.clearAll}</button>}
  </div>;
}
