import { afterEach, describe, expect, it, vi } from 'vitest';
import manifestJson from '../../../public/scenarios/che-tao/v0.3/manifest.json';
import packetJson from '../../../public/scenarios/che-tao/v0.3/incident.json';
import { validateScenarioManifest } from '../../data/scenarioManifest';
import { validateIncidentPacket } from '../../data/incidentPacket';
import { loadWorkspaceDataset, validateWorkspaceManifest } from './loadWorkspaceDataset';
import { loadTerrainData } from '../../terrain/loadTerrain';
import { deriveIncidentWorkspace } from './deriveIncidentWorkspace';
import type { TerrainMetadata } from '../../types/terrain';

vi.mock('../../terrain/loadTerrain', () => ({ loadTerrainData: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('workspace dataset consistency', () => {
  it('accepts the matching packet', () => {
    expect(() => validateWorkspaceManifest(validateScenarioManifest(manifestJson), validateIncidentPacket(packetJson))).not.toThrow();
  });
  it.each(['incidentId', 'snapshotAt', 'crs', 'datasetVersion', 'dataKind', 'reviewStatus'] as const)('rejects a different %s', field => {
    const manifest = validateScenarioManifest(manifestJson);
    Object.assign(manifest, { [field]: 'mismatch' });
    expect(() => validateWorkspaceManifest(manifest, validateIncidentPacket(packetJson))).toThrow('does not match');
  });
  it.each(['roads', 'communities', 'hazards'] as const)('rejects a different %s count', field => {
    const manifest = validateScenarioManifest(manifestJson);
    manifest.counts[field]++;
    expect(() => validateWorkspaceManifest(manifest, validateIncidentPacket(packetJson))).toThrow('does not match');
  });
});

describe('configured dataset loading', () => {
  it.each([{dataSource:'prepared',offline:false},{dataSource:'api',offline:false},{dataSource:'api',offline:true}] as const)('loads a distinct AOI and road snapshot with $dataSource / offline=$offline', async ({dataSource,offline}) => {
    const raw = structuredClone(packetJson);
    raw.datasetVersion = 'alternate-v1'; raw.incident.id = 'INC-ALTERNATE';
    raw.incident.title = ['Alternate incident', 'Alternate incident'];
    const community = raw.communities.find(item => item.id === 'CT')!;
    community.name = 'Alternate locality';
    const { x, y } = community.projected;
    raw.aoi.points = [{ x: x - 400, y: y - 400 }, { x: x + 400, y: y - 400 },
      { x: x + 400, y: y + 400 }, { x: x - 400, y: y + 400 }, { x: x - 400, y: y - 400 }];
    raw.roads.find(road => road.id === raw.report.roadId)!.status = 'blocked';
    const bytes = new TextEncoder().encode(JSON.stringify(raw));
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    const manifest = { ...structuredClone(manifestJson), datasetVersion: raw.datasetVersion, incidentId: raw.incident.id,
      workspace: { url: '/scenarios/alternate/v1/incident.json', byteLength: bytes.byteLength, sha256: hash } };
    delete (manifest as {fieldData?: unknown}).fieldData;
    delete (manifest as {referenceData?: unknown}).referenceData;

    const fetch = vi.fn(async (url: string) => {
      if (url === '/workspace-config.json') return Response.json({ dataSource, offline, manifestUrl: '/scenarios/alternate/v1/manifest.json' });
      if (url === '/scenarios/alternate/v1/manifest.json') return Response.json(manifest);
      if (url === manifest.workspace.url || url === '/api/v1/incidents/INC-ALTERNATE/workspace') return new Response(bytes);
      return new Response('', { status: 404 });
    });
    vi.stubGlobal('fetch', fetch);
    vi.mocked(loadTerrainData).mockResolvedValue({ metadata: { crs: { authority: 'EPSG', code: 32648 } } as TerrainMetadata,
      grid: new Float32Array(1), gridBuffer: new ArrayBuffer(4) });
    const loaded = await loadWorkspaceDataset(new AbortController().signal,offline?'https://unreachable.example':'');
    if(offline){
      expect(fetch.mock.calls.map(([url])=>url)).toContain(manifest.workspace.url);
      expect(fetch.mock.calls.map(([url])=>url).some(url=>url.startsWith('https:'))).toBe(false);
    }
    expect(loaded.packet.incident.id).toBe('INC-ALTERNATE');
    expect(loaded.contextTerrain).toHaveLength(manifest.terrainContext.length);
    for(const asset of manifest.terrainContext)expect(loadTerrainData).toHaveBeenCalledWith({metadata:asset.metadata.url,grid:asset.grid.url},expect.any(AbortSignal));
    const workspace = deriveIncidentWorkspace(loaded.packet, false);
    expect(workspace.communities.map(item => item.name)).toEqual(['Alternate locality']);
    expect(workspace.assessments.get('CT')?.access).toBe('blocked');
    expect(loadTerrainData).toHaveBeenCalledWith({ metadata: manifest.terrain.metadata.url, grid: manifest.terrain.grid.url }, expect.any(AbortSignal));
    expect(fetch.mock.calls.map(([url]) => url)).not.toContain('/scenarios/che-tao/v0.3/manifest.json');
  });

  it('does not retry the default dataset if a selected manifest is unavailable', async () => {
    const fetch = vi.fn(async (url: string) => url === '/workspace-config.json'
      ? Response.json({ dataSource: 'prepared', manifestUrl: '/scenarios/missing/v1/manifest.json' })
      : new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetch);
    await expect(loadWorkspaceDataset(new AbortController().signal)).rejects.toThrow('404');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/workspace-config.json', '/scenarios/missing/v1/manifest.json']);
    expect(loadTerrainData).not.toHaveBeenCalled();
  });
});
