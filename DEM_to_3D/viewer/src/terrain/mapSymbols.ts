/** Project cartographic pictograms, shared by 2D, 3D and legends.
 * Settlement roofs and bridge deck/piers use a common 24-unit line grid.
 * These are product symbols, not a claimed FGDC/NPS emergency symbol standard. */
export const mapSymbolPaths = {
  community: 'M3 11l5-5 5 5v9H3ZM13 12l4-4 4 4v8h-8M7 20v-5h3v5M16 20v-4h3v4',
  landslide:
    'M3 20h18M3 20 10 7l4 7.5M15 17.5a1.25 1.25 0 1 0 2.5 0a1.25 1.25 0 1 0-2.5 0M18.5 13a1 1 0 1 0 2 0a1 1 0 1 0-2 0M12 18.25a.75.75 0 1 0 1.5 0a.75.75 0 1 0-1.5 0',
  bridge: 'M2 9h20M2 13h20M6 5v15M18 5v15',
  crossing:
    'M8 3v5M16 3v5M8 16v5M16 16v5M2 10q2-2 4 0t4 0 4 0 4 0 4 0M2 14q2-2 4 0t4 0 4 0 4 0 4 0',
  staging: 'M6 21V4h12l-2.5 4.5L18 13H6M3.5 21h5',
  hlz: 'M7 6v12M17 6v12M7 12h10',
  flood:
    'M3 8c3-4 3 4 6 0s3 4 6 0 3 4 6 0M3 14c3-4 3 4 6 0s3 4 6 0 3 4 6 0M3 20c3-4 3 4 6 0s3 4 6 0 3 4 6 0'
} as const;

export type MapSymbolName = keyof typeof mapSymbolPaths;

export function mapSymbolSvg(symbol: MapSymbolName, size = 18): string {
  const fill = 'none';
  const stroke = 'currentColor';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${mapSymbolPaths[symbol]}"/></svg>`;
}
