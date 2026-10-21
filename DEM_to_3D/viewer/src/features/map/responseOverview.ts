import proj4 from 'proj4';
import { geometryPositions, type GeometryRecord } from '../../geo/vector/types';
import type { TerrainMetadata } from '../../types/terrain';
import type { MapScene } from './mapContracts';
import { landslideAreaOf } from '../landslides/landslideAreas';

/** Frame mapped hazards and operational places, rather than a long reference corridor. */
export function responseOverviewPoints(scenario: MapScene, records: GeometryRecord[], metadata: TerrainMetadata) {
  const crs = metadata.crs.proj4 || `${metadata.crs.authority}:${metadata.crs.code}`;
  const extents = records.filter(record => record.visible && landslideAreaOf(record)).flatMap(record =>
    geometryPositions(record.feature.geometry).map(([lon, lat]) => {
      const [x, y] = proj4('EPSG:4326', crs, [lon, lat]); return {x, y};
    }));
  const places = [...scenario.communities, ...scenario.hazards,
    ...(scenario.responseSites ?? []).filter(site => scenario.layers[site.kind] !== false)].map(item => item.projected);
  return extents.length ? [...extents, ...places] : [
    ...places, ...scenario.roads.flatMap(road => road.points), ...(scenario.aoi?.points ?? [])
  ];
}
