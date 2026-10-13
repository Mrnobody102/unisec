import { geometryPositions, type GeometryRecord } from '../../geo/vector/types';

export type JourneyPlace = {
  key: string;
  label: string;
  /** Source file or layer the place came from, used to group long lists. */
  group: string;
  latitude: number;
  longitude: number;
};

/** Visible GIS points and areas as journey endpoints; an area is represented by its vertex centroid. */
export function gisJourneyPlaces(records: GeometryRecord[]): JourneyPlace[] {
  return records
    .filter((record) => record.visible)
    .flatMap((record) => {
      const geometry = record.feature.geometry;
      const positions =
        geometry.type === 'Polygon'
          ? geometry.coordinates[0].slice(0, -1)
          : geometry.type === 'MultiPolygon'
            ? geometry.coordinates.flatMap((polygon) => polygon[0].slice(0, -1))
            : geometryPositions(geometry);
      if (!positions.length) return [];
      const longitude = positions.reduce((sum, p) => sum + p[0], 0) / positions.length,
        latitude = positions.reduce((sum, p) => sum + p[1], 0) / positions.length;
      return [
        {
          key: 'gis:' + record.id,
          label: record.name || record.id,
          group: record.source.name,
          latitude,
          longitude
        }
      ];
    })
    .sort(
      (a, b) =>
        a.group.localeCompare(b.group) ||
        a.label.localeCompare(b.label, undefined, { numeric: true })
    );
}
