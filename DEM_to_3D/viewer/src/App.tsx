import React, { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import './styles.css';
import './styles/tokens.css';
import './styles/workspace.css';
import './styles/incident-workspace.css';

import { AppHeader } from './components/dear/AppHeader';
import { WorkspaceNav } from './components/dear/WorkspaceNav';
import { IncidentView } from './components/dear/IncidentView';
import { ImpactView } from './components/dear/ImpactView';
import { CommunityListView } from './components/dear/CommunityListView';
import { CommunityDetailView } from './components/dear/CommunityDetailView';
import { ObjectDetailView } from './components/dear/ObjectDetailView';
import { MapControls } from './components/dear/MapControls';
import { MapAttribution } from './components/dear/MapAttribution';
import type { BasemapState } from './terrain/regionalBasemap';
import { ProfileDrawer } from './components/dear/ProfileDrawer';
import { NotificationDialog } from './components/dear/NotificationDialog';
import { DataDialog } from './components/dear/DataDialog';
import { TimelineDialog } from './components/dear/TimelineDialog';
import { LayersDialog } from './components/dear/LayersDialog';
import { EvidenceDialog } from './components/dear/EvidenceDialog';
import { SegmentAnalysisDialog } from './components/dear/SegmentAnalysisDialog';
import { UiIcon } from './components/dear/UiIcon';

import { ModelUploadPanel, type UploadMode } from './components/ModelUploadPanel';
import { TerrainViewer, type ViewControls } from './components/TerrainViewer';
import { useRouteTerrainAnalysis } from './features/routes/useRouteTerrainAnalysis';
import { usePanelScroll } from './shared/hooks/usePanelScroll';
import { useModalFocus } from './shared/hooks/useModalFocus';

import {
  cheTaoIncident,
  initialCommunities,
  initialHazards,
  scenarioHazards,
  initialRoadSegments,
  buildScenarioRoutes
} from './data/cheTaoScenario';
import type {
  ActiveDialog,
  CommunityFilter,
  DetailTab,
  FontChoice,
  ImpactTab,
  Locale,
  RoadFilter,
  RoadSegment,
  WorkspaceView
} from './types/dear';
import type { LoadedModel, TerrainPoint } from './types/terrain';

import { createGeographicPlacements } from './terrain/geographic';
import { loadUploadedModels, releaseUploadedModels, selectUploadedFiles } from './terrain/upload';
import { initialMeasurementState, measurementReducer } from './state/measurementStore';
import { loadTerrain } from './terrain/loadTerrain';
import { loadScenarioManifest, type ScenarioManifest } from './data/scenarioManifest';
import type { OverlayHit } from './terrain/scenarioOverlays';
import { sampleTiles } from './terrain/analysisTerrain';

export default function App(): JSX.Element {
  // Scenario & DEAR Workspace State
  const [locale, setLocale] = useState<Locale>('vi');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [fontChoice, setFontChoice] = useState<FontChoice>(() => {
    try {
      const saved = window.localStorage.getItem('dear.font-choice');
      return saved === 'classic' || saved === 'plex' || saved === 'modern' ? saved : 'classic';
    } catch {
      return 'classic';
    }
  });
  const [view, setView] = useState<WorkspaceView>('incident');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [communityOrigin, setCommunityOrigin] = useState<{ view: WorkspaceView; objectId: string | null }>({ view: 'priority', objectId: null });
  const [selectedRouteType, setSelectedRouteType] = useState<'candidate' | 'direct'>('candidate');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('decision');
  const [roadFilter, setRoadFilter] = useState<RoadFilter>('all');
  const [communityFilter, setCommunityFilter] = useState<CommunityFilter>('all');
  const [roadQuery, setRoadQuery] = useState('');
  const [impactTab, setImpactTab] = useState<ImpactTab>('roads');
  const [communityQuery, setCommunityQuery] = useState('');
  const [updated, setUpdated] = useState<boolean>(false);
  const hazards = useMemo(() => scenarioHazards(updated), [updated]);
  const [alertRead, setAlertRead] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<'3d' | '2d'>('2d');
  const [mobileView, setMobileView] = useState<'map' | 'info'>('map');
  const [basemapState, setBasemapState] = useState<BasemapState>({ status: 'off', style: 'satellite', loaded: 0, total: 0 });
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [evidenceModalId, setEvidenceModalId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<[string, string] | null>(null);
  const [showCustomUploadModal, setShowCustomUploadModal] = useState<boolean>(false);

  const [layers, setLayers] = useState<Record<string, boolean>>({
    imagery: true,
    context: true,
    hillshade: true,
    landslide: true,
    flood: true,
    roads: true,
    status: true,
    communities: true,
    staging: true,
    route: true
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
  const [startupError, setStartupError] = useState(false);
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [scenarioManifest, setScenarioManifest] = useState<ScenarioManifest | null>(null);
  const modelsRef = useRef<LoadedModel[]>([]);
  const [measurement, dispatchMeasurement] = useReducer(measurementReducer, initialMeasurementState);
  const [focusDistance, setFocusDistance] = useState<number | null>(null);
  const viewControlRef = useRef<ViewControls | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const modalKey = showCustomUploadModal ? 'upload' : activeDialog === 'layers' ? null : activeDialog;
  useModalFocus(workspaceRef, modalKey, () => {
    setActiveDialog(null);
    setShowCustomUploadModal(false);
  });
  const panelKey = selectedObjectId
    ? `object:${selectedObjectId}`
    : selectedCommunityId
    ? `community:${selectedCommunityId}:${detailTab}`
    : view === 'impact'
    ? `impact:${impactTab}:${roadFilter}:${roadQuery}`
    : view === 'priority'
    ? `priority:${communityFilter}:${communityQuery}`
    : 'incident';
  usePanelScroll(sidebarRef, panelKey);

  // Synchronize document theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#142b31');
  }, [theme]);

  useLayoutEffect(() => {
    document.documentElement.dataset.font = fontChoice;
    try {
      window.localStorage.setItem('dear.font-choice', fontChoice);
    } catch {
      // The preference still works for this session when storage is unavailable.
    }
  }, [fontChoice]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === 'vi' ? 'DEAR | Bản đồ ứng phó' : 'DEAR | Response map';
  }, [locale]);

  // Show Toast Helper
  const showToast = useCallback((msg: [string, string]) => {
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
        setStartupError(false);
        const manifest = await loadScenarioManifest('/scenarios/che-tao/v0.1/manifest.json');
        if (manifest.incidentId !== cheTaoIncident.id ||
            manifest.snapshotAt !== cheTaoIncident.asOf ||
            manifest.counts.communities !== initialCommunities.length ||
            manifest.counts.roads !== initialRoadSegments.length ||
            manifest.counts.hazards !== initialHazards.length) {
          throw new Error('Scenario data does not match its manifest');
        }
        const defaultTerrain = await loadTerrain({
          glb: manifest.terrain.glb.url,
          metadata: manifest.terrain.metadata.url,
          grid: manifest.terrain.grid.url
        });
        const loadedModel: LoadedModel = {
          id: 'che-tao-default',
          name: 'che_tao_v2_tex.glb',
          metadata: defaultTerrain.metadata,
          grid: defaultTerrain.grid,
          gridBuffer: defaultTerrain.gridBuffer,
          gltf: defaultTerrain.gltf,
          objectUrls: []
        };
        if (cancelled || `${defaultTerrain.metadata.crs.authority}:${defaultTerrain.metadata.crs.code}` !== manifest.crs) {
          releaseUploadedModels([loadedModel]);
          if (cancelled) return;
          throw new Error('Terrain CRS does not match its manifest');
        }
        replaceModels([loadedModel]);
        setScenarioManifest(manifest);
        setUploadedNames(['che_tao_v2_tex.glb']);
      } catch (err: unknown) {
        console.warn('Could not auto-load default terrain from public:', err);
        if (!cancelled) setStartupError(true);
      } finally {
        if (!cancelled) setUploadBusy(false);
      }
    }
    loadDefault();
    return () => {
      cancelled = true;
    };
  }, [replaceModels, startupAttempt]);

  const clearUploadedModels = useCallback((): void => {
    replaceModels([]);
    setUploadedNames([]);
    setUploadError(null);
    setShowProfile(false);
    setFocusDistance(null);
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
        setShowProfile(false);
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

  const handlePick = useCallback((point: TerrainPoint) => dispatchMeasurement({ type: 'pick', point }), []);

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

  const scenarioTerrainCompatible = Boolean(models[0]?.grid &&
    models[0]?.metadata?.crs.authority.toUpperCase() === 'EPSG' &&
    models[0]?.metadata?.crs.code === 32648 && models[0]?.metadata?.crs.linear_unit === 'metre');
  const { analysisTerrain, routeProfile, focusPoint } =
    useRouteTerrainAnalysis(models, scenarioTerrainCompatible ? activeRoute : null, focusDistance);
  const communityTerrainCoverage = useMemo(() => {
    if (!analysisTerrain || analysisTerrain.metadata.crs.authority.toUpperCase() !== 'EPSG' || analysisTerrain.metadata.crs.code !== 32648) return null;
    return new Map(initialCommunities.map(community => [community.id,
      sampleTiles(analysisTerrain.tiles, community.projected.x, community.projected.y).elevation !== undefined
    ]));
  }, [analysisTerrain]);

  const selectCommunity = useCallback((id: string) => {
    if (!selectedCommunityId) setCommunityOrigin({ view, objectId: selectedObjectId });
    if (id !== selectedCommunityId) setSelectedRouteType('candidate');
    setSelectedCommunityId(id);
    setSelectedObjectId(null);
    setView('priority');
    setDetailTab('decision');
    setShowProfile(false);
    setFocusDistance(null);
    setMobileView('info');
  }, [selectedCommunityId, selectedObjectId, view]);

  const inspectObject = useCallback((id: string) => {
    setSelectedObjectId(id);
    setShowProfile(false);
    setFocusDistance(null);
    setMobileView('info');
    setActiveDialog(null);
  }, []);

  // Inspect map objects without losing the destination and route being reviewed.
  const handleOverlayHit = useCallback(
    (hit: OverlayHit) => {
      setMobileView('info');
      if (hit.type === 'community') {
        if (selectedCommunityId === hit.id) setSelectedObjectId(null);
        else selectCommunity(hit.id);
      } else inspectObject(`${hit.type}:${hit.id}`);
    },
    [selectCommunity, selectedCommunityId, inspectObject]
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
              'Quan sát 09:40, nhận 09:45: Đất đá tràn khe vùi lấp đường, xe không thể qua',
              'Observed 09:40, received 09:45: Gully crossing blocked by debris, impassable'
            ]
          };
        }
        return r;
      })
    );
    setActiveDialog(null);
    showToast(['Đã cập nhật bản đồ', 'Map updated']);
  }, [showToast, updated]);

  const changeView = (next: WorkspaceView): void => {
    setView(next);
    setSelectedCommunityId(null);
    setSelectedObjectId(null);
    setShowProfile(false);
    setMobileView('info');
  };

  return (
    <div ref={workspaceRef} className="workspace" data-mobile={mobileView}>
      <AppHeader
        locale={locale}
        theme={theme}
        fontChoice={fontChoice}
        updated={updated}
        alertRead={alertRead}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        onToggleLocale={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
        onChangeFontChoice={setFontChoice}
        onOpenAlerts={() => {
          setAlertRead(true);
          setActiveDialog('alerts');
        }}
        onOpenData={() => setActiveDialog('data')}
        onOpenUpload={() => setShowCustomUploadModal(true)}
        activeModelName={models[0]?.name}
      />

      <main className="work-area">
        <WorkspaceNav view={view} locale={locale} onChangeView={changeView} />
        <aside ref={sidebarRef} className="sidebar" aria-label={locale === 'vi' ? 'Thông tin ứng phó' : 'Response information'}>
          {selectedObjectId ? (
            <ObjectDetailView
              objectId={selectedObjectId}
              parentName={selectedCommunity?.name}
              locale={locale}
              roads={roads}
              hazards={hazards}
              communities={initialCommunities}
              routes={routes}
              onBack={() => setSelectedObjectId(null)}
              onSelectCommunity={selectCommunity}
              onOpenEvidence={(hzId) => {
                setEvidenceModalId(hzId);
                setActiveDialog('evidence');
              }}
              onOpenPriority={() => changeView('priority')}
            />
          ) : selectedCommunity && selectedRoutePair ? (
            <CommunityDetailView
              community={selectedCommunity}
              terrainCovered={communityTerrainCoverage?.get(selectedCommunity.id) ?? null}
              hazards={hazards}
              locale={locale}
              detailTab={detailTab}
              onChangeDetailTab={setDetailTab}
              onBack={() => {
                setSelectedCommunityId(null);
                setView(communityOrigin.view);
                setSelectedObjectId(communityOrigin.objectId);
                setShowProfile(false);
                setFocusDistance(null);
              }}
              candidateRoute={selectedRoutePair.candidate}
              directRoute={selectedRoutePair.direct}
              selectedRouteType={selectedRouteType}
              onChangeRouteType={(type) => {
                setSelectedRouteType(type);
                setFocusDistance(null);
              }}
              hasTerrainProfile={Boolean(routeProfile?.samples.some(sample => sample.elevation !== undefined))}
              onToggleProfile={() => { setFocusDistance(null); setShowProfile((p) => !p); setMobileView('map'); setActiveDialog(null); }}
              onOpenSources={() => {
                setActiveDialog('data');
              }}
              onSelectObject={inspectObject}
            />
          ) : view === 'incident' ? (
            <IncidentView
              incident={cheTaoIncident}
              locale={locale}
              updated={updated}
              communities={initialCommunities}
              routes={routes}
              blockedRoadCount={roads.filter(road => road.status === 'blocked').length}
              uncertainRoadCount={roads.filter(road => road.status === 'uncertain').length}
              onSelectCommunity={selectCommunity}
              onOpenTimeline={() => setActiveDialog('timeline')}
              onOpenData={() => setActiveDialog('data')}
              onOpenCommunities={() => { setCommunityFilter('all'); changeView('priority'); }}
              onOpenRoads={() => changeView('impact')}
            />
          ) : view === 'impact' ? (
            <ImpactView
              roads={roads}
              hazards={hazards}
              locale={locale}
              roadFilter={roadFilter}
              query={roadQuery}
              onChangeQuery={setRoadQuery}
              tab={impactTab}
              onChangeTab={setImpactTab}
              onChangeRoadFilter={setRoadFilter}
              onSelectObject={inspectObject}
              onNext={() => setView('priority')}
            />
          ) : (
            <CommunityListView
              communities={initialCommunities}
              locale={locale}
              filter={communityFilter}
              query={communityQuery}
              onChangeQuery={setCommunityQuery}
              onChangeFilter={setCommunityFilter}
              onSelectCommunity={selectCommunity}
              selectedId={selectedCommunityId}
            />
          )}
        </aside>

        <section className="map-area" aria-label={locale === 'vi' ? 'Bản đồ ứng phó' : 'Response map'} data-profile={showProfile}>
          <TerrainViewer
            models={models}
            geographicPlacements={geographicPlacements}
            measureMode={false}
            onPick={handlePick}
            profile={showProfile ? routeProfile : null}
            profileMetadata={analysisTerrain?.metadata}
            focusPoint={showProfile ? focusPoint : null}
            mapMode={mapMode}
            theme={theme}
            locale={locale}
            onBasemapState={setBasemapState}
            scenarioProps={scenarioTerrainCompatible ? {
              communities: initialCommunities,
              hazards,
              roads: roads,
              selectedRoute: activeRoute,
              selectedCommunityId: selectedCommunityId,
              selectedObjectId: selectedObjectId,
              layers: layers
            } : undefined}
            onSelectOverlayHit={handleOverlayHit}
            viewControlRef={viewControlRef}
          />

          {models.length === 0 && uploadBusy && (
            <div className="map-load-state" role="status">{locale === 'vi' ? 'Đang mở bản đồ địa hình' : 'Opening terrain map'}</div>
          )}
          {models.length === 0 && startupError && (
            <div className="map-load-state" role="alert">
              <strong>{locale === 'vi' ? 'Không mở được bản đồ địa hình' : 'Terrain map could not be opened'}</strong>
              <button className="button soft" onClick={() => setStartupAttempt(attempt => attempt + 1)}>
                {locale === 'vi' ? 'Thử lại' : 'Retry'}
              </button>
            </div>
          )}
          {models.length > 0 && !scenarioTerrainCompatible && <p className="map-model-note" role="status">
            {locale === 'vi' ? 'Chưa ghép lớp sự kiện: cần lưới độ cao và hệ tọa độ EPSG:32648.' : 'Incident layers require an elevation grid in EPSG:32648.'}
          </p>}

          <MapControls
            locale={locale}
            mapMode={mapMode}
            onToggleMapMode={() => setMapMode(mapMode === '3d' ? '2d' : '3d')}
            onZoomIn={() => viewControlRef.current?.zoomIn()}
            onZoomOut={() => viewControlRef.current?.zoomOut()}
            onResetView={() => viewControlRef.current?.resetView()}
            onOpenLayers={() => {
              if (activeDialog !== 'layers') { setShowProfile(false); setFocusDistance(null); }
              setActiveDialog(activeDialog === 'layers' ? null : 'layers');
            }}
            layersOpen={activeDialog === 'layers'}
            layers={scenarioTerrainCompatible ? layers : {}}
            hazards={scenarioTerrainCompatible ? hazards : []}
            hasSelectedRoute={scenarioTerrainCompatible && Boolean(activeRoute)}
            hasSelectedRoad={scenarioTerrainCompatible && Boolean(selectedObjectId?.startsWith('road:'))}
          />
          <MapAttribution locale={locale} state={basemapState} onRetry={() => viewControlRef.current?.retryBasemap()} />

          {activeDialog === 'layers' && (
            <LayersDialog
              locale={locale}
              layers={layers}
              hasFloodData={initialHazards.some(hazard => hazard.kind === 'flood')}
              hasSelectedRoute={Boolean(activeRoute)}
              hasIncidentLayers={scenarioTerrainCompatible}
              onToggleLayer={(layerId) => setLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }))}
              onClose={() => setActiveDialog(null)}
            />
          )}

          {showProfile && activeRoute && (
            <ProfileDrawer
              key={activeRoute.id}
              locale={locale}
              profile={routeProfile}
              onHoverDistance={setFocusDistance}
              onClose={() => { setShowProfile(false); setFocusDistance(null); }}
            />
          )}

        </section>
      </main>

      <nav className="mobile-view-switch" aria-label={locale === 'vi' ? 'Chế độ xem' : 'View'}>
        <button aria-pressed={mobileView === 'info'} onClick={() => setMobileView('info')}>{locale === 'vi' ? 'Thông tin' : 'Information'}</button>
        <button aria-pressed={mobileView === 'map'} onClick={() => setMobileView('map')}>{locale === 'vi' ? 'Bản đồ' : 'Map'}</button>
      </nav>

      {/* Dialogs */}
      {activeDialog === 'alerts' && (
        <NotificationDialog
          locale={locale}
          updated={updated}
          onApplyReport={handleSimulateUpdate}
          onSelectCommunity={selectCommunity}
          onClose={() => setActiveDialog(null)}
          onSelectRoad={inspectObject}
        />
      )}

      {activeDialog === 'timeline' && <TimelineDialog locale={locale} incident={cheTaoIncident} updated={updated} onClose={() => setActiveDialog(null)} />}

      {activeDialog === 'data' && (
        <DataDialog
          locale={locale}
          updated={updated}
          manifest={models[0]?.id === 'che-tao-default' ? scenarioManifest : null}
          terrainMetadata={models[0]?.metadata}
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
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="upload-dialog-title" onClick={(e) => e.stopPropagation()} style={{ width: '640px' }}>
            <div className="modal-head">
              <h2 id="upload-dialog-title">{locale === 'en' ? 'Terrain model' : 'Mô hình địa hình'}</h2>
              <button className="icon-button" onClick={() => setShowCustomUploadModal(false)} aria-label={locale === 'vi' ? 'Đóng' : 'Close'}>
                <UiIcon name="close" />
              </button>
            </div>
            <div className="modal-body">
              <ModelUploadPanel
                locale={locale}
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

      {toastMessage && <div className="toast" role="status">{toastMessage[locale === 'vi' ? 0 : 1]}</div>}
    </div>
  );
}
