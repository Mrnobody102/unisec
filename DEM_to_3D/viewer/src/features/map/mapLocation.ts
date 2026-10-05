import proj4 from 'proj4';
import type { TerrainData, TerrainMetadata, TerrainPoint } from '../../types/terrain';
import { projectedToScene, projectedToWgs84 } from '../../terrain/coordinate';
import { bilinearElevation } from '../../terrain/elevationGrid';

export type MapLocation = {
  latitude: number; longitude: number;
  projected?: { x: number; y: number }; crs?: string;
  elevation?: number; scene?: TerrainPoint['scene'];
};

export function readMapLocation(latitude: number, longitude: number, terrain: TerrainData | null): MapLocation {
  const location: MapLocation = { latitude, longitude };
  if (!terrain) return location;
  const metadata = terrain.metadata;
  const crs = `${metadata.crs.authority}:${metadata.crs.code}`;
  try {
    const [x, y] = proj4('EPSG:4326', metadata.crs.proj4 || crs, [longitude, latitude]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return location;
    location.projected = { x, y }; location.crs = crs;
    location.elevation = bilinearElevation(terrain.grid, metadata, x, y).elevation;
    if (location.elevation !== undefined) location.scene = projectedToScene(metadata, { x, y }, location.elevation);
  } catch { /* Geographic coordinates remain available for unsupported local CRS. */ }
  return location;
}

export function readTerrainLocation(point: TerrainPoint, metadata: TerrainMetadata): MapLocation | null {
  const geographic = projectedToWgs84(metadata, point.projected);
  if (geographic.latitude === undefined || geographic.longitude === undefined) return null;
  return { ...geographic, latitude: geographic.latitude, longitude: geographic.longitude,
    projected: point.projected, crs: `${metadata.crs.authority}:${metadata.crs.code}`,
    elevation: point.elevation, scene: point.scene };
}
