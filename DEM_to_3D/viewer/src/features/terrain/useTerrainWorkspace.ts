import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UploadMode } from '../../components/ModelUploadPanel';
import type { IncidentPacket } from '../../data/incidentPacket';
import type { ScenarioManifest } from '../../data/scenarioManifest';
import { createGeographicPlacements } from '../../terrain/geographic';
import { loadModelFiles, loadTerrain3D, releaseModels } from '../../terrain/modelRuntime';
import type { LoadedModel, TerrainData } from '../../types/terrain';
import { loadWorkspaceDataset } from '../incident/loadWorkspaceDataset';
import { readBinary } from '../../shared/http/readResponse';

type Props = { mapMode: '2d' | '3d'; on3DUnavailable: () => void };

/** Owns dataset loading and model resources. It does not choose panels or map tools. */
export function useTerrainWorkspace({ mapMode, on3DUnavailable }: Props) {
  const [packet, setPacket] = useState<IncidentPacket | null>(null);
  const [manifest, setManifest] = useState<ScenarioManifest | null>(null);
  const [defaultTerrain, setDefaultTerrain] = useState<TerrainData | null>(null);
  const [snapshotReady, setSnapshotReady] = useState(false);
  const [startupError, setStartupError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [offline, setOffline] = useState(false);
  const [models, setModels] = useState<LoadedModel[]>([]);
  const [mode, setMode] = useState<UploadMode>('single');
  const [geographicMerge, setGeographicMerge] = useState(true);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading3D, setLoading3D] = useState(false);
  /** Download progress of the 3D terrain mesh (0–1), or null when nothing is downloading. */
  const [progress3D, setProgress3D] = useState<number | null>(null);
  const mapModeRef = useRef(mapMode);
  mapModeRef.current = mapMode;
  // The mesh dominates 3D start-up (≈16 MB). It starts as soon as the workspace is usable,
  // runs alongside the Three.js chunk, and survives a 3D→2D switch so returning is instant.
  const meshDownload = useRef<{ url: string; promise: Promise<ArrayBuffer>; controller: AbortController } | null>(null);
  const startMesh = useCallback((asset: { url: string; byteLength: number }) => {
    if (meshDownload.current?.url === asset.url) return meshDownload.current.promise;
    meshDownload.current?.controller.abort();
    const controller = new AbortController();
    setProgress3D(0);
    const promise = readBinary(asset.url, {
      signal: controller.signal,
      expectedBytes: asset.byteLength,
      onProgress: fraction => { if (meshDownload.current?.promise === promise) setProgress3D(fraction); }
    });
    promise.catch(() => undefined);
    meshDownload.current = { url: asset.url, promise, controller };
    return promise;
  }, []);
  const preparedTerrain = useRef<TerrainData | null>(null);
  const modelsRef = useRef<LoadedModel[]>([]);
  const importGeneration = useRef(0);
  const mounted = useRef(true);

  const replaceModels = useCallback((next: LoadedModel[]) => {
    const previous = modelsRef.current;
    modelsRef.current = next;
    setModels(next);
    releaseModels(previous);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      importGeneration.current++;
      releaseModels(modelsRef.current);
      meshDownload.current?.controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    importGeneration.current++;
    setBusy(true); setStartupError(false); setSnapshotReady(false);
    void loadWorkspaceDataset(controller.signal, import.meta.env.VITE_DEAR_API_BASE).then(dataset => {
      // The packet and grid make the workspace usable; the mesh follows without competing.
      if (mapModeRef.current === '3d') startMesh(dataset.manifest.terrain.glb);
      if (controller.signal.aborted) return;
      preparedTerrain.current = dataset.terrain;
      setPacket(dataset.packet); setManifest(dataset.manifest); setDefaultTerrain(dataset.terrain);
      setOffline(dataset.offline || new URLSearchParams(location.search).get('offline') === '1'); setSnapshotReady(true);
    }).catch(reason => {
      if (!controller.signal.aborted) {
        console.warn('Workspace dataset unavailable', reason);
        setStartupError(true);
      }
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (mapMode !== '3d' || models.length || !defaultTerrain || !manifest) return;
    const controller = new AbortController();
    setLoading3D(true);
    const download = startMesh(manifest.terrain.glb);
    const finish = () => { meshDownload.current = null; setProgress3D(null); };
    void loadTerrain3D({
      glb: manifest.terrain.glb.url, metadata: manifest.terrain.metadata.url, grid: manifest.terrain.grid.url
    }, defaultTerrain, controller.signal, download).then(terrain => {
      const model: LoadedModel = { id: manifest.datasetVersion, name: manifest.terrain.glb.url.split('/').pop()!, ...terrain, objectUrls: [] };
      if (controller.signal.aborted) releaseModels([model]);
      else { replaceModels([model]); finish(); }
    }).catch(() => { if (!controller.signal.aborted) { finish(); on3DUnavailable(); } })
      .finally(() => { if (!controller.signal.aborted) setLoading3D(false); });
    return () => { controller.abort(); setLoading3D(false); };
  }, [mapMode, models.length, defaultTerrain, manifest, replaceModels, on3DUnavailable, startMesh]);

  const clear = useCallback(() => {
    importGeneration.current++;
    replaceModels([]); setDefaultTerrain(preparedTerrain.current); setFileNames([]); setError(null); setBusy(false);
  }, [replaceModels]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  const reload = useCallback(() => { clear(); retry(); }, [clear, retry]);

  const upload = useCallback(async (files: File[]): Promise<boolean> => {
    if (!files.length) return false;
    const generation = ++importGeneration.current;
    setBusy(true); setError(null);
    try {
      const result = await loadModelFiles(files, mode);
      if (!mounted.current || generation !== importGeneration.current) {
        releaseModels(result.models);
        return false;
      }
      try { if (mode === 'merge' && geographicMerge) createGeographicPlacements(result.models); }
      catch (reason) { releaseModels(result.models); throw reason; }
      replaceModels(result.models); setDefaultTerrain(null); setFileNames(result.names);
      return true;
    } catch (reason) {
      if (mounted.current && generation === importGeneration.current) setError(reason instanceof Error ? reason.message : String(reason));
      return false;
    } finally {
      if (mounted.current && generation === importGeneration.current) setBusy(false);
    }
  }, [mode, geographicMerge, replaceModels]);

  const changeGeographicMerge = useCallback((enabled: boolean) => {
    if (enabled && models.length) {
      try { createGeographicPlacements(models); }
      catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); return; }
    }
    setError(null); setGeographicMerge(enabled);
  }, [models]);

  const changeMode = useCallback((next: UploadMode) => {
    if (next === 'merge' && geographicMerge && models.length) {
      try { createGeographicPlacements(models); }
      catch (reason) { setGeographicMerge(false); setError(reason instanceof Error ? reason.message : String(reason)); }
    } else setError(null);
    setMode(next);
  }, [geographicMerge, models]);

  const placements = useMemo(() => {
    if (mode !== 'merge' || !geographicMerge || !models.length) return undefined;
    try { return createGeographicPlacements(models); } catch { return undefined; }
  }, [mode, geographicMerge, models]);

  return { packet, manifest, defaultTerrain, snapshotReady, startupError, offline, models,
    mode, geographicMerge, fileNames, busy, error, loading3D, progress3D, placements,
    retry, reload, clear, upload, changeMode, changeGeographicMerge };
}
