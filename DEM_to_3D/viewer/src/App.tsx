import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import './styles/tokens.css';
import './styles/workspace.css';
import './styles/incident-workspace.css';
import './styles.css';

import { AppHeader } from './components/dear/AppHeader';
import { WorkspaceNav } from './components/dear/WorkspaceNav';
import { IncidentView } from './components/dear/IncidentView';
import { ImpactView } from './components/dear/ImpactView';
import { CommunityListView } from './components/dear/CommunityListView';
import { CommunityDetailView } from './components/dear/CommunityDetailView';
import { ObjectDetailView } from './components/dear/ObjectDetailView';
import { MapControls } from './components/dear/MapControls';
import { ProfileDrawer } from './components/dear/ProfileDrawer';
import { NotificationDialog } from './components/dear/NotificationDialog';
import { DataDialog } from './components/dear/DataDialog';
import { LayersDialog } from './components/dear/LayersDialog';
import { EvidenceDialog } from './components/dear/EvidenceDialog';
import { SegmentAnalysisDialog } from './components/dear/SegmentAnalysisDialog';

import { ModelUploadPanel, type UploadMode } from './components/ModelUploadPanel';
import { HoverInfoPanel } from './components/HoverInfo';
import { TerrainViewer, type ViewControls } from './components/TerrainViewer';

import {
  cheTaoIncident,
  initialCommunities,
  initialHazards,
  initialRoadSegments,
  buildScenarioRoutes
} from './data/cheTaoScenario';
import type {
  ActiveDialog,
  CommunityFilter,
  DetailTab,
  Locale,
  RoadFilter,
  RoadSegment,
  WorkspaceView
} from './types/dear';
import type { HoverInfo, LoadedModel, TerrainPoint } from './types/terrain';

import { createGeographicPlacements } from './terrain/geographic';
import { loadUploadedModels, releaseUploadedModels, selectUploadedFiles } from './terrain/upload';
import { selectAnalysisTerrain } from './terrain/analysisTerrain';
import { createSurfaceProfile } from './terrain/profile';
import { detectExtrema, extremaWithSlopes, smoothProfile } from './terrain/extrema';
import { calculateSegmentSlopes, regressionSlopeAt } from './terrain/slope';
import { extractProjectedVertices, selectVerticesAlongLine } from './terrain/vertex';
import { initialMeasurementState, measurementReducer } from './state/measurementStore';
import { projectedToScene } from './terrain/coordinate';
import { loadTerrain } from './terrain/loadTerrain';
import type { OverlayHit } from './terrain/scenarioOverlays';

const analysisConfig = {
  profileSampleIntervalM: 15,
  smoothingWindowM: 50,
  extremaMinProminenceM: 8,
  extremaMinDistanceM: 100,
  slopeRegressionWindowM: 50
};

export default function App(): JSX.Element {
  // Scenario & DEAR Workspace State
  const [locale, setLocale] = useState<Locale>('vi');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [view, setView] = useState<WorkspaceView>('incident');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'candidate' | 'direct'>('candidate');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('decision');
  const [roadFilter, setRoadFilter] = useState<RoadFilter>('all');
  const [communityFilter, setCommunityFilter] = useState<CommunityFilter>('all');
  const [updated, setUpdated] = useState<boolean>(false);
  const [alertRead, setAlertRead] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<'3d' | '2d'>('3d');
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [evidenceModalId, setEvidenceModalId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showCustomUploadModal, setShowCustomUploadModal] = useState<boolean>(false);

  const [layers, setLayers] = useState<Record<string, boolean>>({
    imagery: true,
    hillshade: true,
    landslide: true,
    flood: true,
    roads: true,
    status: true,
    communities: true,
    staging: true,
    route: true,
    aoi: true
  });

  // Dynamic Road Segments & Routes
  const [roads, setRoads] = useState<RoadSegment[]>(initialRoadSegments);
  const routes = useMemo(() => buildScenarioRoutes(roads), [roads]);

  // Models & Terrain State
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
  const viewControlRef = useRef<ViewControls | null>(null);

  // Synchronize document theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Show Toast Helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  const replaceModels = useCallback((next: LoadedModel[]): void => {
    const previous = modelsRef.current;
    modelsRef.current = next;
    setModels(next);
    if (previous.length > 0) releaseUploadedModels(previous);
  }, []);

  // Auto-load default Che Tao model on startup
  useEffect(() => {
    let cancelled = false;
    async function loadDefault() {
      try {
        setUploadBusy(true);
        const defaultTerrain = await loadTerrain({
          glb: '/terrain/che_tao_v2_tex.glb',
          metadata: '/terrain/che_tao_v2_tex.terrain.json',
          grid: '/terrain/che_tao_v2_tex.grid.bin'
        });
        if (cancelled) return;
        const loadedModel: LoadedModel = {
          id: 'che-tao-default',
          name: 'che_tao_v2_tex.glb',
          metadata: defaultTerrain.metadata,
          grid: defaultTerrain.grid,
          gridBuffer: defaultTerrain.gridBuffer,
          gltf: defaultTerrain.gltf,
          objectUrls: []
        };
        replaceModels([loadedModel]);
        setUploadedNames(['che_tao_v2_tex.glb']);
      } catch (err: unknown) {
        console.warn('Could not auto-load default terrain from public:', err);
      } finally {
        if (!cancelled) setUploadBusy(false);
      }
    }
    loadDefault();
    return () => {
      cancelled = true;
    };
  }, [replaceModels]);

  const clearUploadedModels = useCallback((): void => {
    replaceModels([]);
    setUploadedNames([]);
    setUploadError(null);
    dispatchMeasurement({ type: 'clear' });
  }, [replaceModels]);

  const handleUpload = useCallback(
    async (files: File[]): Promise<void> => {
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
        setShowCustomUploadModal(false);
      } catch (reason: unknown) {
        setUploadError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        setUploadBusy(false);
      }
    },
    [geographicMerge, replaceModels, uploadMode]
  );

  const handleGeographicMergeChange = useCallback(
    (enabled: boolean): void => {
      if (enabled && models.length > 0) {
        try {
          createGeographicPlacements(models);
        } catch (reason: unknown) {
          setUploadError(reason instanceof Error ? reason.message : String(reason));
          return;
        }
      }
      setUploadError(null);
      setGeographicMerge(enabled);
    },
    [models]
  );

  const handleUploadModeChange = useCallback(
    (mode: UploadMode): void => {
      if (mode === 'merge' && geographicMerge && models.length > 0) {
        try {
          createGeographicPlacements(models);
        } catch (reason: unknown) {
          setGeographicMerge(false);
          setUploadError(`Geographic placement disabled: ${reason instanceof Error ? reason.message : String(reason)}`);
        }
      } else setUploadError(null);
      setUploadMode(mode);
    },
    [geographicMerge, models]
  );

  useEffect(
    () => () => {
      if (modelsRef.current.length > 0) releaseUploadedModels(modelsRef.current);
    },
    []
  );

  const handleHover = useCallback((value: HoverInfo | null) => setHover(value), []);
  const handlePick = useCallback((point: TerrainPoint) => dispatchMeasurement({ type: 'pick', point }), []);

  const analysisTerrain = useMemo(() => selectAnalysisTerrain(models), [models]);
  const analyzableModels = useMemo(() => {
    if (!analysisTerrain) return [];
    return models.filter(
      (model) =>
        model.metadata &&
        model.grid &&
        analysisTerrain.tiles.some((tile) => tile.metadata.asset_id === model.metadata?.asset_id)
    );
  }, [analysisTerrain, models]);

  const geographicPlacements = useMemo(() => {
    if (uploadMode !== 'merge' || !geographicMerge || models.length === 0) return undefined;
    try {
      return createGeographicPlacements(models);
    } catch {
      return undefined;
    }
  }, [geographicMerge, models, uploadMode]);

  // Selected Community & Route objects
  const selectedCommunity = useMemo(
    () => (selectedCommunityId ? initialCommunities.find((c) => c.id === selectedCommunityId) || null : null),
    [selectedCommunityId]
  );

  const selectedRoutePair = useMemo(
    () => (selectedCommunityId ? routes.get(selectedCommunityId) || null : null),
    [routes, selectedCommunityId]
  );

  const activeRoute = useMemo(() => {
    if (!selectedRoutePair) return null;
    return selectedRouteType === 'direct' && selectedRoutePair.direct
      ? selectedRoutePair.direct
      : selectedRoutePair.candidate;
  }, [selectedRoutePair, selectedRouteType]);

  // Surface Profile derived from real DEM grid for the selected route
  const routeProfile = useMemo(() => {
    if (!analysisTerrain || !activeRoute || activeRoute.points.length < 2) return null;
    const startPt = activeRoute.points[0];
    const endPt = activeRoute.points[activeRoute.points.length - 1];
    const gridOrTiles = analysisTerrain.tiles.length > 1 ? analysisTerrain.tiles : analysisTerrain.grid;
    return createSurfaceProfile(
      gridOrTiles,
      analysisTerrain.metadata,
      startPt,
      endPt,
      analysisConfig.profileSampleIntervalM
    );
  }, [analysisTerrain, activeRoute]);

  const profileVertices = useMemo(() => {
    if (!analysisTerrain || !routeProfile) return [];
    const allVertices = analyzableModels.flatMap((model) =>
      model.metadata ? extractProjectedVertices(model.gltf.scene, model.metadata) : []
    );
    return selectVerticesAlongLine(allVertices, routeProfile.start, routeProfile.end, analysisTerrain.metadata);
  }, [analysisTerrain, analyzableModels, routeProfile]);

  const profileSmoothed = useMemo(
    () => (routeProfile ? smoothProfile(routeProfile.samples, analysisConfig.smoothingWindowM) : []),
    [routeProfile]
  );

  const profileExtrema = useMemo(
    () =>
      routeProfile
        ? extremaWithSlopes(
            detectExtrema(routeProfile.samples, {
              smoothingWindowM: analysisConfig.smoothingWindowM,
              minProminenceM: analysisConfig.extremaMinProminenceM,
              minDistanceM: analysisConfig.extremaMinDistanceM
            }),
            (dist, side) => regressionSlopeAt(routeProfile.samples, dist, analysisConfig.slopeRegressionWindowM, side)
          )
        : [],
    [routeProfile]
  );

  const profileSegmentSlopes = useMemo(
    () => (routeProfile ? calculateSegmentSlopes(routeProfile.samples) : []),
    [routeProfile]
  );

  const focusPoint = useMemo(() => {
    if (!routeProfile || focusDistance === null || !analysisTerrain) return null;
    const sample = routeProfile.samples.reduce(
      (nearest, candidate) =>
        Math.abs(candidate.distance - focusDistance) < Math.abs(nearest.distance - focusDistance)
          ? candidate
          : nearest,
      routeProfile.samples[0]
    );
    if (sample.elevation === undefined) return null;
    return projectedToScene(analysisTerrain.metadata, sample.projected, sample.elevation);
  }, [analysisTerrain, focusDistance, routeProfile]);

  // Click on 3D overlay objects
  const handleOverlayHit = useCallback(
    (hit: OverlayHit) => {
      if (hit.type === 'community') {
        setSelectedCommunityId(hit.id);
        setSelectedObjectId(null);
        setView('priority');
        setDetailTab('decision');
        setShowProfile(false);
      } else if (hit.type === 'road') {
        setSelectedObjectId(`road:${hit.id}`);
        setSelectedCommunityId(null);
        setShowProfile(false);
      } else if (hit.type === 'hazard') {
        setSelectedObjectId(`hazard:${hit.id}`);
        setSelectedCommunityId(null);
        setShowProfile(false);
      } else if (hit.type === 'poi') {
        setSelectedObjectId('poi:TOWN');
        setSelectedCommunityId(null);
        setShowProfile(false);
      }
    },
    []
  );

  // Simulate U-1 Incoming Field Update
  const handleSimulateUpdate = useCallback(() => {
    if (updated) return;
    setUpdated(true);
    setRoads((prevRoads) =>
      prevRoads.map((r) => {
        if (r.id === 'E13') {
          return {
            ...r,
            status: 'blocked',
            note: [
              'Tin mới 09:45: Đất đá tràn khe vùi lấp đường, xe không thể qua',
              'Update 09:45: Gully crossing blocked by debris, impassable'
            ]
          };
        }
        return r;
      })
    );
    setActiveDialog(null);
    showToast(
      locale === 'en'
        ? 'ALERT: PR-7 is blocked at U-1! Route requires reassessment.'
        : 'CẢNH BÁO: Tuyến PR-7 bị chặn tại U-1! Cần đánh giá lại phương án.'
    );
  }, [locale, showToast, updated]);

  return (
    <div className="workspace">
      <AppHeader
        locale={locale}
        theme={theme}
        updated={updated}
        alertRead={alertRead}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        onToggleLocale={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
        onOpenAlerts={() => {
          setAlertRead(true);
          setActiveDialog('alerts');
        }}
        onOpenData={() => setActiveDialog('data')}
        onOpenUpload={() => setShowCustomUploadModal(true)}
        activeModelName={models[0]?.name}
      />

      <main className="work-area">
        <aside className="sidebar" aria-label="Thông tin ứng phó">
          {selectedObjectId ? (
            <ObjectDetailView
              objectId={selectedObjectId}
              locale={locale}
              roads={roads}
              hazards={initialHazards}
              communities={initialCommunities}
              routes={routes}
              onBack={() => setSelectedObjectId(null)}
              onSelectCommunity={(id) => {
                setSelectedCommunityId(id);
                setSelectedObjectId(null);
                setView('priority');
                setDetailTab('decision');
              }}
              onOpenEvidence={(hzId) => {
                setEvidenceModalId(hzId);
                setActiveDialog('evidence');
              }}
              onOpenImpact={() => {
                setSelectedObjectId(null);
                setView('impact');
              }}
              onOpenPriority={() => {
                setSelectedObjectId(null);
                setView('priority');
              }}
            />
          ) : selectedCommunity && selectedRoutePair ? (
            <CommunityDetailView
              community={selectedCommunity}
              locale={locale}
              detailTab={detailTab}
              onChangeDetailTab={setDetailTab}
              onBack={() => {
                setSelectedCommunityId(null);
                setShowProfile(false);
              }}
              candidateRoute={selectedRoutePair.candidate}
              directRoute={selectedRoutePair.direct}
              selectedRouteType={selectedRouteType}
              onChangeRouteType={setSelectedRouteType}
              onToggleProfile={() => setShowProfile((p) => !p)}
              onOpenSources={() => {
                setEvidenceModalId(selectedCommunity.id);
                setActiveDialog('sources');
              }}
              onSelectObject={(obj) => setSelectedObjectId(obj)}
            />
          ) : view === 'incident' ? (
            <IncidentView
              incident={cheTaoIncident}
              locale={locale}
              updated={updated}
              communityCount={initialCommunities.length}
              onOpenTimeline={() => setActiveDialog('timeline')}
              onOpenData={() => setActiveDialog('data')}
              onNext={() => setView('impact')}
              onSelectObject={(obj) => setSelectedObjectId(obj)}
            />
          ) : view === 'impact' ? (
            <ImpactView
              roads={roads}
              hazards={initialHazards}
              locale={locale}
              roadFilter={roadFilter}
              onChangeRoadFilter={setRoadFilter}
              onSelectObject={(obj) => setSelectedObjectId(obj)}
              onNext={() => setView('priority')}
            />
          ) : (
            <CommunityListView
              communities={initialCommunities}
              locale={locale}
              filter={communityFilter}
              onChangeFilter={setCommunityFilter}
              onSelectCommunity={(id) => {
                setSelectedCommunityId(id);
                setDetailTab('decision');
              }}
              selectedId={selectedCommunityId}
            />
          )}
        </aside>

        <section className="map-area" aria-label="Bản đồ 3D tương tác">
          <WorkspaceNav view={view} locale={locale} onChangeView={setView} />

          <TerrainViewer
            models={models}
            geographicPlacements={geographicPlacements}
            onHover={handleHover}
            measureMode={false}
            onPick={handlePick}
            profile={routeProfile}
            profileMetadata={analysisTerrain?.metadata}
            focusPoint={focusPoint}
            mapMode={mapMode}
            theme={theme}
            scenarioProps={{
              communities: initialCommunities,
              hazards: initialHazards,
              roads: roads,
              selectedRoute: activeRoute,
              selectedCommunityId: selectedCommunityId,
              selectedObjectId: selectedObjectId,
              layers: layers
            }}
            onSelectOverlayHit={handleOverlayHit}
            viewControlRef={viewControlRef}
          />

          <MapControls
            locale={locale}
            mapMode={mapMode}
            onToggleMapMode={() => setMapMode(mapMode === '3d' ? '2d' : '3d')}
            onZoomIn={() => viewControlRef.current?.zoomIn()}
            onZoomOut={() => viewControlRef.current?.zoomOut()}
            onResetView={() => viewControlRef.current?.resetView()}
            onOpenLayers={() => setActiveDialog('layers')}
            hasSelectedRoute={Boolean(activeRoute)}
          />

          {showProfile && activeRoute && (
            <ProfileDrawer
              locale={locale}
              route={activeRoute}
              profile={routeProfile}
              vertices={profileVertices}
              extrema={profileExtrema}
              smoothed={profileSmoothed}
              segmentSlopes={profileSegmentSlopes}
              onHoverDistance={setFocusDistance}
              onClose={() => setShowProfile(false)}
            />
          )}

          {hover && (
            <div
              style={{
                position: 'absolute',
                top: '64px',
                left: '20px',
                zIndex: 9,
                maxWidth: '220px',
                pointerEvents: 'none'
              }}
            >
              <HoverInfoPanel info={hover} />
            </div>
          )}
        </section>
      </main>

      {/* Dialogs */}
      {activeDialog === 'alerts' && (
        <NotificationDialog
          locale={locale}
          updated={updated}
          onSimulateUpdate={handleSimulateUpdate}
          onClose={() => setActiveDialog(null)}
          onSelectRoad={(roadId) => {
            setSelectedObjectId(roadId);
            setSelectedCommunityId(null);
          }}
          onOpenIncident={() => {
            setView('incident');
            setSelectedCommunityId(null);
            setSelectedObjectId(null);
          }}
        />
      )}

      {activeDialog === 'data' && (
        <DataDialog
          locale={locale}
          updated={updated}
          onClose={() => setActiveDialog(null)}
          onPrint={() => window.print()}
        />
      )}

      {activeDialog === 'layers' && (
        <LayersDialog
          locale={locale}
          layers={layers}
          onToggleLayer={(layerId) =>
            setLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }))
          }
          onClose={() => setActiveDialog(null)}
        />
      )}

      {activeDialog === 'evidence' && evidenceModalId && (
        <EvidenceDialog
          evidenceId={evidenceModalId}
          locale={locale}
          updated={updated}
          onClose={() => setActiveDialog(null)}
        />
      )}

      {activeDialog === 'segmentAnalysis' && activeRoute && (
        <SegmentAnalysisDialog
          route={activeRoute}
          locale={locale}
          onClose={() => setActiveDialog(null)}
          onSelectEvidence={(hzId) => {
            setEvidenceModalId(hzId);
            setActiveDialog('evidence');
          }}
        />
      )}

      {showCustomUploadModal && (
        <div className="modal-overlay" onClick={() => setShowCustomUploadModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ width: '640px' }}>
            <div className="modal-head">
              <h2>{locale === 'en' ? 'Upload Custom 3D Terrain' : 'Tải lên mô hình 3D tùy chỉnh'}</h2>
              <button className="icon-button" onClick={() => setShowCustomUploadModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <ModelUploadPanel
                mode={uploadMode}
                geographicMerge={geographicMerge}
                fileNames={uploadedNames}
                busy={uploadBusy}
                error={uploadError}
                onModeChange={handleUploadModeChange}
                onGeographicMergeChange={handleGeographicMergeChange}
                onFiles={handleUpload}
                onClear={clearUploadedModels}
              />
            </div>
          </div>
        </div>
      )}

      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
}
