export const defaultImagerySource = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  name: 'Esri World Imagery',
  credit: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  link: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
  maxNativeZoom: 19,
  custom: false
};
/** Load tiles while panning and keep a wider ring of loaded tiles, so a drag never
 * reveals an empty background while the next tiles are still idle-deferred. */
export const basemapTileOptions = { keepBuffer: 4, updateWhenIdle: false, updateWhenZooming: false } as const;
const env = import.meta.env;
const customUrl = String(env.VITE_DEAR_IMAGERY_URL ?? '');
const enabled =
  /^https:\/\//.test(customUrl) &&
  ['{z}', '{x}', '{y}'].every((token) => customUrl.includes(token)) &&
  !!env.VITE_DEAR_IMAGERY_ATTRIBUTION;
export const imagerySource = {
  url: enabled ? customUrl : defaultImagerySource.url,
  name: enabled
    ? String(env.VITE_DEAR_IMAGERY_NAME || 'Ảnh nền')
    : defaultImagerySource.name,
  credit: enabled
    ? String(env.VITE_DEAR_IMAGERY_ATTRIBUTION)
    : defaultImagerySource.credit,
  link: enabled
    ? /^https:\/\//.test(String(env.VITE_DEAR_IMAGERY_LINK))
      ? String(env.VITE_DEAR_IMAGERY_LINK)
      : undefined
    : defaultImagerySource.link,
  maxNativeZoom: enabled
    ? Math.max(1, Math.min(22, Math.floor(Number(env.VITE_DEAR_IMAGERY_MAX_ZOOM) || 18)))
    : defaultImagerySource.maxNativeZoom,
  custom: enabled
};
