import proj4 from 'proj4';
import type { GeometryRecord } from '../../geo/vector/types';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { PreparedPhotoPoint } from '../fieldPhotos/preparedPhotos';
import type { Locale } from '../../types/dear';
import { landslideAreaOf } from './landslideAreas';

/** Display names do not rename the supplied feature or discard its source identifier. */
export function areaDisplayName(record: GeometryRecord, locale: Locale): string {
  const original=String(record.feature.properties.sourceName ?? record.name).trim();
  if(record.name.trim()!==original) return record.name;
  const deposit=/^Talus(?:\s+(\d+))?$/i.exec(original);
  if(deposit) return (locale==='vi'?'Vùng tích tụ vật liệu':'Debris deposit')+(deposit[1]?' '+deposit[1]:'');
  const scar=/^Scar\s+(\d+)$/i.exec(original);
  if(scar) return (locale==='vi'?'Vùng phát sinh':'Source area')+' '+scar[1];
  return record.name;
}

/** A named survey group alone is insufficient: require the same source and a nearby
 * station. This links related field evidence, not proof that a photo covers every polygon. */
export function areaPhotoEvidence(record: GeometryRecord, records: GeometryRecord[], photos?: Map<string,PreparedPhotoPoint>) {
  const area=landslideAreaOf(record);
  if(!area || !photos?.size) return;
  const source=String(record.feature.properties.sourceName ?? record.name).trim();
  const group=/^(?:scar|talus)\s*(\d+)(?:[_\s]|$)/i.exec(source)?.[1];
  const geometry=record.feature.geometry;
  if(geometry.type!=='Polygon' && geometry.type!=='MultiPolygon') return;
  const rings=(geometry.type==='Polygon'?geometry.coordinates:geometry.coordinates.flat()).map(ring=>ring.map(p=>proj4('EPSG:4326','EPSG:32648',p.slice(0,2))));
  const distance=(coordinates:number[])=>{
    if(booleanPointInPolygon(coordinates,geometry))return 0;
    const point=proj4('EPSG:4326','EPSG:32648',coordinates.slice(0,2));
    let nearest=Infinity;
    for(const ring of rings)for(let i=1;i<ring.length;i++){
      const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;
      const f=len?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/len)):0;
      nearest=Math.min(nearest,Math.hypot(point[0]-a[0]-dx*f,point[1]-a[1]-dy*f));
    }
    return nearest;
  };
  const candidates=records.flatMap(station=>{
    if(station.feature.geometry.type!=='Point') return [];
    const explicit=area.observationIds.includes(station.id);
    const name=String(station.feature.properties.sourceName ?? station.name).trim();
    const point=[...photos.values()].find(p=>p.surveyName.trim()===name);
    if(!point) return [];
    const sameSource=record.feature.properties.sourceDatasetId && record.feature.properties.sourceDatasetId===station.feature.properties.sourceDatasetId;
    const stationGroup=/^scar\s*(\d+)\s*\[/i.exec(name)?.[1];
    const metres=distance(station.feature.geometry.coordinates);
    return explicit || (sameSource && group && group===stationGroup && metres<=150) ? [{point,explicit,distanceM:metres}] : [];
  });
  const matches=candidates.some(candidate=>candidate.explicit)?candidates.filter(candidate=>candidate.explicit):candidates;
  return matches.length===1?matches[0]:undefined;
}
