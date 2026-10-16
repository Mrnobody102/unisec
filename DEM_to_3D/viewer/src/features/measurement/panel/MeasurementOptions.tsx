import type { Locale } from '../../../types/dear';
import type { MeasureMode } from '../core/geometry';
import type { MeasureUnits } from '../core/results';
import { measurementMessages } from '../locales';

type Props = {
  mode: MeasureMode; units: MeasureUnits; onUnits: (units: MeasureUnits) => void;
  snap: boolean; onSnap: (value: boolean) => void; labels: boolean; onLabels: (value: boolean) => void; locale: Locale;
};
export function MeasurementOptions({ mode, units, onUnits, snap, onSnap, labels, onLabels, locale }: Props) {
  const m = measurementMessages[locale];
  return <div className="measure-options">
    {!['location', 'angle'].includes(mode) && <label><span>{m.lengthUnits}</span><select value={units.distance} aria-label={m.lengthUnitsLabel} onChange={event => onUnits({ ...units, distance: event.target.value as MeasureUnits['distance'] })}><option value="auto">{m.automatic}</option><option value="m">m</option><option value="km">km</option></select></label>}
    {['area', 'radius'].includes(mode) && <label><span>{m.areaUnits}</span><select value={units.area} aria-label={m.areaUnitsLabel} onChange={event => onUnits({ ...units, area: event.target.value as MeasureUnits['area'] })}><option value="auto">{m.automatic}</option><option value="m2">m²</option><option value="ha">ha</option><option value="km2">km²</option></select></label>}
    <label className="measure-checkbox" title={m.snapTitle}><input type="checkbox" checked={snap} onChange={event => onSnap(event.target.checked)}/><span>{m.snap}</span></label>
    <label className="measure-checkbox"><input type="checkbox" checked={labels} onChange={event => onLabels(event.target.checked)}/><span>{m.showOnMap}</span></label>
    <dl className="measure-method"><div><dt>{m.method}</dt><dd>{mode === 'location' ? 'WGS84' : m.utmPlanar}</dd></div>{mode === 'bearing' && <div><dt>{m.referenceNorth}</dt><dd>{m.gridNorth}</dd></div>}</dl>
  </div>;
}
