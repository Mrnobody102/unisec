import { describe, expect, it } from 'vitest';
import manifestJson from '../../public/scenarios/che-tao/v0.1/manifest.json';
import terrainMetadata from '../../public/terrain/che_tao_v2_tex.terrain.json';
import {
  buildScenarioRoutes, cheTaoIncident, initialCommunities,
  initialHazards, initialRoadSegments
} from './cheTaoScenario';
import { validateScenarioManifest } from './scenarioManifest';

const manifest = validateScenarioManifest(manifestJson);

describe('Chế Tạo prepared dataset', () => {
  it('pins the event, snapshot, CRS and item counts', () => {
    expect(manifest.incidentId).toBe(cheTaoIncident.id);
    expect(manifest.snapshotAt).toBe(cheTaoIncident.asOf);
    expect(manifest.crs).toBe(`${terrainMetadata.crs.authority}:${terrainMetadata.crs.code}`);
    expect(manifest.counts).toEqual({
      communities: initialCommunities.length,
      roads: initialRoadSegments.length,
      hazards: initialHazards.length
    });
    expect(manifest.dataKind).toBe('synthetic');
    expect(manifest.reviewStatus).toBe('draft');
  });

  it('links terrain files to metadata', () => {
    expect(manifest.terrain.grid.url.endsWith(terrainMetadata.grid.file)).toBe(true);
    expect(manifest.terrain.glb.url.endsWith(terrainMetadata.mesh.file)).toBe(true);
  });

  it('rejects malformed manifests before opening terrain assets', () => {
    expect(() => validateScenarioManifest({ ...manifest, schemaVersion: 2 })).toThrow('version');
    expect(() => validateScenarioManifest({
      ...manifest, terrain: { ...manifest.terrain, glb: { ...manifest.terrain.glb, url: '/../other.glb' } }
    })).toThrow('terrain.glb.url');
    expect(() => validateScenarioManifest({ ...manifest, snapshotAt: '29/09/2026' })).toThrow('snapshotAt');
  });

  it('keeps IDs and route geometry linked to the displayed objects', () => {
    const unique = (values: string[]) => new Set(values).size === values.length;
    expect(unique(initialCommunities.map(item => item.id))).toBe(true);
    expect(unique(initialRoadSegments.map(item => item.id))).toBe(true);
    expect(unique(initialHazards.map(item => item.id))).toBe(true);
    const hazardIds = new Set(initialHazards.map(item => item.id));
    for (const road of initialRoadSegments) if (road.hz) expect(hazardIds.has(road.hz), road.id).toBe(true);
    const roads = new Set(initialRoadSegments);
    const segment = (id: string) => initialRoadSegments.find(item => item.id === id)!;
    expect(['E1', 'E8', 'E9'].map(id => segment(id).scenarioRoadCode)).toEqual(['NR-18', 'NR-18', 'NR-18']);
    expect(['E12', 'E13'].map(id => segment(id).scenarioRoadCode)).toEqual(['PR-7', 'PR-7']);
    expect(segment('E14').scenarioRoadCode).toBeUndefined();
    const routes = buildScenarioRoutes(initialRoadSegments);
    expect([...routes.values()].filter(pair => pair.candidate).length).toBe(3);
    for (const id of ['NL', 'PH', 'TP', 'HC']) {
      expect(routes.get(id)).toEqual({ candidate: null, direct: null });
    }
    for (const community of initialCommunities) {
      const pair = routes.get(community.id);
      expect(pair, community.id).toBeDefined();
      for (const route of [pair?.candidate, pair?.direct]) {
        if (!route) continue;
        expect(route.communityId).toBe(community.id);
        expect(route.segs.length).toBeGreaterThan(0);
        for (const segment of route.segs) expect(roads.has(segment), route.id).toBe(true);
        const start = route.segs[0].points[0];
        const end = route.segs.at(-1)!.points.at(-1)!;
        const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
          Math.hypot(a.x - b.x, a.y - b.y);
        expect(distance(route.points[0], start), `${route.id} start`).toBeLessThan(100);
        expect(distance(route.points.at(-1)!, end), `${route.id} end`).toBeLessThan(100);
      }
    }
  });
});
