import type { Locale } from '../../../types/dear';
import { measurementMessages } from '../locales';
import { gridBearing, horizontalArea, horizontalLength, interiorAngle, rectangleRing, type MeasureMode, type MeasurePoint, type SketchMode } from './geometry';

export type MeasureUnits = { distance: 'auto' | 'm' | 'km'; area: 'auto' | 'm2' | 'ha' | 'km2' };
export const defaultMeasureUnits: MeasureUnits = { distance: 'auto', area: 'auto' };
export const measureModes: MeasureMode[] = ['distance', 'area', 'radius', 'bearing', 'angle', 'location'];
export const modeName = (mode: SketchMode, locale: Locale) => measurementMessages[locale].modes[mode];
const number = (locale: Locale) => locale === 'vi' ? 'vi-VN' : 'en-GB';
export function formatDistance(value: number, units: MeasureUnits, locale: Locale): string {
  const km = units.distance === 'km' || (units.distance === 'auto' && value >= 1000);
  return (km ? value / 1000 : value).toLocaleString(number(locale), { maximumFractionDigits: km ? 2 : 1 }) + (km ? ' km' : ' m');
}
export function formatArea(value: number, units: MeasureUnits, locale: Locale): string {
  const unit = units.area === 'auto' ? value >= 1000000 ? 'km2' : value >= 10000 ? 'ha' : 'm2' : units.area;
  return (value / (unit === 'km2' ? 1000000 : unit === 'ha' ? 10000 : 1)).toLocaleString(number(locale), { maximumFractionDigits: unit === 'm2' ? 1 : 2 }) + ' ' + ({ m2: 'm²', km2: 'km²', ha: 'ha' }[unit]);
}
/** Labelled values for the panel, labels on the map and copied reports. */
export function measurementResults(mode: SketchMode, points: MeasurePoint[], units: MeasureUnits, locale: Locale): Array<[string, string]> {
  const m = measurementMessages[locale];
  if (!points.length) return [];
  const degree = (value: number | null) => value === null ? m.incomplete : value.toLocaleString(number(locale), { maximumFractionDigits: 1 }) + '°';
  const areaRows = (ring: MeasurePoint[], enough: boolean): Array<[string, string]> => {
    const area = horizontalArea(ring);
    return [[m.area, !enough ? m.incomplete : area === null ? m.invalidArea : formatArea(area, units, locale)],
      [m.perimeter, formatDistance(horizontalLength(ring, ring.length >= 3), units, locale)]];
  };
  const length = horizontalLength(points);
  if (mode === 'location') return [[m.latitude, points[0].lat.toFixed(6) + '°'], [m.longitude, points[0].lng.toFixed(6) + '°']];
  if (mode === 'angle') return [[m.angleAt, degree(interiorAngle(points))]];
  if (mode === 'bearing') return [[m.gridBearing, degree(points.length === 2 ? gridBearing(points[0], points[1]) : null)], [m.distance, formatDistance(length, units, locale)]];
  if (mode === 'radius') return [[m.radius, formatDistance(length, units, locale)],
    [m.circleArea, points.length === 2 ? formatArea(Math.PI * length ** 2, units, locale) : m.incomplete]];
  if (mode === 'rectangle') return points.length === 2 ? areaRows(rectangleRing(points), true) : [[m.area, m.incomplete]];
  if (mode === 'area') return areaRows(points, points.length >= 3);
  return [[m.length, formatDistance(length, units, locale)]];
}
