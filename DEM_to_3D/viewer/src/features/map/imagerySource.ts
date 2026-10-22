import {localMapSource} from './localMapSource';
export const defaultImagerySource = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  name: 'Esri World Imagery',
  credit: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  link: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
  // Esri answers past its coverage with a "Map data not yet available" image (HTTP 200,
  // so no tile error fires). Around Mù Cang Chải real imagery stops at z18 (z19 is the
  // placeholder), so deeper zooms upscale z18 instead.
  maxNativeZoom: 18,
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
export const internetImagerySource = {
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

let usedInternetDetail = false;
export const noteInternetDetail = () => {usedInternetDetail = true;};
/** The included base always stays local; finer Internet imagery is a separate refinement. */
export const imagerySource={
  get url(){return localMapSource()?.imagery.url??internetImagerySource.url;},
  set url(value:string){internetImagerySource.url=value;},
  get maxNativeZoom(){return localMapSource()?.imagery.maxZoom??internetImagerySource.maxNativeZoom;},
  get name(){return localMapSource()?.imagery.name??internetImagerySource.name;},
  get credit(){const local=localMapSource();return local?local.imagery.credit+(usedInternetDetail?'; '+internetImagerySource.credit:''):internetImagerySource.credit;},
  get link(){return localMapSource()?undefined:internetImagerySource.link;},
  get custom(){return localMapSource()?false:internetImagerySource.custom;}
};
export const terrainTileSource=()=>localMapSource()?.terrain??{url:'https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg',maxZoom:14};
