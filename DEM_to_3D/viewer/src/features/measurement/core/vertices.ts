import type { Locale } from '../../../types/dear';
import { measurementMessages } from '../locales';
import { horizontalLength, type MeasurePoint, type SketchMode } from './geometry';
import { formatDistance, type MeasureUnits } from './results';

export type VertexRow = { index: number; label: string; point: MeasurePoint; segment?: string; total?: string };
export type VertexTable = { rows: VertexRow[]; closing?: string };

/** Rows for the vertex table: role names for fixed-point modes, segment and running lengths for lines. */
export function vertexTable(mode: SketchMode, points: MeasurePoint[], units: MeasureUnits, locale: Locale): VertexTable {
  const m = measurementMessages[locale];
  const roles: Partial<Record<SketchMode, string[]>> = {
    radius: [m.centre, m.edge], bearing: [m.origin, m.target], angle: ['1', m.apex, '3'],
    location: [m.position], rectangle: [m.corner + ' 1', m.corner + ' 2']
  };
  const lengths = mode === 'distance' || mode === 'area';
  let running = 0;
  const rows = points.map((point, index): VertexRow => {
    const step = index ? horizontalLength([points[index - 1], point]) : 0;
    running += step;
    return { index, point, label: roles[mode]?.[index] ?? String(index + 1),
      segment: lengths && index ? formatDistance(step, units, locale) : undefined,
      total: mode === 'distance' && index ? formatDistance(running, units, locale) : undefined };
  });
  const closing = mode === 'area' && points.length >= 3 ? formatDistance(horizontalLength([points.at(-1)!, points[0]]), units, locale) : undefined;
  return { rows, closing };
}
