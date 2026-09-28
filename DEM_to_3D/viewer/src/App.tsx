import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ModelUploadPanel, type UploadMode } from './components/ModelUploadPanel';
import { HoverInfoPanel } from './components/HoverInfo';
import { MeasureToolbar } from './components/MeasureToolbar';
import { ProfileChart } from './components/ProfileChart';
import { SlopeTable } from './components/SlopeTable';
import { TerrainViewer } from './components/TerrainViewer';
import { createGeographicPlacements } from './terrain/geographic';
import { loadUploadedModels, releaseUploadedModels, selectUploadedFiles } from './terrain/upload';
import { selectAnalysisTerrain } from './terrain/analysisTerrain';
import { createSurfaceProfile } from './terrain/profile';
import { detectExtrema, extremaWithSlopes, smoothProfile } from './terrain/extrema';
import { calculateSegmentSlopes, regressionSlopeAt } from './terrain/slope';
import { extractProjectedVertices, selectVerticesAlongLine } from './terrain/vertex';
import { initialMeasurementState, measurementReducer } from './state/measurementStore';
import { projectedToScene } from './terrain/coordinate';
import type { HoverInfo, LoadedModel, TerrainPoint } from './types/terrain';

const analysisConfig = { profileSampleIntervalM: 10, smoothingWindowM: 50, extremaMinProminenceM: 8, extremaMinDistanceM: 100, slopeRegressionWindowM: 50 };

export default function App(): JSX.Element {
  const [models, setModels] = useState<LoadedModel[]>([]);
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [geographicMerge, setGeographicMerge] = useState(true);
  const [uploadedNames, setUploadedNames] = useState<string[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const modelsRef = useRef<LoadedModel[]>([]);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [measurement, dispatchMeasurement] = useReducer(measurementReducer, initialMeasurementState);
  const [focusDistance, setFocusDistance] = useState<number | null>(null);

  const replaceModels = useCallback((next: LoadedModel[]): void => {
    const previous = modelsRef.current;
    modelsRef.current = next;
    setModels(next);
    if (previous.length > 0) releaseUploadedModels(previous);
  }, []);
  const clearUploadedModels = useCallback((): void => {
    replaceModels([]);
    setUploadedNames([]);
    setUploadError(null);
    dispatchMeasurement({ type: 'clear' });
  }, [replaceModels]);

  const handleUpload = useCallback(async (files: File[]): Promise<void> => {
    if (files.length === 0) return;
    setUploadBusy(true);
    setUploadError(null);
    try {
      const next = await loadUploadedModels(selectUploadedFiles(files, uploadMode));
      try {
        if (uploadMode === 'merge' && geographicMerge) createGeographicPlacements(next);
      } catch (reason) {
        releaseUploadedModels(next);
        throw reason;
      }
      replaceModels(next);
      setUploadedNames(selectUploadedFiles(files, uploadMode).map((file) => file.name));
      dispatchMeasurement({ type: 'clear' });
      setFocusDistance(null);
    } catch (reason: unknown) {
      setUploadError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setUploadBusy(false);
    }
  }, [geographicMerge, replaceModels, uploadMode]);

  const handleGeographicMergeChange = useCallback((enabled: boolean): void => {
    if (enabled && models.length > 0) {
      try { createGeographicPlacements(models); }
      catch (reason: unknown) { setUploadError(reason instanceof Error ? reason.message : String(reason)); return; }
    }
    setUploadError(null);
    setGeographicMerge(enabled);
  }, [models]);
  const handleUploadModeChange = useCallback((mode: UploadMode): void => {
    if (mode === 'merge' && geographicMerge && models.length > 0) {
      try { createGeographicPlacements(models); }
      catch (reason: unknown) {
        setGeographicMerge(false);
        setUploadError(`Geographic placement disabled: ${reason instanceof Error ? reason.message : String(reason)}`);
      }
    }
    else setUploadError(null);
    setUploadMode(mode);
  }, [geographicMerge, models]);

  useEffect(() => () => {
    if (modelsRef.current.length > 0) releaseUploadedModels(modelsRef.current);
  }, []);

  const handleHover = useCallback((value: HoverInfo | null) => setHover(value), []);
  const toggleMeasure = useCallback(() => dispatchMeasurement({ type: 'toggle' }), []);
  const clearMeasurement = useCallback(() => { dispatchMeasurement({ type: 'clear' }); setFocusDistance(null); }, []);
  const handlePick = useCallback((point: TerrainPoint) => dispatchMeasurement({ type: 'pick', point }), []);

  const analysisTerrain = useMemo(() => selectAnalysisTerrain(models), [models]);
  // Analyzable models sharing the reference CRS — used to collect mesh vertices from every tile.
  const analyzableModels = useMemo(() => {
    if (!analysisTerrain) return [];
    return models.filter((model) => model.metadata && model.grid
      && analysisTerrain.tiles.some((tile) => tile.metadata.asset_id === model.metadata?.asset_id));
  }, [analysisTerrain, models]);
  const viewerModels = models;
  const geographicPlacements = useMemo(() => {
    if (uploadMode !== 'merge' || !geographicMerge || models.length === 0) return undefined;
    try { return createGeographicPlacements(models); }
    catch (reason: unknown) { return undefined; }
  }, [geographicMerge, models, uploadMode]);

  const profile = useMemo(() => {
    if (!analysisTerrain || measurement.picks.length !== 2) return null;
    const gridOrTiles = analysisTerrain.tiles.length > 1 ? analysisTerrain.tiles : analysisTerrain.grid;
    return createSurfaceProfile(gridOrTiles, analysisTerrain.metadata, measurement.picks[0].projected, measurement.picks[1].projected, analysisConfig.profileSampleIntervalM);
  }, [analysisTerrain, measurement.picks]);
  const vertices = useMemo(() => {
    if (!analysisTerrain || !profile) return [];
    const allVertices = analyzableModels.flatMap((model) => (model.metadata ? extractProjectedVertices(model.gltf.scene, model.metadata) : []));
    return selectVerticesAlongLine(allVertices, profile.start, profile.end, analysisTerrain.metadata);
  }, [analysisTerrain, analyzableModels, profile]);
  const smoothed = useMemo(() => profile ? smoothProfile(profile.samples, analysisConfig.smoothingWindowM) : [], [profile]);
  const extrema = useMemo(() => profile ? extremaWithSlopes(detectExtrema(profile.samples, { smoothingWindowM: analysisConfig.smoothingWindowM, minProminenceM: analysisConfig.extremaMinProminenceM, minDistanceM: analysisConfig.extremaMinDistanceM }), (distance, side) => regressionSlopeAt(profile.samples, distance, analysisConfig.slopeRegressionWindowM, side)) : [], [profile]);
  const segmentSlopes = useMemo(() => profile ? calculateSegmentSlopes(profile.samples) : [], [profile]);
  const focusPoint = useMemo(() => {
    if (!profile || focusDistance === null || !analysisTerrain) return null;
    const sample = profile.samples.reduce((nearest, candidate) => Math.abs(candidate.distance - focusDistance) < Math.abs(nearest.distance - focusDistance) ? candidate : nearest, profile.samples[0]);
    if (sample.elevation === undefined) return null;
    return projectedToScene(analysisTerrain.metadata, sample.projected, sample.elevation);
  }, [analysisTerrain, focusDistance, profile]);

  return (
    <main className='app-shell'>
      <header className='app-header'>
        <div><span className='eyebrow'>Terrain 3D</span><h1>DEM surface explorer</h1></div>
        {analysisTerrain && <span className='asset-badge'>{analysisTerrain.metadata.asset_id} · schema v{analysisTerrain.metadata.schema_version}</span>}
      </header>
      <ModelUploadPanel mode={uploadMode} geographicMerge={geographicMerge} fileNames={uploadedNames} busy={uploadBusy} error={uploadError} onModeChange={handleUploadModeChange} onGeographicMergeChange={handleGeographicMergeChange} onFiles={handleUpload} onClear={clearUploadedModels} />
      <section className='viewer-layout'><div className='canvas-card'><TerrainViewer models={viewerModels} geographicPlacements={geographicPlacements} onHover={handleHover} measureMode={Boolean(analysisTerrain) ? measurement.active : false} onPick={handlePick} profile={profile} profileMetadata={analysisTerrain?.metadata} focusPoint={focusPoint} />{viewerModels.length === 0 && <div className='viewer-empty-state' aria-live='polite'><strong>Tải file 3D lên để bắt đầu</strong><span>Chọn file GLB/GLTF ở khung bên trên để hiển thị model.</span></div>}<div className='viewer-hint'>Drag to orbit · right-drag to pan · wheel to zoom</div>{analysisTerrain && <MeasureToolbar measuring={measurement.active} hasProfile={Boolean(profile)} profile={profile} onToggle={toggleMeasure} onClear={clearMeasurement} />}</div><HoverInfoPanel info={hover} /></section>
      {profile && <section className='analysis-layout'><ProfileChart profile={profile} vertices={vertices} extrema={extrema} smoothed={smoothed} onHoverDistance={setFocusDistance} /><SlopeTable slopes={segmentSlopes} extrema={extrema} /></section>}
    </main>
  );
}
