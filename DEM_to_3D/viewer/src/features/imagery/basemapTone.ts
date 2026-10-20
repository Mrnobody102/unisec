import type { AnalysisLayer } from './analysisImagery';
import profile from './basemap-tone.json';
export type BasemapTone = readonly number[];
/** Frozen display targets; no viewport-dependent auto contrast and no changes to Planet. */
export const basemapTones={online:profile.esri.gamma,prepared:profile.prepared.gamma};
export const preparedToneAssetId=profile.preparedAssetId;
export function tonedChannel(value:number,gamma:number):number {return 255*Math.pow(Math.max(0,Math.min(255,value))/255,gamma);}

export const supportsBasemapTone=(layers:AnalysisLayer[])=>layers.some(layer=>layer.kind==='optical' && layer.mosaic?.web.sha256===profile.planetSha256);
