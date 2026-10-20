import { describe, it, expect } from "vitest";
import {
  readPublishedGis,
  publishGisDraft,
  publishedGisKey,
} from "./publishedGis";
function store() {
  const entries = new Map<string, string>();
  return {
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => {
      entries.set(k, v);
    },
    removeItem: (k: string) => {
      entries.delete(k);
    },
    key: (i: number) => [...entries.keys()][i] ?? null,
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
  };
}
describe("GIS publication", () => {
  it("migrates legacy data after one successful publication", () => {
    const s = store();
    s.setItem("dear.geodata.v1", "[]");
    s.setItem("dear.scenario-edits.v1:demo", "[]");
    publishGisDraft("demo", [], [], [], [], s);
    expect(readPublishedGis(s).scenarios.demo).toEqual([]);
    expect(s.getItem(publishedGisKey)).not.toBeNull();
    expect(s.getItem("dear.geodata.v1")).toBeNull();
  });
  it("keeps both datasets when the commit fails", () => {
    const s = store();
    s.setItem("dear.geodata.v1", "[]");
    s.setItem("dear.scenario-edits.v1:demo", "[]");
    s.setItem = () => {
      throw new Error("Quota");
    };
    expect(() => publishGisDraft("demo", [], [], [], [], s)).toThrow("Quota");
    expect(s.getItem(publishedGisKey)).toBeNull();
    expect(s.getItem("dear.geodata.v1")).toBe("[]");
    expect(s.getItem("dear.scenario-edits.v1:demo")).toBe("[]");
  });
  it("refuses to overwrite newer or unrecognized data", () => {
    const s = store();
    s.setItem(
      publishedGisKey,
      JSON.stringify({
        schema: "dear-gis/v2",
        records: [],
        scenarios: { demo: [{ id: "newer" }] },
      }),
    );
    expect(() => publishGisDraft("demo", [], [], [], [], s)).toThrow(
      "GIS_CONFLICT",
    );
    expect(readPublishedGis(s).scenarios.demo).toHaveLength(1);
    s.setItem(publishedGisKey, '{"schema":"unknown"}');
    expect(() => readPublishedGis(s)).toThrow();
  });
});


it('publishes a second edit after restoration reorders feature JSON fields', () => {
  const s = store();
  const record = {
    id: 'point', name: 'Original', role: 'reference' as const, visible: true,
    source: { name: 'test', format: 'coordinate' as const, importedAt: '2026-10-15T00:00:00Z' },
    feature: { type: 'Feature' as const, properties: { z: 1, a: 2 }, geometry: { type: 'Point' as const, coordinates: [104, 21] } },
  };
  publishGisDraft('demo', [], [], [record], [], s);
  const renamed = { ...record, name: 'Renamed' };
  expect(() => publishGisDraft('demo', [record], [], [renamed], [], s)).not.toThrow();
  expect(readPublishedGis(s).records[0].name).toBe('Renamed');
  // Real coordinate changes in another tab must still be rejected.
  const moved = { ...renamed, feature: { ...renamed.feature, geometry: { type: 'Point' as const, coordinates: [105, 21] } } };
  publishGisDraft('demo', [renamed], [], [moved], [], s);
  expect(() => publishGisDraft('demo', [renamed], [], [record], [], s)).toThrow('GIS_CONFLICT');
});

it.each(['survey:point-42', 42])('preserves imported GeoJSON feature ID %s between consecutive edits', id => {
  const s = store();
  const record = {
    id: 'workspace-point', name: 'Survey point', role: 'reference' as const, visible: true,
    source: {name:'survey.geojson',format:'GeoJSON' as const,importedAt:'2026-10-20T00:00:00Z'},
    feature: {type:'Feature' as const,id,properties:{source:'survey'},geometry:{type:'Point' as const,coordinates:[104,21]}},
  };
  publishGisDraft('demo', [], [], [record], [], s);
  expect(readPublishedGis(s).records[0].feature.id).toBe(id);
  const renamed = {...record,name:'Reviewed survey point'};
  expect(() => publishGisDraft('demo', [record], [], [renamed], [], s)).not.toThrow();
  expect(readPublishedGis(s).records[0]).toEqual(renamed);
});
