import type { Locale } from '../../types/dear';
import { gridBearing, horizontalArea, horizontalLength, interiorAngle, type MeasureMode, type MeasurePoint } from './measurement';

export type MeasureUnits = { distance: 'auto' | 'm' | 'km'; area: 'auto' | 'm2' | 'ha' | 'km2' };
export const defaultMeasureUnits: MeasureUnits = { distance: 'auto', area: 'auto' };
export const modeNames: Record<MeasureMode, [string, string]> = {
  distance: ['Khoảng cách', 'Distance'], area: ['Diện tích', 'Area'], radius: ['Bán kính', 'Radius'],
  bearing: ['Phương vị', 'Bearing'], angle: ['Góc', 'Angle'], location: ['Tọa độ', 'Coordinates']
};
export function formatDistance(value: number, units: MeasureUnits, locale: Locale): string {
  const km = units.distance === 'km' || (units.distance === 'auto' && value >= 1000);
  return (km ? value / 1000 : value).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', { maximumFractionDigits: km ? 2 : 1 }) + (km ? ' km' : ' m');
}
export function formatArea(value: number, units: MeasureUnits, locale: Locale): string {
  const unit = units.area === 'auto' ? value >= 1000000 ? 'km2' : value >= 10000 ? 'ha' : 'm2' : units.area;
  return (value / (unit === 'km2' ? 1000000 : unit === 'ha' ? 10000 : 1)).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', { maximumFractionDigits: unit === 'm2' ? 1 : 2 }) + ' ' + ({ m2: 'm²', km2: 'km²', ha: 'ha' }[unit]);
}
export function measurementResults(mode: MeasureMode, points: MeasurePoint[], units: MeasureUnits, locale: Locale): Array<[string, string]> {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  if (!points.length) return [];
  const length = horizontalLength(points, mode === 'area' && points.length >= 3);
  const degree = (value: number | null) => value === null ? t('Chưa đủ điểm', 'Incomplete') : value.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', { maximumFractionDigits: 1 }) + '°';
  if (mode === 'location') return [
    [t('Vĩ độ', 'Latitude'), points[0].lat.toFixed(6) + '°'], [t('Kinh độ', 'Longitude'), points[0].lng.toFixed(6) + '°']
  ];
  if (mode === 'angle') return [[t('Góc tại điểm 2', 'Angle at point 2'), degree(interiorAngle(points))]];
  if (mode === 'bearing') return [[t('Phương vị Bắc lưới', 'Grid-north bearing'), degree(points.length === 2 ? gridBearing(points[0], points[1]) : null)], [t('Khoảng cách', 'Distance'), formatDistance(length, units, locale)]];
  if (mode === 'radius') return [[t('Bán kính', 'Radius'), formatDistance(length, units, locale)],
    [t('Diện tích hình tròn', 'Circle area'), points.length === 2 ? formatArea(Math.PI * length ** 2, units, locale) : t('Chưa đủ điểm', 'Incomplete')]];
  if (mode === 'area') {
    const area = horizontalArea(points);
    return [[t('Diện tích', 'Area'), points.length < 3 ? t('Chưa đủ điểm', 'Incomplete') : area === null ? t('Vùng không hợp lệ', 'Invalid area') : formatArea(area, units, locale)], [t('Chu vi', 'Perimeter'), formatDistance(length, units, locale)]];
  }
  return [[t('Chiều dài', 'Length'), formatDistance(length, units, locale)]];
}
