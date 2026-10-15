import { useState } from 'react';
import type { Locale } from '../../../types/dear';
import { UiIcon } from '../../../shared/ui/UiIcon';
import { parseCoordinatePair } from '../../geodata/coordinatePair';
import { measurementPoint, type MeasurePoint, type SketchMode } from '../core/geometry';
import type { MeasureUnits } from '../core/results';
import { vertexTable } from '../core/vertices';
import { measurementMessages } from '../locales';

type Props = {
  mode: SketchMode; points: MeasurePoint[]; selected: number | null; units: MeasureUnits; locale: Locale;
  onSelect: (index: number | null) => void; onRemove: (index: number) => void;
  onMove: (index: number, point: MeasurePoint) => void; onHover: (index: number | null) => void;
};

/** Every vertex with its coordinates and lengths. Rows and map vertices select each other. */
export function VertexTable({ mode, points, selected, units, locale, onSelect, onRemove, onMove, onHover }: Props): JSX.Element | null {
  const m = measurementMessages[locale];
  const [editing, setEditing] = useState<{ index: number; text: string; invalid: boolean } | null>(null);
  if (!points.length) return null;
  const { rows, closing } = vertexTable(mode, points, units, locale);
  const lengths = rows.some(row => row.segment), totals = rows.some(row => row.total);
  const name = (template: string, label: string) => template.replace('{n}', label);
  const commit = () => {
    if (!editing) return;
    const pair = parseCoordinatePair(editing.text);
    const point = pair && measurementPoint(pair.latitude, pair.longitude);
    if (!point) { setEditing({ ...editing, invalid: true }); return; }
    onMove(editing.index, point);
    setEditing(null);
  };
  return <div className="vertex-table">
    <table aria-label={m.vertices}>
      <thead><tr>
        <th scope="col">{m.vertex}</th><th scope="col">{m.coordinates}</th>
        {lengths && <th scope="col">{m.segment}</th>}{totals && <th scope="col">{m.total}</th>}
        <th scope="col"><span className="vertex-table-hidden">{m.removeVertex.replace(' {n}', '')}</span></th>
      </tr></thead>
      <tbody>{rows.map(row => <tr key={row.index} data-selected={row.index === selected || undefined}
        onPointerEnter={() => onHover(row.index)} onPointerLeave={() => onHover(null)}>
        <th scope="row"><button type="button" className="vertex-select" aria-pressed={row.index === selected}
          aria-label={name(m.selectVertex, row.label)} onClick={() => onSelect(row.index === selected ? null : row.index)}>{row.label}</button></th>
        <td>{editing?.index === row.index
          ? <input className="vertex-coordinate-input" autoFocus aria-label={name(m.editCoordinates, row.label)} aria-invalid={editing.invalid || undefined}
              value={editing.text} spellCheck={false}
              onChange={event => setEditing({ ...editing, text: event.target.value, invalid: false })}
              onBlur={() => setEditing(null)}
              onKeyDown={event => {
                // Keys belong to the field, not to the map tool behind it.
                event.stopPropagation();
                if (event.key === 'Enter') { event.preventDefault(); commit(); }
                if (event.key === 'Escape') { event.preventDefault(); setEditing(null); }
              }}/>
          : <button type="button" className="vertex-coordinate" title={name(m.editCoordinates, row.label)}
              aria-label={`${name(m.editCoordinates, row.label)}: ${row.point.lat.toFixed(5)}, ${row.point.lng.toFixed(5)}`}
              onClick={() => setEditing({ index: row.index, text: `${row.point.lat.toFixed(6)}, ${row.point.lng.toFixed(6)}`, invalid: false })}>
              {row.point.lat.toFixed(5)}, {row.point.lng.toFixed(5)}</button>}</td>
        {lengths && <td>{row.segment ?? '—'}</td>}{totals && <td>{row.total ?? '—'}</td>}
        <td><button type="button" className="icon-button vertex-remove" aria-label={name(m.removeVertex, row.label)} title={name(m.removeVertex, row.label)}
          onClick={() => onRemove(row.index)}><UiIcon name="trash" size={16}/></button></td>
      </tr>)}</tbody>
      {closing && <tfoot><tr><th scope="row" colSpan={2}>{m.closingEdge}</th><td>{closing}</td><td/></tr></tfoot>}
    </table>
    {editing?.invalid && <p className="vertex-table-error" role="alert">{m.invalidCoordinate}</p>}
  </div>;
}
