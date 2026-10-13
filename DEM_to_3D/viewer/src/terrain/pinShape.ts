/**
 * Teardrop pin used by web maps for the selected place and route stops.
 * Drawn in a 36×48 box with the tip at (18, 45) and the head centred at (18, 17.6).
 */
export const PIN = { width: 36, height: 48, tipX: 18, tipY: 45, headY: 17.6 } as const;

export function teardropPinSvg(): string {
  return '<svg width="36" height="48" viewBox="0 0 36 48" aria-hidden="true">'
    + '<ellipse cx="18" cy="45.5" rx="6" ry="2.2" fill="rgba(0,0,0,.3)"/>'
    + '<path d="M18 45C18 45 3.5 29.6 3.5 17.6a14.5 14.5 0 1 1 29 0C32.5 29.6 18 45 18 45Z" fill="currentColor" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>'
    + '</svg>';
}
