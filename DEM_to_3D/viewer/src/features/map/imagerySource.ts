export const defaultImagerySource = {
  url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg',
  name: 'Sentinel-2 cloudless 2016',
  credit: '© EOX / Copernicus',
  link: 'https://cloudless.eox.at',
  maxNativeZoom: 14,
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
  link:
    enabled && /^https:\/\//.test(String(env.VITE_DEAR_IMAGERY_LINK))
      ? String(env.VITE_DEAR_IMAGERY_LINK)
      : defaultImagerySource.link,
  maxNativeZoom: enabled
    ? Math.max(1, Math.min(22, Math.floor(Number(env.VITE_DEAR_IMAGERY_MAX_ZOOM) || 18)))
    : 14,
  custom: enabled
};
