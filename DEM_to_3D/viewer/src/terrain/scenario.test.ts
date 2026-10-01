import { describe, expect, it } from 'vitest';
import {
  cheTaoIncident,
  initialCommunities,
  initialHazards,
  initialRoadSegments,
  buildScenarioRoutes
} from '../data/cheTaoScenario';
import { buildScenarioOverlays } from './scenarioOverlays';
import type { TerrainMetadata } from '../types/terrain';

describe('DEAR Scenario & Overlays', () => {
  it('validates Che Tao incident metadata and timeline', () => {
    expect(cheTaoIncident.id).toBe('INC-2026-0412');
    expect(cheTaoIncident.timeline.length).toBeGreaterThanOrEqual(6);
    expect(cheTaoIncident.sources.length).toBe(4);
    expect(cheTaoIncident.areaKm2).toBe(214);
  });

  it('validates 7 communities and priority ranking', () => {
    expect(initialCommunities.length).toBe(7);
    const prio1 = initialCommunities.filter((c) => c.prio === 1);
    expect(prio1.length).toBe(3); // NK, KM, NL
    const namKhat = initialCommunities.find((c) => c.id === 'NK');
    expect(namKhat).toBeDefined();
    expect(namKhat?.pop).toBe(640);
  });

  it('validates initial route resolution for Nậm Khắt', () => {
    const routes = buildScenarioRoutes(initialRoadSegments);
    const nk = routes.get('NK');
    expect(nk).toBeDefined();
    expect(nk?.candidate.status).toBe('uncertain');
    expect(nk?.direct?.status).toBe('blocked');
    expect(nk?.candidate.lengthKm).toBeGreaterThan(0);
    expect(nk?.direct?.lengthKm).toBeGreaterThan(0);
  });

  it('validates simulated U-1 field update on PR-7 route', () => {
    const updatedRoads = initialRoadSegments.map((r) =>
      r.id === 'E13' ? { ...r, status: 'blocked' as const } : r
    );
    const routes = buildScenarioRoutes(updatedRoads);
    const nk = routes.get('NK');
    expect(nk?.candidate.status).toBe('blocked');
  });

  it('builds Three.js overlay hierarchy without errors', () => {
    const dummyMetadata: TerrainMetadata = {
      schema_version: 1,
      asset_id: 'test_terrain',
      crs: { authority: 'EPSG', code: 32648, linear_unit: 'metre' },
      scene_axes: { x: 'east', y: 'up', z: 'negative_north' },
      world_origin: { x: 399543.8, y: 2400708.0 },
      grid: {
        file: 'test.grid.bin',
        shape: [10, 10],
        shape_order: 'rows_cols',
        dtype: 'float32',
        byte_order: 'little_endian',
        layout: 'row_major',
        nodata_encoding: 'nan',
        elevation_unit: 'metre',
        sampling_method: 'nearest_subsample',
        source_step: 1,
        byte_length: 400
      },
      grid_transform: {
        a: 30,
        b: 0,
        c: 390000,
        d: 0,
        e: -30,
        f: 2410000,
        convention: 'rasterio_affine',
        pixel_reference: 'center'
      },
      elevation: {
        base_elevation: 100,
        exaggeration: 1.5,
        normalize_base: true,
        min: 100,
        max: 2000
      },
      analysis_supported: true
    };
    const dummyGrid = new Float32Array(100).fill(500);

    const routes = buildScenarioRoutes(initialRoadSegments);
    const overlays = buildScenarioOverlays({
      metadata: dummyMetadata,
      grid: dummyGrid,
      communities: initialCommunities,
      hazards: initialHazards,
      roads: initialRoadSegments,
      selectedRoute: routes.get('NK')!.candidate,
      selectedCommunityId: 'NK',
      selectedObjectId: null,
      layers: {
        roads: true,
        status: true,
        communities: true,
        landslide: true,
        staging: true,
        route: true
      }
    });

    expect(overlays.name).toBe('dear-scenario-overlays');
    expect(overlays.children.length).toBe(4); // roads, communities, hazards, staging
  });
});
