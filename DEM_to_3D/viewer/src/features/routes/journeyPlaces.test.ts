import { describe, expect, it } from "vitest";
import pointInPolygon from "@turf/boolean-point-in-polygon";
import type { GeometryRecord, VectorGeometry } from "../../geo/vector/types";
import { gisJourneyPlaces } from "./journeyPlaces";
const record = (geometry: VectorGeometry): GeometryRecord => ({
  id: "shape",
  name: "Area",
  role: "reference",
  visible: true,
  source: {
    name: "Source",
    format: "GeoJSON",
    importedAt: "2026-10-13T00:00:00Z",
  },
  feature: { type: "Feature", properties: {}, geometry },
});
describe("GIS route endpoints", () => {
  it("keeps source points and excludes hidden layers", () => {
    const r = record({ type: "Point", coordinates: [104, 21, 1200] });
    const point = gisJourneyPlaces([r])[0];
    expect([point.longitude, point.latitude]).toEqual([104, 21]);
    expect(point.representative).toBe(false);
    expect(gisJourneyPlaces([{ ...r, visible: false }])).toEqual([]);
    expect(r.feature.geometry).toEqual({
      type: "Point",
      coordinates: [104, 21, 1200],
    });
  });
  it("places representatives on concave polygons and disconnected multipolygons", () => {
    const geometries: VectorGeometry[] = [
      {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [4, 0],
            [4, 4],
            [3, 4],
            [3, 1],
            [1, 1],
            [1, 4],
            [0, 4],
            [0, 0],
          ],
        ],
      },
      {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
          [
            [
              [10, 0],
              [11, 0],
              [11, 1],
              [10, 1],
              [10, 0],
            ],
          ],
        ],
      },
    ];
    for (const g of geometries) {
      const point = gisJourneyPlaces([record(g)])[0];
      expect(
        pointInPolygon(
          [point.longitude, point.latitude],
          g as import("geojson").Polygon | import("geojson").MultiPolygon,
        ),
      ).toBe(true);
      expect(point.representative).toBe(true);
    }
  });
  it("uses a point on a bent line rather than an average outside it", () => {
    const point = gisJourneyPlaces([
      record({
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 0],
          [2, 2],
        ],
      }),
    ])[0];
    expect(point.longitude === 2 || point.latitude === 0).toBe(true);
    expect(point.representative).toBe(true);
  });
});
