/** Shared SVG geometry for map markers and their legend. */
export const mapSymbolPaths = {
  community: 'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2 20v-3a6 6 0 0 1 12 0v3H2Zm14 0v-3a8 8 0 0 0-1-4 5 5 0 0 1 7 4v3h-6Z',
  landslide: 'm3 20 8-15 5 9 2-3 4 9H3Zm5-8 4 2 2-2M17 4h3v3h-3V4Zm-1 4h2v2h-2V8Z',
  bridge: 'M3 18h18M5 18V8m14 10V8M3 10h18M5 14c4 0 4-5 7-5s3 5 7 5M9 14v4m6-4v4',
  crossing: 'M3 7h7l4 10h7M3 17h7l4-10h7M12 3v3m0 12v3',
  staging: 'M5 21V3h14l-3 5 3 5H5M2 21h7',
  hlz: 'M7 6v12M17 6v12M7 12h10',
  flood: 'M3 8c3-4 3 4 6 0s3 4 6 0 3 4 6 0M3 14c3-4 3 4 6 0s3 4 6 0 3 4 6 0M3 20c3-4 3 4 6 0s3 4 6 0 3 4 6 0'
} as const;

export type MapSymbolName = keyof typeof mapSymbolPaths;

export function mapSymbolSvg(symbol: MapSymbolName, size = 18): string {
  const fill = symbol === 'community' ? 'currentColor' : 'none';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${mapSymbolPaths[symbol]}"/></svg>`;
}
