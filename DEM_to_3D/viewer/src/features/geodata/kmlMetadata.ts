import type { Locale } from '../../types/dear';

/** Geometry-level KML metadata carried through the flat working feature model. */
export const kmlAltitudeModeKey = 'kmlAltitudeMode';
export const kmlAltitudeModes = [
  'clampToGround', 'relativeToGround', 'absolute', 'clampToSeaFloor', 'relativeToSeaFloor'
] as const;
export type KmlAltitudeMode = typeof kmlAltitudeModes[number];

export function kmlAltitudeMode(properties: Record<string, unknown>): KmlAltitudeMode | undefined {
  const value = properties[kmlAltitudeModeKey];
  return kmlAltitudeModes.includes(value as KmlAltitudeMode) ? value as KmlAltitudeMode : undefined;
}

export function kmlAltitudeLabel(mode: KmlAltitudeMode | undefined, locale: Locale): string {
  const labels: Record<KmlAltitudeMode, [string, string]> = {
    clampToGround: ['Bám mặt đất; không dùng Z', 'Clamped to ground; Z ignored'],
    relativeToGround: ['So với mặt đất', 'Relative to ground'],
    absolute: ['Tuyệt đối theo KML', 'Absolute KML altitude'],
    clampToSeaFloor: ['Bám đáy biển; không dùng Z', 'Clamped to sea floor; Z ignored'],
    relativeToSeaFloor: ['So với đáy biển', 'Relative to sea floor']
  };
  return mode ? labels[mode][locale === 'vi' ? 0 : 1] : locale === 'vi' ? 'Chưa xác định' : 'Unspecified';
}
