import React, { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import './styles.css';
import './styles/tokens.css';
import './styles/workspace.css';
import './styles/incident-workspace.css';
import './features/incident/incident-tools.css';
import './features/search/search.css';
import './features/briefing/briefing.css';

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
import type { ViewControls } from './components/TerrainViewer';
import { Map2D } from './features/map/Map2D';
import { MapLocationPanel } from './features/map/MapLocationPanel';
import { readTerrainLocation, type MapLocation } from './features/map/mapLocation';
import { initialMeasurementSession, measurementSessionReducer } from './features/measurement/measurementSession';
import { Map3DBoundary } from './features/map/Map3DBoundary';
import { useRouteTerrainAnalysis } from './features/routes/useRouteTerrainAnalysis';
import { usePanelScroll } from './shared/hooks/usePanelScroll';
import { useModalFocus } from './shared/hooks/useModalFocus';
import { PanelResizeHandle } from './shared/ui/PanelResizeHandle';
import { useIncidentWorkspace } from './features/incident/useIncidentWorkspace';
import { effectiveRevision } from './features/incident/workspaceRevision';
import { RevisionNotice } from './features/incident/RevisionNotice';
import { NotificationCenter } from './features/incident/NotificationCenter';
import { ImageCompareDialog } from './features/comparison/ImageCompareDialog';
import type { ComparisonPair } from './features/comparison/comparison';
import { defaultLayerAppearance } from './features/map/layerAppearance';
import { LayerDetails } from './features/map/LayerDetails';
import { MapSearch } from './features/search/MapSearch';
import { searchWorkspace } from './features/search/searchIndex';
import { createDecisionSnapshot, type DecisionSnapshot } from './features/briefing/decisionSnapshot';
import { DecisionExportDialog } from './features/briefing/DecisionExportDialog';

import { preparedPacket } from './data/cheTaoScenario';
import { loadWorkspaceDataset } from './features/incident/loadWorkspaceDataset';
import type {
  ActiveDialog,
  CommunityFilter,
  DetailTab,
  FontChoice,
  ImpactTab,
  Locale,
  RoadFilter,
  WorkspaceView
} from './types/dear';
import type { LoadedModel, TerrainData, TerrainPoint, TerrainMetadata } from './types/terrain';

import { createGeographicPlacements } from './terrain/geographic';
import { loadModelFiles, releaseModels, loadTerrain3D } from './terrain/modelRuntime';
import type { ScenarioManifest } from './data/scenarioManifest';
import type { OverlayHit } from './terrain/scenarioOverlays';
import { sampleTiles } from './terrain/analysisTerrain';

const TerrainViewer = React.lazy(() => import('./components/TerrainViewer').then(module => ({ default: module.TerrainViewer })));
const defaultLayers = { aoi: true, imagery: true, context: true, hillshade: true, landslide: true, flood: true, roads: true, status: true, communities: true, staging: true, hlz: true, route: true };

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
  const [mapQuery, setMapQuery] = useState('');
  const [decisionSnapshot, setDecisionSnapshot] = useState<DecisionSnapshot | null>(null);
  const [comparisonPair, setComparisonPair] = useState<ComparisonPair | null>(null);
  const [layerAppearance, setLayerAppearance] = useState(defaultLayerAppearance);
  const [reportApplied, setReportApplied] = useState(false);
  const [historical, setHistorical] = useState(false);
  const updated = effectiveRevision({ applied: reportApplied, historical });
  const [packet, setPacket] = useState(preparedPacket);
  const { roads, hazards, evidence, routes, assessments, communities, incident, responseSites } = useIncidentWorkspace(packet, updated);
  const [alertRead, setAlertRead] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [measureSession, dispatchMeasureSession] = useReducer(measurementSessionReducer, initialMeasurementSession);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  useEffect(() => { if (showProfile) setMeasurementOpen(false); }, [showProfile]);
  const [mapMode, setMapMode] = useState<'3d' | '2d'>('2d');
  const [mobileView, setMobileView] = useState<'map' | 'info'>('map');
  const [basemapState, setBasemapState] = useState<BasemapState>({ status: 'off', style: 'satellite', loaded: 0, total: 0 });
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationPoint, setLocationPoint] = useState<MapLocation | null>(null);
  useEffect(() => { if (measurementOpen || showProfile || activeDialog) setLocationOpen(false); }, [measurementOpen, showProfile, activeDialog]);
  const closeLocation = useCallback(() => { setLocationOpen(false); document.querySelector<HTMLButtonElement>('.map-location-trigger')?.focus(); }, []);
  const [evidenceModalId, setEvidenceModalId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<[string, string] | null>(null);
  const [showCustomUploadModal, setShowCustomUploadModal] = useState<boolean>(false);

  const [layers, setLayers] = useState<Record<string, boolean>>(defaultLayers);
  const offlineMode = useRef(false);

  // Models & Terrain State
  const [models, setModels] = useState<LoadedModel[]>([]);
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [geographicMerge, setGeographicMerge] = useState(true);
  const [uploadedNames, setUploadedNames] = useState<string[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [startupError, setStartupError] = useState(false);
  const [snapshotReady, setSnapshotReady] = useState(false);
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [scenarioManifest, setScenarioManifest] = useState<ScenarioManifest | null>(null);
  const [defaultTerrainData, setDefaultTerrainData] = useState<TerrainData | null>(null);
  const [terrain3DBusy, setTerrain3DBusy] = useState(false);
  const map2DViewport = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const modelsRef = useRef<LoadedModel[]>([]);
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

  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((msg: [string, string]) => {
    clearTimeout(toastTimer.current);
    setToastMessage(msg);
    toastTimer.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  const replaceModels = useCallback((next: LoadedModel[]): void => {
    const previous = modelsRef.current;
    modelsRef.current = next;
    setModels(next);
    if (previous.length > 0) releaseModels(previous);
  }, []);

  // Auto-load default Che Tao model on startup
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function loadDefault() {
      try {
        setUploadBusy(true);
        setStartupError(false);
        setSnapshotReady(false);
        const { manifest, packet: nextPacket, terrain: defaultTerrain, offline } = await loadWorkspaceDataset(controller.signal, import.meta.env.VITE_DEAR_API_BASE);
        if (cancelled) return;
        offlineMode.current = offline;
        if (!cancelled && offline) setLayers(previous => ({ ...previous, context: false }));
        setPacket(nextPacket);
        setDefaultTerrainData(defaultTerrain);
        setSnapshotReady(true);
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
      controller.abort();
    };
  }, [replaceModels, startupAttempt]);

  const handle3DUnavailable = useCallback(() => {
    setMapMode('2d');
    showToast(['Không mở được 3D. Đã chuyển sang bản đồ 2D.', '3D unavailable. Switched to the 2D map.']);
  }, [showToast]);

  useEffect(() => {
    if (mapMode !== '3d' || models.length || !defaultTerrainData || !scenarioManifest) return;
    let cancelled = false;
    const controller = new AbortController();
    setTerrain3DBusy(true);
    void loadTerrain3D({
      glb: scenarioManifest.terrain.glb.url, metadata: scenarioManifest.terrain.metadata.url, grid: scenarioManifest.terrain.grid.url
    }, defaultTerrainData, controller.signal).then(terrain => {
      const model: LoadedModel = { id: 'che-tao-default', name: 'che_tao_v2_tex.glb', ...terrain, objectUrls: [] };
      if (cancelled) { releaseModels([model]); return; }
      replaceModels([model]);
    }).catch(() => { if (!cancelled) handle3DUnavailable(); }).finally(() => { if (!cancelled) setTerrain3DBusy(false); });
    return () => { cancelled = true; controller.abort(); setTerrain3DBusy(false); };
  }, [mapMode, models.length, defaultTerrainData, scenarioManifest, replaceModels, handle3DUnavailable]);

  const clearUploadedModels = useCallback((): void => {
    replaceModels([]);
    setDefaultTerrainData(null);
    setUploadedNames([]);
    setUploadError(null);
    setShowProfile(false);
    setFocusDistance(null);
    setLocationPoint(null); setLocationOpen(false);
  }, [replaceModels]);

  const handleUpload = useCallback(
    async (files: File[]): Promise<void> => {
      if (files.length === 0) return;
      setUploadBusy(true);
      setUploadError(null);
      try {
        const { models: next, names } = await loadModelFiles(files, uploadMode);
        try {
          if (uploadMode === 'merge' && geographicMerge) createGeographicPlacements(next);
        } catch (reason) {
          releaseModels(next);
          throw reason;
        }
        replaceModels(next);
        setDefaultTerrainData(null);
        setUploadedNames(names);
        setLocationPoint(null); setLocationOpen(false);
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
      if (modelsRef.current.length > 0) releaseModels(modelsRef.current);
    },
    []
  );

  const handlePick = useCallback((point: TerrainPoint, metadata: TerrainMetadata) => setLocationPoint(readTerrainLocation(point, metadata)), []);

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
    () => (selectedCommunityId ? communities.find((c) => c.id === selectedCommunityId) || null : null),
    [selectedCommunityId, communities]
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

  const mapTerrain = useMemo(() => models[0]?.metadata && models[0]?.grid && models[0]?.gridBuffer
    ? { metadata: models[0].metadata, grid: models[0].grid, gridBuffer: models[0].gridBuffer } : defaultTerrainData, [models, defaultTerrainData]);
  const scenarioTerrainCompatible = Boolean(mapTerrain?.grid &&
    mapTerrain.metadata.crs.authority.toUpperCase() === 'EPSG' &&
    mapTerrain.metadata.crs.code === 32648 && mapTerrain.metadata.crs.linear_unit === 'metre');
  const analysisModels = useMemo(() => models.length ? models : defaultTerrainData ? [defaultTerrainData] : [], [models, defaultTerrainData]);
  const { analysisTerrain, routeProfile, focusPoint } =
    useRouteTerrainAnalysis(analysisModels, scenarioTerrainCompatible ? activeRoute : null, focusDistance);
  const communityTerrainCoverage = useMemo(() => {
    if (!analysisTerrain || analysisTerrain.metadata.crs.authority.toUpperCase() !== 'EPSG' || analysisTerrain.metadata.crs.code !== 32648) return null;
    return new Map(communities.map(community => [community.id,
      sampleTiles(analysisTerrain.tiles, community.projected.x, community.projected.y).elevation !== undefined
    ]));
  }, [analysisTerrain, communities]);

  const selectCommunity = useCallback((id: string) => {
    setPanelCollapsed(false);
    setMeasurementOpen(false);
    if (id === selectedCommunityId) {
      setSelectedObjectId(null);
      setMobileView('info');
      return;
    }
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
    setPanelCollapsed(false);
    setMeasurementOpen(false);
    setSelectedObjectId(id);
    setShowProfile(false);
    setFocusDistance(null);
    setMobileView('info');
    setActiveDialog(null);
  }, []);

  // Inspect map objects without losing the destination and route being reviewed.
  const handleOverlayHit = useCallback(
    (hit: OverlayHit) => {
      setPanelCollapsed(false);
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
    if (reportApplied && !historical) return;
    setMeasurementOpen(false);
    setReportApplied(true); setHistorical(false);
    setActiveDialog(null);
    showToast(['Đã cập nhật bản đồ', 'Map updated']);
  }, [showToast, reportApplied, historical]);

  const changeView = (next: WorkspaceView): void => {
    setPanelCollapsed(false);
    setMeasurementOpen(false);
    setView(next);
    setSelectedCommunityId(null);
    setSelectedObjectId(null);
    setShowProfile(false);
    setMobileView('info');
  };

  const mapResults = useMemo(() => searchWorkspace(mapQuery, { communities, roads, hazards, responseSites, aoi: packet.aoi }, locale),
    [mapQuery, communities, roads, hazards, responseSites, packet.aoi, locale]);

  const openDecisionExport = () => {
    if (!selectedCommunity) return;
    setDecisionSnapshot(createDecisionSnapshot({ packet, updated, community: selectedCommunity,
      assessment: assessments.get(selectedCommunity.id)!, route: activeRoute, roads, hazards, evidence, communities,
      terrainAssets: defaultTerrainData ? scenarioManifest?.terrain : undefined }));
    setActiveDialog('exportDecision');
  };

  return (
    <div ref={workspaceRef} className="workspace" data-mobile={mobileView} data-panel-collapsed={panelCollapsed}>
      <AppHeader
        locale={locale}
        incident={incident}
        report={packet.report}
        dataAvailable={snapshotReady}
        theme={theme}
        fontChoice={fontChoice}
        updated={updated}
        reportApplied={reportApplied}
        alertRead={alertRead}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        onToggleLocale={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
        onChangeFontChoice={setFontChoice}
        onOpenAlerts={() => {
          setAlertRead(true);
          setActiveDialog('alerts');
        }}
        onOpenData={() => setActiveDialog('data')}
        onOpenIncident={() => { setAlertRead(true); setActiveDialog(null); changeView('incident'); }}
        onOpenUpload={() => setShowCustomUploadModal(true)}
        onOpenTimeline={() => setActiveDialog('timeline')}
        onOpenNotifications={() => { setAlertRead(true); setActiveDialog('notificationCenter'); }}
        onReset={() => {
          dispatchMeasureSession({ type: 'reset' }); setPanelCollapsed(false);
          setLocationOpen(false); setLocationPoint(null);
          setReportApplied(false); setHistorical(false); setAlertRead(false); setActiveDialog(null);
          setSelectedCommunityId(null); setSelectedObjectId(null); setSelectedRouteType('candidate');
          setView('incident'); setDetailTab('decision'); setRoadFilter('all'); setImpactTab('roads');
          setCommunityFilter('all'); setRoadQuery(''); setCommunityQuery(''); setMapQuery('');
          setShowProfile(false); setFocusDistance(null); setMeasurementOpen(false); setMapMode('2d');
          setDecisionSnapshot(null); setMobileView('map'); viewControlRef.current?.resetView();
          setLayerAppearance(defaultLayerAppearance);
          setLayers({ ...defaultLayers, context: !offlineMode.current });
          setComparisonPair(null); map2DViewport.current = null;
          if (!defaultTerrainData) { replaceModels([]); setStartupAttempt(value => value + 1); }
          showToast(['Đã đặt lại phiên làm việc', 'Workspace reset']);
        }}
        activeModelName={models[0]?.name}
      />

      <main className="work-area">
        <WorkspaceNav view={view} locale={locale} onChangeView={changeView} />
        <aside id="response-panel" ref={sidebarRef} className="sidebar" aria-label={locale === 'vi' ? 'Thông tin ứng phó' : 'Response information'}>
          {!snapshotReady ? <div className="sidebar-top"><h1>{startupError ? (locale === 'vi' ? 'Chưa tải được dữ liệu' : 'Dataset unavailable') : (locale === 'vi' ? 'Đang tải dữ liệu' : 'Loading dataset')}</h1>{startupError && <button className="button soft" onClick={() => setStartupAttempt(attempt => attempt + 1)}>{locale === 'vi' ? 'Thử lại' : 'Retry'}</button>}</div> : selectedObjectId ? (
            <ObjectDetailView
              objectId={selectedObjectId}
              aoi={packet.aoi}
              parentName={selectedCommunity?.name}
              locale={locale}
              roads={roads}
              hazards={hazards}
              evidence={evidence}
              communities={communities}
              responseSites={responseSites}
              routes={routes}
              onBack={() => setSelectedObjectId(null)}
              onSelectCommunity={selectCommunity}
              onSelectObject={inspectObject}
              onOpenEvidence={(hzId) => {
                setEvidenceModalId(hzId);
                setActiveDialog('evidence');
              }}
              onOpenPriority={() => { setCommunityFilter('all'); setCommunityQuery(''); changeView('priority'); }}
            />
          ) : selectedCommunity && selectedRoutePair ? (
            <CommunityDetailView
              community={selectedCommunity}
              terrainCovered={communityTerrainCoverage?.get(selectedCommunity.id) ?? null}
              assessment={assessments.get(selectedCommunity.id)!}
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
              onExport={openDecisionExport}
            />
          ) : view === 'incident' ? (
            <IncidentView
              incident={incident}
              onOpenArea={() => inspectObject(`aoi:${packet.aoi.id}`)}
              locale={locale}
              updated={updated}
              communities={communities}
              routes={routes}
              blockedRoadCount={roads.filter(road => road.status === 'blocked').length}
              uncertainRoadCount={roads.filter(road => road.status === 'uncertain').length}
              onSelectCommunity={selectCommunity}
              onOpenTimeline={() => setActiveDialog('timeline')}
              onOpenData={() => setActiveDialog('data')}
              onOpenCommunities={() => { setCommunityFilter('all'); setCommunityQuery(''); changeView('priority'); }}
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
              onNext={() => { setCommunityFilter('priority'); setCommunityQuery(''); changeView('priority'); }}
            />
          ) : (
            <CommunityListView
              communities={communities}
              locale={locale}
              filter={communityFilter}
              query={communityQuery}
              onChangeQuery={setCommunityQuery}
              onChangeFilter={setCommunityFilter}
              onSelectCommunity={selectCommunity}
              selectedId={selectedCommunityId}
              routes={routes}
            />
          )}
        </aside>

        <PanelResizeHandle locale={locale}/>

        <section className="map-area" aria-label={locale === 'vi' ? 'Bản đồ ứng phó' : 'Response map'} data-profile={showProfile} data-locating={locationOpen}>
          {historical && reportApplied && <RevisionNotice locale={locale} timestamp={incident.asOf} onLatest={() => setHistorical(false)}/>}
          {mapMode === '2d' ? <Map2D
            terrain={mapTerrain}
            profileOpen={showProfile}
            locationOpen={locationOpen}
            locationPoint={locationPoint}
            onLocation={setLocationPoint}
            measurementOpen={measurementOpen}
            measureSession={measureSession}
            dispatchMeasureSession={dispatchMeasureSession}
            onCloseMeasurement={() => { setMeasurementOpen(false); document.querySelector<HTMLButtonElement>('.map-measure-trigger')?.focus(); }}
            imageUrl={defaultTerrainData ? scenarioManifest?.terrain.image?.url : undefined}
            viewportRef={map2DViewport}
            locale={locale}
            focusPoint={showProfile ? focusPoint : null}
            profileMetadata={analysisTerrain?.metadata}
            onBasemapState={setBasemapState}
            scenarioProps={snapshotReady && scenarioTerrainCompatible ? { aoi: packet.aoi, communities: communities, responseSites: responseSites, hazards, roads, selectedRoute: activeRoute, selectedCommunityId, selectedObjectId, layers, appearance: layerAppearance } : undefined}
            onSelectOverlayHit={handleOverlayHit}
            viewControlRef={viewControlRef}
          /> : <Map3DBoundary onUnavailable={handle3DUnavailable}><React.Suspense fallback={<div className="map-load-state" role="status">{locale === 'vi' ? 'Đang mở địa hình 3D' : 'Opening 3D terrain'}</div>}><TerrainViewer
            models={models}
            geographicPlacements={geographicPlacements}
            measureMode={locationOpen}
            onPick={handlePick}
            profile={showProfile ? routeProfile : null}
            profileMetadata={analysisTerrain?.metadata}
            focusPoint={locationOpen ? locationPoint?.scene : showProfile ? focusPoint : null}
            mapMode={mapMode}
            theme={theme}
            locale={locale}
            onBasemapState={setBasemapState}
            scenarioProps={snapshotReady && scenarioTerrainCompatible ? {
              aoi: packet.aoi,
              communities: communities,
              responseSites: responseSites,
              hazards,
              roads: roads,
              selectedRoute: activeRoute,
              selectedCommunityId: selectedCommunityId,
              selectedObjectId: selectedObjectId,
              layers: layers,
              appearance: layerAppearance
            } : undefined}
            onSelectOverlayHit={handleOverlayHit}
            viewControlRef={viewControlRef}
            onUnavailable={handle3DUnavailable}
          /></React.Suspense></Map3DBoundary>}

          {((!mapTerrain && uploadBusy) || (mapMode === '3d' && terrain3DBusy)) && (
            <div className="map-load-state" role="status">{locale === 'vi' ? 'Đang mở bản đồ địa hình' : 'Opening terrain map'}</div>
          )}
          {!mapTerrain && startupError && (
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
            panelCollapsed={panelCollapsed}
            onTogglePanel={() => setPanelCollapsed(value => !value)}
            locale={locale}
            mapMode={mapMode}
            onToggleMapMode={() => setMapMode(mapMode === '3d' ? '2d' : '3d')}
            onZoomIn={() => viewControlRef.current?.zoomIn()}
            onZoomOut={() => viewControlRef.current?.zoomOut()}
            onResetView={() => viewControlRef.current?.resetView()}
            onOpenLayers={() => {
              setMeasurementOpen(false);
              if (activeDialog !== 'layers') { setShowProfile(false); setFocusDistance(null); }
              setActiveDialog(activeDialog === 'layers' ? null : 'layers');
            }}
            layersOpen={activeDialog === 'layers'}
            layers={scenarioTerrainCompatible ? layers : {}}
            hazards={scenarioTerrainCompatible ? hazards : []}
            hasSelectedRoute={scenarioTerrainCompatible && Boolean(activeRoute)}
            hasHLZData={scenarioTerrainCompatible && responseSites.some(site => site.kind === 'hlz')}
            measuring={measurementOpen}
            locating={locationOpen}
            onLocation={() => { setMeasurementOpen(false); setShowProfile(false); setActiveDialog(null); setLocationOpen(open => !open); }}
            affectedOnly={layerAppearance.roads === 'affected'}
            onMeasure={() => { setShowProfile(false); setFocusDistance(null); setActiveDialog(null); setMapMode('2d'); setMeasurementOpen(open => !open); }}
          >
          <MapSearch locale={locale} query={mapQuery} onQuery={setMapQuery} results={mapResults} disabled={!snapshotReady}
            onSelect={result => {
              setPanelCollapsed(false);
              const [kind, id] = result.key.split(':');
              const hazard = kind === 'hazard' ? hazards.find(h => h.id === id) : undefined;
              const site = kind === 'poi' ? responseSites.find(s => s.id === id) : undefined;
              const layer = kind === 'community' ? 'communities' : kind === 'road' ? 'roads' : kind === 'aoi' ? 'aoi'
                : site?.kind ?? (hazard?.kind === 'landslide' ? 'landslide' : hazard?.kind === 'flood' ? 'flood' : 'status');
              setLayers(previous => ({ ...previous, [layer]: true }));
              if (kind === 'community' && id === selectedCommunityId) { setSelectedObjectId(null); setMobileView('info'); }
              else if (kind === 'community') selectCommunity(id);
              else inspectObject(result.key);
              viewControlRef.current?.focusProjected(result.projected);
            }}/>
          </MapControls>
          <MapAttribution locale={locale} state={basemapState} onRetry={() => viewControlRef.current?.retryBasemap()} localSource={mapTerrain ? defaultTerrainData ? ['Ảnh Sentinel-2 và địa hình Chế Tạo', 'Sentinel-2 imagery and Chế Tạo terrain'] : ['Lưới độ cao từ mô hình đã tải lên', 'Elevation grid from the uploaded model'] : undefined}/>
          {locationOpen && <MapLocationPanel locale={locale} point={locationPoint} onClose={closeLocation}/>}

          {activeDialog === 'layers' && (
            <LayersDialog
              locale={locale}
              layers={layers}
              appearance={layerAppearance}
              mapMode={mapMode}
              onAppearance={setLayerAppearance}
              onCompare={() => { setMeasurementOpen(false); setActiveDialog('comparison'); }}
              renderInfo={id => <LayerDetails id={id} locale={locale} packet={packet} updated={updated} evidence={evidence} terrain={mapTerrain?.metadata} route={activeRoute} imagery={layers.imagery}/>}
              hasFloodData={hazards.some(hazard => hazard.kind === 'flood')}
              hasHLZData={responseSites.some(site => site.kind === 'hlz')}
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
      {activeDialog === 'comparison' && <ImageCompareDialog pair={comparisonPair} onPair={setComparisonPair} triggeredAt={incident.triggeredAt} locale={locale} onClose={() => setActiveDialog(null)}/>}
      {activeDialog === 'exportDecision' && decisionSnapshot && <DecisionExportDialog snapshot={decisionSnapshot}
        terrain={defaultTerrainData} imageUrl={scenarioManifest?.terrain.image?.url} locale={locale} onClose={() => setActiveDialog(null)}/>}
      {activeDialog === 'alerts' && (
        <NotificationDialog
          locale={locale}
          report={packet.report}
          updated={reportApplied}
          historical={historical}
          onApplyReport={handleSimulateUpdate}
          onClose={() => setActiveDialog(null)}
          onSelectRoad={inspectObject}
        />
      )}

      {activeDialog === 'notificationCenter' && <NotificationCenter packet={packet} applied={reportApplied} locale={locale} onClose={() => setActiveDialog(null)} onOpenReport={() => setActiveDialog('alerts')} onInspect={inspectObject}/>}
      {activeDialog === 'timeline' && <TimelineDialog locale={locale} incident={incident} report={packet.report} updated={reportApplied} historical={historical} onRevision={value => { setHistorical(value); setActiveDialog(null); setShowProfile(false); setMeasurementOpen(false); }} onClose={() => setActiveDialog(null)} />}

      {activeDialog === 'data' && (
        <DataDialog
          incident={incident}
          locale={locale}
          updated={updated}
          manifest={defaultTerrainData ? scenarioManifest : null}
          terrainMetadata={mapTerrain?.metadata}
          onClose={() => setActiveDialog(null)}
        />
      )}

      {activeDialog === 'evidence' && evidenceModalId && (
        <EvidenceDialog
          evidence={evidence.find(item => item.hazardId === evidenceModalId)}
          hazard={hazards.find(item => item.id === evidenceModalId)}
          roads={roads}
          locale={locale}
          onClose={() => setActiveDialog(null)}
          onSelectRoad={inspectObject}
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
