import type {DivIconOptions} from 'leaflet';
import {markerSize,poiMetrics} from '../../terrain/poiFrame';

/** Leaflet and screen-space markers share the same SVG dimensions and anchor.
 * Survey crosses remain centred discs even when their outline is selected. */
export function poiGeometry(selected=false,size=28):Pick<DivIconOptions,'iconSize'|'iconAnchor'> {
  const width=selected?markerSize(false,true):size,{half,tip,height}=poiMetrics(width,selected);
  return {iconSize:[width,height],iconAnchor:[half,tip]};
}
