import { GeometryError, type ImportFormat, type VectorFeature } from '../../geo/vector/types';
import { validateGeometry } from '../../geo/vector/validateGeometry';
import { GEOMETRY_LIMITS, textBytes } from '../../geo/vector/limits';
import { validateGeometryBudget } from '../../geo/vector/geometryBudget';
import { parseCoordinates } from './parseCoordinates';
import { parseKml } from './parseKml';
import { parseWktBatch } from './parseWkt';

function jsonFeatures(value: unknown, depth=0): VectorFeature[] {
  if (depth > 8) throw new GeometryError('geometry-type');
  const raw=value as Record<string, unknown>;
  if (!raw || typeof raw !== 'object') throw new GeometryError('geojson');
  if (raw.crs) {
    const name=(raw.crs as {properties?:{name?:string}}).properties?.name;
    if (!name || !['EPSG:4326','urn:ogc:def:crs:OGC:1.3:CRS84','urn:ogc:def:crs:EPSG::4326','OGC:CRS84'].includes(name)) throw new GeometryError('crs');
  }
  if (raw.type === 'FeatureCollection') {
    if (!Array.isArray(raw.features) || raw.features.length > GEOMETRY_LIMITS.features) throw new GeometryError('feature-limit');
    return raw.features.flatMap(feature=>jsonFeatures(feature,depth+1));
  }
  if (raw.type === 'Feature') {
    const features=jsonFeatures(raw.geometry,depth+1);
    const properties=raw.properties && typeof raw.properties === 'object' && !Array.isArray(raw.properties) ? raw.properties as Record<string,unknown> : {};
    return features.map(feature=>({...feature,properties}));
  }
  if (raw.type === 'GeometryCollection') {
    if (!Array.isArray(raw.geometries) || raw.geometries.length > GEOMETRY_LIMITS.features) throw new GeometryError('feature-limit');
    return raw.geometries.flatMap(geometry=>jsonFeatures(geometry,depth+1));
  }
  return [{type:'Feature',geometry:raw as unknown as VectorFeature['geometry'],properties:{}}];
}

export function parseSpatialInput(input: string): { format: ImportFormat; features: VectorFeature[] } {
  if (textBytes(input) > GEOMETRY_LIMITS.inputBytes) throw new GeometryError('file-limit');
  const text=input.trim();
  if (!text) throw new GeometryError('empty');
  let features: VectorFeature[], format: ImportFormat;
  if (text.startsWith('<')) { features=parseKml(text); format='KML'; }
  else if (text.startsWith('{')) {
    let raw: unknown;
    try { raw=JSON.parse(text); } catch { throw new GeometryError('geojson'); }
    features=jsonFeatures(raw); format='GeoJSON';
  } else {
    const coordinates = parseCoordinates(text);
    if (coordinates) { features=coordinates; format='coordinate';
    } else {
      features=parseWktBatch(text).map(item=>({type:'Feature',geometry:item.geometry,properties:{name:item.name}})); format='WKT';
    }
  }
  if (!features.length) throw new GeometryError('empty');
  validateGeometryBudget(features.map(feature => feature.geometry));
  return {format,features:features.map(feature=>({...feature,geometry:validateGeometry(feature.geometry)}))};
}
