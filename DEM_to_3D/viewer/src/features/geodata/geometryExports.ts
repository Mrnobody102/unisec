import { recordIdKey } from '../observations/fieldAreas';
import type { Position } from 'geojson';
import { GeometryError, isPolygon, type GeometryRecord, type VectorGeometry } from '../../geo/vector/types';
import { coverageMethod, polygonCoverage } from '../../geo/vector/polygonCoverage';
import { kmlAltitudeMode, kmlAltitudeModeKey, type KmlAltitudeMode } from './kmlMetadata';

const escape = (value: string) => value.replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]!)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
function orientRing(ring: Position[], outer: boolean): Position[] {
  const signed=ring.slice(0,-1).reduce((sum,p,i)=>sum+p[0]*ring[i+1][1]-ring[i+1][0]*p[1],0);
  return (signed > 0) === outer ? ring : [...ring].reverse();
}
function oriented(geometry: VectorGeometry): VectorGeometry {
  if (geometry.type === 'Polygon') return {...geometry,coordinates:geometry.coordinates.map((ring,i)=>orientRing(ring,i === 0))};
  if (geometry.type === 'MultiPolygon') return {...geometry,coordinates:geometry.coordinates.map(p=>p.map((ring,i)=>orientRing(ring,i === 0)))};
  return geometry;
}

export function exportGeometryGeoJSON(records: GeometryRecord[]): string {
  return JSON.stringify({type:'FeatureCollection',features:records.map(record=>({...record.feature,id:record.id,
    geometry:oriented(record.feature.geometry),properties:{...record.feature.properties,name:record.name,
      [recordIdKey]:record.id,geometryRole:record.role,source:record.source.name,inputFormat:record.source.format,importedAt:record.source.importedAt}})),
    metadata:{coordinateOrder:'longitude,latitude',method:coverageMethod,
      coverage:polygonCoverage(records)}},null,2);
}

export function exportGeometryWkt(geometry: VectorGeometry): string {
  const point=(p:Position)=>p.join(' '), ring=(r:Position[])=>`(${r.map(point).join(', ')})`;
  const dimensions=geometry.type === 'Point' ? geometry.coordinates.length : isPolygon(geometry)
    ? (geometry.type === 'Polygon' ? geometry.coordinates[0][0] : geometry.coordinates[0][0][0]).length : geometry.coordinates[0].length;
  const z=dimensions === 3 ? ' Z' : '';
  switch (geometry.type) {
    case 'Point': return `POINT${z} (${point(geometry.coordinates)})`;
    case 'LineString': return `LINESTRING${z} ${ring(geometry.coordinates)}`;
    case 'Polygon': return `POLYGON${z} (${geometry.coordinates.map(ring).join(', ')})`;
    case 'MultiPolygon': return `MULTIPOLYGON${z} (${geometry.coordinates.map(p=>`(${p.map(ring).join(', ')})`).join(', ')})`;
  }
}

function kmlGeometry(raw: VectorGeometry, mode: KmlAltitudeMode | undefined): string {
  const geometry=oriented(raw), coords=(points:Position[])=>`<coordinates>${points.map(p=>p.join(',')).join(' ')}</coordinates>`;
  // Unknown WKT/GeoJSON Z is kept as a value without inventing a vertical reference.
  const tag = mode?.includes('SeaFloor') ? 'gx:altitudeMode' : 'altitudeMode';
  const altitude = `<${tag}>${mode ?? 'clampToGround'}</${tag}>`;
  const polygon=(rings:Position[][])=>`<Polygon>${altitude}${rings.map((ring,i)=>{
    const boundary=i === 0 ? 'outerBoundaryIs' : 'innerBoundaryIs';
    return `<${boundary}><LinearRing>${coords(ring)}</LinearRing></${boundary}>`;
  }).join('')}</Polygon>`;
  switch (geometry.type) {
    case 'Point': return `<Point>${altitude}${coords([geometry.coordinates])}</Point>`;
    case 'LineString': return `<LineString>${altitude}${coords(geometry.coordinates)}</LineString>`;
    case 'Polygon': return polygon(geometry.coordinates);
    case 'MultiPolygon': return `<MultiGeometry>${geometry.coordinates.map(polygon).join('')}</MultiGeometry>`;
  }
}
function kmlPlacemark(record: GeometryRecord): string {
  const mode = kmlAltitudeMode(record.feature.properties);
  if (record.feature.properties[kmlAltitudeModeKey] != null && !mode) throw new GeometryError('kml-altitude');
  const properties = { ...record.feature.properties, [recordIdKey]: record.id, geometryRole: record.role, source: record.source.name };
  const extended = Object.entries(properties)
    .filter(([key, value]) => !['name', 'description', kmlAltitudeModeKey, '__proto__', 'prototype', 'constructor'].includes(key) && value != null)
    .map(([key, value]) => {
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      return `<Data name="${escape(key)}"><value>${escape(text ?? '')}</value></Data>`;
    }).join('');
  const description = record.feature.properties.description;
  return `<Placemark><name>${escape(record.name)}</name>` +
    (description != null ? `<description>${escape(String(description))}</description>` : '') +
    `<ExtendedData>${extended}</ExtendedData>${kmlGeometry(record.feature.geometry, mode)}</Placemark>`;
}

export function exportGeometryKml(records: GeometryRecord[]): string {
  return '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><Document>' +
    records.map(kmlPlacemark).join('') + '</Document></kml>';
}
