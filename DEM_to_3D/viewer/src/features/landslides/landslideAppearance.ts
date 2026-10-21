export const landslideFillOpacityKey = 'dear.landslide-fill-opacity.v1';
export const defaultLandslideFillOpacity = .22;

/** Fill can be hidden without losing the mapped boundary. */
export function landslideFillOpacity(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : defaultLandslideFillOpacity;
}
