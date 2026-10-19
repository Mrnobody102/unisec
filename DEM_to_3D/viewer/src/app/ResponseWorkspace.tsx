import { AssessmentTimeline } from '../features/incident/AssessmentTimeline';
import './workspace-layout.css';
import { visibleMapRecords } from '../features/map/visibleMapRecords';
import { useMapPreview } from '../features/map/useMapPreview';
import { landslideAreaOf } from '../features/landslides/landslideAreas';
import type { ScenarioTarget } from '../features/geodata/scenarioOverlay';
import type { ScenarioEdits } from '../features/access/scenarioEdits';
import { deriveIncidentWorkspace } from '../features/incident/deriveIncidentWorkspace';
import { scenarioProperties } from '../features/access/scenarioProperties';
import { UiIcon } from '../shared/ui/UiIcon';
import type { ScenarioRevision } from '../features/access/useScenarioRevision';
import {
  journeyMarkers,
  useRoadJourney
} from '../features/routes/useRoadJourney';
import { RoadJourneyPanel } from '../features/routes/RoadJourneyPanel';
import { gisJourneyPlaces } from '../features/routes/journeyPlaces';
import type { RenameScenario } from '../features/access/ScenarioLabels';
import type { DemoIdentity } from '../features/access/demoSession';
import { submissionOf } from '../features/access/submissions';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import '../styles.css';
import '../styles/tokens.css';
import '../styles/workspace.css';
import '../styles/incident-workspace.css';
import '../features/incident/incident-tools.css';
import '../features/search/search.css';
import '../features/briefing/briefing.css';

import { observationOf } from '../features/observations/model';
import { useGeometrySession } from '../features/geodata/useGeometrySession';
import { ResponseObservationCard } from '../features/observations/ResponseObservationCard';
import { PointGroupCard } from '../features/observations/PointGroupCard';
import { ResponsePanel } from './ResponsePanel';
import { ResponseDetails } from './ResponseDetails';
import { useResponseDetailLayout } from './useResponseDetailLayout';
import { useNotice } from '../shared/hooks/useNotice';
import { NoticeToast } from '../shared/ui/NoticeToast';
import { WorkspaceDialogs } from './WorkspaceDialogs';
import { AppHeader } from '../components/dear/AppHeader';
import { WorkspaceNav } from '../components/dear/WorkspaceNav';
import { MapControls } from '../components/dear/MapControls';
import { MapAttribution } from '../components/dear/MapAttribution';
import { ProfileDrawer } from '../components/dear/ProfileDrawer';
import { LayersDialog } from '../components/dear/LayersDialog';

import type {
  ViewControls,
  OverlayHit,
  BasemapState,
  MapContextRequest
} from '../features/map/mapContracts';
import {
  ContextMenu,
  type ContextMenuItem,
  type ContextMenuRequest
} from '../shared/ui/ContextMenu';
import { roadProjected } from '../features/routes/selectedRoadJourney';
import { measurementPoint, useMeasurementSession } from '../features/measurement';
import { useDrawSession } from '../features/drawing';
import { drawingMessages } from '../features/drawing/locales';
import { Map2D } from '../features/map/Map2D';
import { MapLocationPanel } from '../features/map/MapLocationPanel';
import {
  readMapLocation,
  readTerrainLocation,
  type MapLocation
} from '../features/map/mapLocation';
import type { useTerrainWorkspace } from '../features/terrain/useTerrainWorkspace';
import type { IncidentPacket } from '../data/incidentPacket';
import type { useWorkspacePreferences } from './useWorkspacePreferences';
import { Map3DBoundary } from '../features/map/Map3DBoundary';
import { useRouteTerrainAnalysis } from '../features/routes/useRouteTerrainAnalysis';
import { selectAccessRoute } from '../features/routes/routeReview';
import { useModalFocus } from '../shared/hooks/useModalFocus';
import { useIncidentWorkspace } from '../features/incident/useIncidentWorkspace';
import { effectiveRevision } from '../features/incident/workspaceRevision';
import { RevisionNotice } from '../features/incident/RevisionNotice';
import { useResponseWork } from '../features/incident/useResponseWork';
import { responseWork } from '../features/incident/responseWork';
import type { ComparisonPair } from '../features/comparison/comparison';
import { defaultLayerAppearance } from '../features/map/layerAppearance';
import { MapSearch } from '../features/search/MapSearch';
import { searchWorkspace } from '../features/search/searchIndex';
import {
  createDecisionSnapshot,
  type DecisionSnapshot
} from '../features/briefing/decisionSnapshot';

import type { WorkspaceView } from '../types/dear';
import type { TerrainPoint, TerrainMetadata } from '../types/terrain';

import { sampleTiles } from '../terrain/analysisTerrain';
import { useWorkspaceNavigation } from './useWorkspaceNavigation';
import type { useWorkspaceInteraction } from './useWorkspaceInteraction';

const loadTerrainViewer = () => import('../components/TerrainViewer');
const TerrainViewer = React.lazy(() =>
  loadTerrainViewer().then((module) => ({
    default: module.TerrainViewer
  }))
);
const defaultLayers = {
  gis: true,
  aoi: true,
  imagery: true,
  context: true,
  hillshade: true,
  landslide: true,
  flood: true,
  roads: true,
  status: true,
  crossings: true,
  communities: true,
  staging: true,
  hlz: true,
  route: true
};

type Props = {
  revision: ScenarioRevision;
  onReportRevision: (applied: boolean) => void;
  identity: DemoIdentity;
  onSignOut: () => void;
  onRename: RenameScenario;
  scenarioEdits?: ScenarioEdits;
  preferences: ReturnType<typeof useWorkspacePreferences>;
  interaction: ReturnType<typeof useWorkspaceInteraction>;
  runtime: ReturnType<typeof useTerrainWorkspace> & { packet: IncidentPacket };
};

export function ResponseWorkspace({
  revision,
  onReportRevision,
  identity,
  onSignOut,
  onRename,
  scenarioEdits,
  preferences,
  interaction,
  runtime
}: Props): JSX.Element {
  const { locale, setLocale, theme, setTheme, fontChoice, setFontChoice } =
    preferences;
  const navigation = useWorkspaceNavigation();
  const gis = useGeometrySession();
  const [gisScenarioRequest, setGisScenarioRequest] = useState<ScenarioTarget | null>(null);
  const [gisCardId, setGisCardId] = useState<string | null>(() =>
    new URLSearchParams(location.search).get('gisPoint')
  );
  const [gisResponseView, setGisResponseView] = useState({
    version: 0,
    id: null as string | null
  });
  const gisCard = gis.records.find(
    (record) => record.id === gisCardId && record.visible
  );
  const [gisGroupIds, setGisGroupIds] = useState<string[]>([]);
  const gisGroup = gis.records.filter(
    (record) => record.visible && gisGroupIds.includes(record.id)
  );
  const showGisOnResponse = (id: string) => {
    gis.select(id);
    setGisCardId(id);
    setGisResponseView((previous) => ({ version: previous.version + 1, id }));
    const area = gis.records.find(record => record.id === id);
    setLayers((previous) => ({ ...previous, gis: true, ...(area && landslideAreaOf(area) ? {landslide: true} : {}) }));
    setPanelCollapsed(false);
    setGisGroupIds([]);
    setMapMode('2d');
    setMobileView('map');
    setActiveDialog(null);
  };
  const { view, selectedCommunityId, selectedRouteType, selectedObjectId } =
    navigation;
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('gisPoint');
    if (id && gis.records.some((record) => record.id === id)) {
      gis.select(id);
      gis.fit(id);
      setGisResponseView({ version: 1, id });
      setMapMode('2d');
      setMobileView('map');
    }
  }, []);
  const [mapQuery, setMapQuery] = useState('');
  const [decisionSnapshot, setDecisionSnapshot] =
    useState<DecisionSnapshot | null>(null);
  const [comparisonPair, setComparisonPair] = useState<ComparisonPair | null>(
    null
  );
  const [layerAppearance, setLayerAppearance] = useState(
    defaultLayerAppearance
  );
  const reportApplied = revision.applied,
    appliedAt = revision.at,
    setReportApplied = onReportRevision;
  const [workTaskId, setWorkTaskId] = useState<string | null>(null);
  const work = useResponseWork(runtime.packet.datasetVersion);
  const [historical, setHistorical] = useState(false);
  const updated = effectiveRevision({ applied: reportApplied, historical });
  const [alertRead, setAlertRead] = useState<boolean>(false);
  const {
    showProfile,
    measurementOpen,
    drawOpen,
    locationOpen,
    activeDialog,
    mapMode,
    setMapMode,
    setActiveDialog,
    focusDistance,
    setFocusDistance,
    resetTools,
    recover2D: handle3DUnavailable
  } = interaction;
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const { session: measureSession, dispatch: dispatchMeasureSession } =
    useMeasurementSession(mapMode, measurementOpen);
  const { session: drawSession, dispatch: dispatchDrawSession } = useDrawSession(mapMode, drawOpen);
  const [mobileView, setMobileView] = useState<'map' | 'info'>('map');
  const [basemapState, setBasemapState] = useState<BasemapState>({
    status: 'off',
    style: 'satellite',
    loaded: 0,
    total: 0
  });
  const [locationPoint, setLocationPoint] = useState<MapLocation | null>(null);
  const closeLocation = useCallback(() => {
    interaction.dispatch({ type: 'close-tool', tool: 'location' });
    document.querySelector<HTMLButtonElement>('.map-location-trigger')?.focus();
  }, [interaction.dispatch]);
  const [evidenceModalId, setEvidenceModalId] = useState<string | null>(null);
  const { notice, notify: showToast, dismiss: dismissToast } = useNotice();
  const [layers, setLayers] = useState<Record<string, boolean>>(() => ({
    ...defaultLayers,
    context: !runtime.offline
  }));

  const displayedGis = useMemo(() => historical ? [] : visibleMapRecords(gis.records, layers, runtime.packet.datasetVersion), [gis.records, layers, historical, runtime.packet.datasetVersion]);

  useEffect(() => {
    if (gisCardId && !displayedGis.some(record => record.id === gisCardId)) setGisCardId(null);
    setGisGroupIds(ids => ids.every(id => displayedGis.some(record => record.id === id)) ? ids : ids.filter(id => displayedGis.some(record => record.id === id)));
  }, [displayedGis, gisCardId]);

  const map2DViewport = useRef<{
    center: [number, number];
    zoom: number;
  } | null>(null);
  const viewControlRef = useRef<ViewControls | null>(null);
  const [viewReadyVersion, setViewReadyVersion] = useState(0);
  const onViewReady = useCallback(() => setViewReadyVersion(version => version + 1), []);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const detailReturnTarget = useRef<HTMLElement | null>(null);
  const profileReturnTarget = useRef<HTMLElement | null>(null);
  const detailLayout = useResponseDetailLayout(workspaceRef);
  const modalKey = interaction.dialog === 'layers' ? null : interaction.dialog;
  useModalFocus(workspaceRef, modalKey, () => {
    setActiveDialog(null);
  });

  const shownFallback = useRef(0);
  useEffect(() => {
    if (interaction.fallbackVersion <= shownFallback.current) return;
    shownFallback.current = interaction.fallbackVersion;
    showToast([
      'Không mở được 3D. Đã chuyển sang bản đồ 2D.',
      '3D unavailable. Switched to the 2D map.'
    ]);
  }, [interaction.fallbackVersion, showToast]);
  const {
    packet,
    manifest: scenarioManifest,
    defaultTerrain: defaultTerrainData,
    snapshotReady,
    startupError,
    offline: offlineMode,
    models,
    mode: uploadMode,
    geographicMerge,
    fileNames: uploadedNames,
    busy: uploadBusy,
    error: uploadError,
    loading3D: terrain3DBusy,
    progress3D,
    placements: geographicPlacements,
    retry: retryTerrain,
    reload: reloadTerrain,
    clear: clearTerrain,
    upload: uploadTerrain,
    changeMode: handleUploadModeChange,
    changeGeographicMerge: handleGeographicMergeChange
  } = runtime;
  const incidentSnapshot = useIncidentWorkspace(packet, updated, historical ? undefined : scenarioEdits?.edits, appliedAt);
  // Undo restores the status the road would have without that edit (including a field report
  // applied since), not the stored "from", which can be stale.
  const revertRoadStatus = (edits: ScenarioEdits, id: string): boolean => {
    const edit = edits.edits.find(item => item.id === id);
    if (edit?.change.kind !== 'status') return false;
    const current = incidentSnapshot.roads.find(road => road.id === edit.target.id)?.status;
    const previous = deriveIncidentWorkspace(packet, updated, edits.edits.filter(item => item.id !== id), appliedAt)
      .roads.find(road => road.id === edit.target.id)?.status;
    if (!current || !previous || current === previous) return false;
    return edits.record({ target: edit.target, change: { kind: 'status', from: current, to: previous },
      note: locale === 'vi' ? 'Hoàn tác thay đổi trước' : 'Undo previous change', reverts: id });
  };
  // Published landslide areas drawn on this road network; their road links can raise checks.
  const areaLinks = useMemo(() => gis.records.flatMap(record => {
    const area = landslideAreaOf(record);
    return area && area.networkVersion === packet.datasetVersion
      ? area.roadLinks.map(link => ({ areaId: record.id, areaName: record.name, roadId: link.roadId, relation: link.relation })) : [];
  }), [gis.records, packet.datasetVersion]);
  const workTasks = useMemo(
    () => responseWork(packet, incidentSnapshot, reportApplied, areaLinks),
    [packet, incidentSnapshot, reportApplied, areaLinks]
  );
  const {
    roads,
    hazards,
    evidence,
    routes,
    assessments,
    communities,
    incident,
    responseSites
  } = incidentSnapshot;
  useMapPreview(workspaceRef,key=>{const [kind,...rest]=key.split(':'),id=rest.join(':');const f=kind==='community'?communities.find(f=>f.id===id):kind==='hazard'?hazards.find(f=>f.id===id):kind==='poi'?responseSites.find(f=>f.id===id):roads.find(f=>f.id===id);if(f)return {point:'projected' in f?f.projected:f.points[Math.floor(f.points.length/2)],name:typeof f.name==='string'?f.name:f.name[locale==='vi'?0:1]};const r=gis.records.find(r=>r.id===id);if(r?.feature.geometry.type==='Point'){const [lon,lat]=r.feature.geometry.coordinates;return {point:roadProjected(lat,lon),name:r.name};}return null;});
  useEffect(() => {
    if (offlineMode) setLayers((previous) => ({ ...previous, context: false }));
  }, [offlineMode]);

  const resetTerrainTools = useCallback(() => {
    resetTools();
    setLocationPoint(null);
  }, [resetTools]);
  const clearUploadedModels = useCallback(() => {
    clearTerrain();
    resetTerrainTools();
  }, [clearTerrain, resetTerrainTools]);
  const handleUpload = useCallback(
    async (files: File[]) => {
      if (await uploadTerrain(files)) {
        resetTerrainTools();
      }
    },
    [uploadTerrain, resetTerrainTools]
  );

  const handlePick = useCallback(
    (point: TerrainPoint, metadata: TerrainMetadata) =>
      setLocationPoint(readTerrainLocation(point, metadata)),
    []
  );

  // Selected Community & Route objects
  const selectedCommunity = useMemo(
    () =>
      selectedCommunityId
        ? communities.find((c) => c.id === selectedCommunityId) || null
        : null,
    [selectedCommunityId, communities]
  );

  const selectedRoutePair = useMemo(
    () =>
      selectedCommunityId ? routes.get(selectedCommunityId) || null : null,
    [routes, selectedCommunityId]
  );

  const activeRoute = useMemo(() => {
    return selectAccessRoute(selectedRoutePair, selectedRouteType);
  }, [selectedRoutePair, selectedRouteType]);

  const mapTerrain = useMemo(
    () =>
      models[0]?.metadata && models[0]?.grid && models[0]?.gridBuffer
        ? {
            metadata: models[0].metadata,
            grid: models[0].grid,
            gridBuffer: models[0].gridBuffer
          }
        : defaultTerrainData,
    [models, defaultTerrainData]
  );
  const scenarioTerrainCompatible = Boolean(
    mapTerrain?.grid &&
    mapTerrain.metadata.crs.authority.toUpperCase() === 'EPSG' &&
    mapTerrain.metadata.crs.code === 32648 &&
    mapTerrain.metadata.crs.linear_unit === 'metre'
  );
  const analysisModels = useMemo(
    () =>
      models.length ? models : defaultTerrainData ? [defaultTerrainData] : [],
    [models, defaultTerrainData]
  );
  const journey = useRoadJourney(roads);
  const profileTarget = useMemo(
    () =>
      journey.open && journey.route
        ? journey.route
        : selectedObjectId?.startsWith('road:')
          ? (roads.find((road) => `road:${road.id}` === selectedObjectId) ??
            null)
          : activeRoute,
    [selectedObjectId, roads, activeRoute, journey.open, journey.route]
  );
  const { analysisTerrain, routeProfile, focusPoint } = useRouteTerrainAnalysis(
    analysisModels,
    scenarioTerrainCompatible ? profileTarget : null,
    focusDistance
  );
  const communityTerrainCoverage = useMemo(() => {
    if (
      !analysisTerrain ||
      analysisTerrain.metadata.crs.authority.toUpperCase() !== 'EPSG' ||
      analysisTerrain.metadata.crs.code !== 32648
    )
      return null;
    return new Map(
      communities.map((community) => [
        community.id,
        sampleTiles(
          analysisTerrain.tiles,
          community.projected.x,
          community.projected.y
        ).elevation !== undefined
      ])
    );
  }, [analysisTerrain, communities]);

  const returnDetailFocus = () => {
    requestAnimationFrame(() => {
      const detail = document.querySelector<HTMLElement>(
        '#response-details:not([hidden]) h1'
      );
      if (detail) {
        detail.focus({ preventScroll: true });
        return;
      }
      const previous = detailReturnTarget.current;
      if (previous?.isConnected && previous.getClientRects().length)
        previous.focus({ preventScroll: true });
      else
        document
          .querySelector<HTMLElement>(
            '#response-panel button, .workspace-nav button[aria-current="page"]'
          )
          ?.focus({ preventScroll: true });
    });
  };
  const rememberDetailTrigger = () => {
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active.closest('#response-panel, .map-toolbar, .workspace-nav')
    )
      detailReturnTarget.current = active;
    setGisCardId(null);
    setGisGroupIds([]);
  };
  const revealPanel = () => {
    setPanelCollapsed(false);
    setMobileView('info');
    resetTools();
  };
  const selectCommunity = (
    id: string,
    routeType?: 'candidate' | 'direct',
    sectionId?: string
  ) => {
    rememberDetailTrigger();
    setLayers(previous => ({...previous, communities:true}));
    navigation.dispatch({ type: 'select-community', id });
    if (routeType)
      navigation.dispatch({
        type: 'filters',
        values: { selectedRouteType: routeType, detailTab: 'decision' }
      });
    if (sectionId)
      navigation.dispatch({ type: 'route-section', id: sectionId });
    revealPanel();
  };
  const inspectObject = (id: string) => {
    if (id.startsWith('community:')) {
      selectCommunity(id.slice(10));
      return;
    }
    rememberDetailTrigger();
    const hazard = id.startsWith('hazard:') ? hazards.find(item => `hazard:${item.id}` === id) : undefined;
    const layer = hazard ? hazard.kind === 'landslide' ? 'landslide' : hazard.kind === 'flood' ? 'flood' : 'crossings'
      : id.startsWith('road:') ? 'roads' : id.startsWith('aoi:') ? 'aoi' : responseSites.find(item => `poi:${item.id}` === id)?.kind;
    if (layer) setLayers(previous => ({ ...previous, [layer]: true }));
    navigation.dispatch({ type: 'inspect-object', id });
    revealPanel();
  };
  const selectRouteSection = (id: string | null) => {
    navigation.dispatch({ type: 'route-section', id });
    setFocusDistance(null);
    setPanelCollapsed(false);
    setMobileView('info');
  };
  /** 3D start-up state: the mesh download is the long step, so it shows real progress. */
  const terrainLoading = (progress: number | null) => (
    <div className="map-load-state terrain-loading" role="status">
      <span>{locale === 'vi' ? 'Đang tải địa hình 3D' : 'Loading 3D terrain'}</span>
      {progress !== null && (
        <>
          <span
            className="terrain-loading-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label={locale === 'vi' ? 'Tiến độ tải' : 'Download progress'}
          >
            <i style={{ width: `${progress * 100}%` }} />
          </span>
          <small>{Math.round(progress * 100)}%</small>
        </>
      )}
    </div>
  );
  // Fetch the 3D viewer code alongside the mesh rather than after it arrives.
  useEffect(() => {
    if (mapMode === '3d') void loadTerrainViewer();
  }, [mapMode]);
  const handleOverlayHit = (hit: OverlayHit) => {
    if (hit.type === 'community') selectCommunity(hit.id);
    else if (
      hit.type === 'road' &&
      view === 'priority' &&
      activeRoute?.segs.some((road) => road.id === hit.id)
    )
      selectRouteSection(hit.id);
    else inspectObject(`${hit.type}:${hit.id}`);
  };

  const [mapMenu, setMapMenu] = useState<ContextMenuRequest | null>(null);
  const closeMapMenu = useCallback(() => setMapMenu(null), []);
  /** Right-click on the map: actions for the place or object under the pointer. */
  const openMapMenu = (request: MapContextRequest) => {
    const vi = locale === 'vi';
    const { latitude, longitude, hit } = request;
    const object =
      hit?.type === 'community'
        ? communities.find((item) => item.id === hit.id)
        : undefined;
    const site =
      hit?.type === 'poi'
        ? responseSites.find((item) => item.id === hit.id)
        : undefined;
    const hazard =
      hit?.type === 'hazard'
        ? hazards.find((item) => item.id === hit.id)
        : undefined;
    const road =
      hit?.type === 'road' ? roads.find((item) => item.id === hit.id) : undefined;
    const name =
      object?.name ??
      (site && site.name[vi ? 0 : 1]) ??
      (hazard && hazard.name[vi ? 0 : 1]) ??
      (road && (typeof road.name === 'string' ? road.name : road.name[vi ? 0 : 1]));
    const projected =
      object?.projected ??
      site?.projected ??
      hazard?.projected ??
      roadProjected(latitude, longitude);
    const source = object
      ? `community:${object.id}`
      : site
        ? `site:${site.id}`
        : 'map';
    const coordinates = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    const stop = (letter: 'A' | 'B') => (
      <span className={'context-menu-stop is-' + letter.toLowerCase()}>
        {letter}
      </span>
    );
    const directions = (side: 'start' | 'end') => () => {
      resetTools();
      journey.setOpen(true);
      journey.setPoint(side, projected, source, name);
    };
    const copy: ContextMenuItem = {
      id: 'copy',
      label: coordinates,
      detail: vi ? 'Sao chép' : 'Copy',
      icon: <UiIcon name="copy" size={16} />,
      onSelect: () => {
        void navigator.clipboard
          ?.writeText(coordinates)
          .then(() => showToast(['Đã sao chép tọa độ', 'Coordinates copied']));
      }
    };
    const point = measurementPoint(latitude, longitude);
    const items: ContextMenuItem[] = [
      ...(hit
        ? ([
            {
              id: 'details',
              label: vi ? 'Xem chi tiết' : 'Show details',
              icon: <UiIcon name="info" size={16} />,
              onSelect: () => handleOverlayHit(hit)
            },
            'separator'
          ] satisfies ContextMenuItem[])
        : ([copy, 'separator'] satisfies ContextMenuItem[])),
      {
        id: 'from',
        label: vi ? 'Chỉ đường từ đây' : 'Directions from here',
        icon: stop('A'),
        onSelect: directions('start')
      },
      {
        id: 'to',
        label: vi ? 'Chỉ đường đến đây' : 'Directions to here',
        icon: stop('B'),
        onSelect: directions('end')
      },
      'separator',
      ...(hit
        ? []
        : ([
            {
              id: 'here',
              label: vi ? 'Thông tin vị trí này' : "What's here?",
              icon: <UiIcon name="location" size={16} />,
              onSelect: () => {
                if (!locationOpen)
                  interaction.dispatch({ type: 'toggle-tool', tool: 'location' });
                setLocationPoint(readMapLocation(latitude, longitude, mapTerrain));
              }
            }
          ] satisfies ContextMenuItem[])),
      {
        id: 'measure',
        label: vi ? 'Đo khoảng cách từ đây' : 'Measure distance from here',
        icon: <UiIcon name="ruler" size={16} />,
        disabled: !point,
        onSelect: () => {
          if (!point) return;
          if (!measurementOpen)
            interaction.dispatch({ type: 'toggle-tool', tool: 'measure' });
          dispatchMeasureSession({ type: 'new' });
          dispatchMeasureSession({ type: 'mode', mode: 'distance' });
          dispatchMeasureSession({ type: 'points', points: [point] });
        }
      },
      {
        id: 'zoom',
        label: vi ? 'Phóng to tại đây' : 'Zoom in here',
        icon: <UiIcon name="zoomIn" size={16} />,
        onSelect: request.zoomHere
      },
      ...(hit ? (['separator', copy] satisfies ContextMenuItem[]) : [])
    ];
    setMapMenu({ x: request.clientX, y: request.clientY, title: name, items });
  };

  const reportRoad = roads.find((road) => road.id === packet.report.roadId);
  const pendingReport: [string, string] = [
    [packet.report.hazard.name[0], reportRoad?.name[0]].filter(Boolean).join(' · '),
    [packet.report.hazard.name[1], reportRoad?.name[1]].filter(Boolean).join(' · ')
  ];
  // Apply the reviewed field report as a new assessment.
  const handleSimulateUpdate = useCallback(() => {
    if (reportApplied && !historical) return;
    resetTools();
    setReportApplied(true);
    setHistorical(false);
    setActiveDialog(null);
    showToast(['Đã cập nhật bản đồ', 'Map updated']);
  }, [showToast, reportApplied, historical, resetTools, setReportApplied, setActiveDialog]);

  const changeView = (view: WorkspaceView) => {
    navigation.dispatch({ type: 'view', view, list: true });
    revealPanel();
  };
  const openList = (view: WorkspaceView) => {
    navigation.dispatch({ type: 'view', view, list: true });
    revealPanel();
  };
  const closeProfile = () => {
    interaction.dispatch({ type: 'close-tool', tool: 'profile' });
    requestAnimationFrame(() => {
      const previous = profileReturnTarget.current;
      if (previous?.isConnected && previous.getClientRects().length)
        previous.focus({ preventScroll: true });
      else
        document
          .querySelector<HTMLElement>('#response-details:not([hidden]) h1')
          ?.focus({ preventScroll: true });
    });
  };
  const toggleProfile = () => {
    if (showProfile) {
      closeProfile();
      return;
    }
    profileReturnTarget.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    interaction.dispatch({ type: 'toggle-tool', tool: 'profile' });
    setMobileView('map');
  };

  const mapResults = useMemo(
    () =>
      searchWorkspace(
        mapQuery,
        { communities, roads, hazards, responseSites, aoi: packet.aoi },
        locale
      ),
    [mapQuery, communities, roads, hazards, responseSites, packet.aoi, locale]
  );

  const openDecisionExport = () => {
    if (!selectedCommunity) return;
    setDecisionSnapshot(
      createDecisionSnapshot({
        packet,
        updated,
        community: selectedCommunity,
        assessment: assessments.get(selectedCommunity.id)!,
        route: activeRoute,
        roads,
        hazards,
        evidence,
        communities,
        responseSites,
        manualUpdatedAt: incidentSnapshot.manualUpdatedAt,
        terrainAssets: defaultTerrainData
          ? scenarioManifest?.terrain
          : undefined
      })
    );
    setActiveDialog('exportDecision');
  };

  const responseDetailSelected =
    snapshotReady &&
    Boolean(
      view === 'priority'
        ? selectedCommunity && selectedRoutePair
        : selectedObjectId
    );
  const responseDetailVisible =
    responseDetailSelected &&
    !panelCollapsed &&
    !measurementOpen &&
    !drawOpen &&
    !locationOpen &&
    !journey.open &&
    !gisCard &&
    gisGroup.length < 2 &&
    activeDialog !== 'layers';
  useEffect(() => {
    if (!responseDetailVisible) return;
    if (detailLayout.mode !== 'dock') return;
    let firstFrame = 0,
      secondFrame = 0;
    const focusSelection = () => {
      const [kind, id] = (
        selectedObjectId ?? `community:${selectedCommunityId}`
      ).split(':');
      const road = roads.find((item) => item.id === id);
      const point =
        kind === 'community'
          ? communities.find((item) => item.id === id)?.projected
          : kind === 'hazard'
            ? hazards.find((item) => item.id === id)?.projected
            : kind === 'poi'
              ? responseSites.find((item) => item.id === id)?.projected
              : road?.points[Math.floor(road.points.length / 2)];
      if (!point) return;
      // The dock floats over the map: centre the selection in the uncovered part.
      const reserve =
        parseFloat(
          getComputedStyle(workspaceRef.current ?? document.documentElement).getPropertyValue(
            '--response-detail-reserve'
          )
        ) || 0;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() =>
          viewControlRef.current?.focusProjected(point, { right: reserve })
        );
      });
    };
    focusSelection();
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [
    responseDetailVisible,
    detailLayout.mode,
    selectedCommunityId,
    selectedObjectId,
    mapMode,
    viewReadyVersion,
    roads,
    communities,
    hazards,
    responseSites
  ]);

  return (
    <div
      ref={workspaceRef}
      className="workspace workspace-shell"
      data-response-gis-detail={!journey.open && !locationOpen && !measurementOpen && !drawOpen && (mapMode === '2d' || !!gisCard && !!landslideAreaOf(gisCard)) && (Boolean(gisCard) || gisGroup.length > 1)}
      data-gis-open={activeDialog === 'geodata'}
      data-mobile={mobileView}
      data-panel-collapsed={panelCollapsed}
      data-response-detail={responseDetailVisible}
      data-response-layout={detailLayout.mode}
      data-response-profile={showProfile && !!profileTarget}
    >
      <AppHeader
        locked={activeDialog === 'geodata'}
        locale={locale}
        incident={incident}
        areaName={packet.aoi.name}
        report={packet.report}
        reportRoad={roads.find((road) => road.id === packet.report.roadId)}
        dataAvailable={snapshotReady}
        theme={theme}
        fontChoice={fontChoice}
        onOpenReports={() => setActiveDialog('fieldReports')}
        reportsPending={gis.records.some(record => { const submission = submissionOf(record); return submission?.role === 'resident' && submission.review.status === 'pending'; })}
        identityName={identity.name}
        onSignOut={onSignOut}
        onOpenHelp={() => setActiveDialog('help')}
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
        onOpenIncident={() => {
          setAlertRead(true);
          setActiveDialog(null);
          openList('incident');
        }}
        onOpenUpload={() => setActiveDialog('upload')}
        onOpenTimeline={() => setActiveDialog('timeline')}
        onOpenNotifications={() => {
          setAlertRead(true);
          setActiveDialog('notificationCenter');
        }}
        onReset={() => {
          work.reset();
          dispatchMeasureSession({ type: 'reset' });
          dispatchDrawSession({ type: 'discard' });
          setPanelCollapsed(false);
          setLocationPoint(null);
          setReportApplied(false);
          setHistorical(false);
          setAlertRead(false);
          navigation.dispatch({ type: 'reset' });
          interaction.dispatch({ type: 'reset' });
          setMapQuery('');
          setDecisionSnapshot(null);
          setMobileView('map');
          viewControlRef.current?.resetView();
          setLayerAppearance(defaultLayerAppearance);
          setLayers({ ...defaultLayers, context: !offlineMode });
          setComparisonPair(null);
          map2DViewport.current = null;
          if (!defaultTerrainData) reloadTerrain();
          showToast(['Đã đặt lại phiên làm việc', 'Workspace reset']);
        }}
        activeModelName={models[0]?.name}
      />

      <main className="work-area">
        <WorkspaceNav view={view} locale={locale} onChangeView={changeView} />
        <ResponsePanel
          locale={locale}
          navigation={navigation}
          onNavigate={navigation.dispatch}
          snapshot={incidentSnapshot}
          aoi={packet.aoi}
          updated={updated}
          workTasks={workTasks}
          workEntries={work.entries}
          reportPending={!reportApplied}
          pendingReport={pendingReport}
          onApplyReport={handleSimulateUpdate}
          historical={historical && reportApplied}
          onOpenWork={(id) => {
            setWorkTaskId(id ?? null);
            setActiveDialog('responseWork');
          }}
          onOpenReport={() => setActiveDialog('alerts')}
          ready={snapshotReady}
          unavailable={startupError}
          onRetry={retryTerrain}
          onSelectCommunity={selectCommunity}
          onInspectObject={inspectObject}
          onRevealPanel={revealPanel}
          onOpenDialog={setActiveDialog}
        />

        <ResponseDetails
          locale={locale}
          mappedAreas={historical ? [] : gis.records.filter(record => landslideAreaOf(record)?.networkVersion === packet.datasetVersion)}
          onOpenMappedArea={showGisOnResponse}
          onEditScenario={!historical ? target => {setGisScenarioRequest(target);setActiveDialog('geodata');} : undefined}
          scenarioEdits={historical ? undefined : scenarioEdits?.edits}
          onRename={!historical ? onRename : undefined}
          signals={packet.signals}
          workTasks={workTasks}
          workEntries={work.entries}
          onOpenWork={(id) => {
            setWorkTaskId(id ?? null);
            setActiveDialog('responseWork');
          }}
          onSetRoadStatus={!historical && scenarioEdits?.canEdit ? (road, status, note) => scenarioEdits.record({
            target: { type: 'road', id: road.id, name: road.name[0] }, change: { kind: 'status', from: road.status, to: status }, note }) : undefined}
          onRevertEdit={!historical && scenarioEdits?.canEdit ? id => revertRoadStatus(scenarioEdits, id) : undefined}
          navigation={navigation}
          onNavigate={navigation.dispatch}
          snapshot={incidentSnapshot}
          aoi={packet.aoi}
          ready={snapshotReady}
          community={selectedCommunity}
          routePair={selectedRoutePair}
          terrainCoverage={communityTerrainCoverage}
          hasTerrainProfile={Boolean(
            routeProfile?.samples.some(
              (sample) => sample.elevation !== undefined
            )
          )}
          profileOpen={showProfile}
          onToggleProfile={toggleProfile}
          onSelectRouteSection={selectRouteSection}
          onChangeRoute={(selectedRouteType) => {
            navigation.dispatch({
              type: 'filters',
              values: { selectedRouteType }
            });
            setFocusDistance(null);
          }}
          onSelectCommunity={selectCommunity}
          onInspectObject={inspectObject}
          onRevealPanel={revealPanel}
          onResetTools={resetTools}
          onOpenDialog={setActiveDialog}
          onOpenEvidence={(hazardId) => {
            setEvidenceModalId(hazardId);
            setActiveDialog('evidence');
          }}
          onExport={openDecisionExport}
          visible={responseDetailVisible}
          onReturnFocus={returnDetailFocus}
        />


        <section
          className="map-area"
          aria-label={locale === 'vi' ? 'Bản đồ ứng phó' : 'Response map'}
          data-profile={showProfile && !!profileTarget}
          data-locating={locationOpen}
        >
          {historical && reportApplied && (
            <RevisionNotice
              locale={locale}
              timestamp={incident.asOf}
              onLatest={() => setHistorical(false)}
            />
          )}
          <div className="map-canvas">
            {mapMode === '2d' ? (
              <Map2D
                gisEnabled={true}
                gisRecords={displayedGis}
                gisSelectedId={gisCardId}
                gisRequest={gisResponseView}
                onGisSelect={(id) => {
                  setPanelCollapsed(false);
                  gis.select(id);
                  setGisCardId(id);
                  setGisGroupIds([]);
                }}
                gisGroupIds={gisGroupIds}
                onGisGroup={(ids) => {
                  setPanelCollapsed(false);
                  setGisGroupIds(ids);
                  setGisCardId(null);
                }}
                terrain={mapTerrain}
                profileOpen={showProfile}
                profilePoints={showProfile ? profileTarget?.points : undefined}
                pointPickActive={journey.open && !!journey.picking}
                onPointPick={journey.pick}
                onMapContextMenu={snapshotReady ? openMapMenu : undefined}
                journeyEndpoints={journeyMarkers(journey)}
                journeyFitRequest={journey.fitSequence}
                locationOpen={locationOpen}
                locationPoint={locationPoint}
                onLocation={setLocationPoint}
                measurementOpen={measurementOpen}
                measureSession={measureSession}
                dispatchMeasureSession={dispatchMeasureSession}
                onCloseMeasurement={() => {
                  interaction.dispatch({ type: 'close-tool', tool: 'measure' });
                  document
                    .querySelector<HTMLButtonElement>('.map-measure-trigger')
                    ?.focus();
                }}
                drawOpen={drawOpen}
                drawSession={drawSession}
                dispatchDrawSession={dispatchDrawSession}
                onCloseDraw={() => {
                  interaction.dispatch({ type: 'close-tool', tool: 'draw' });
                  document.querySelector<HTMLButtonElement>('.map-draw-trigger')?.focus();
                }}
                onSaveDrawing={(record) => {
                  // A drawing is GIS reference data: it is listed and exported with imported layers.
                  gis.add([record]);
                  setLayers((previous) => ({ ...previous, gis: true }));
                  showToast([
                    drawingMessages.vi.saved.replace('{name}', record.name),
                    drawingMessages.en.saved.replace('{name}', record.name)
                  ]);
                }}
                imageUrl={
                  defaultTerrainData
                    ? scenarioManifest?.terrain.image?.url
                    : undefined
                }
                viewportRef={map2DViewport}
                locale={locale}
                focusPoint={showProfile ? focusPoint : null}
                profileMetadata={analysisTerrain?.metadata}
                onBasemapState={setBasemapState}
                scenarioProps={
                  snapshotReady && scenarioTerrainCompatible
                    ? {
                        datasetVersion: packet.datasetVersion,
                        aoi: packet.aoi,
                        communities: communities,
                        responseSites: responseSites,
                        hazards,
                        roads,
                        selectedRoute: journey.open
                          ? journey.route
                          : activeRoute,
                        selectedCommunityId: gisCard ? null : selectedCommunityId,
                        selectedObjectId: gisCard ? null : selectedObjectId,
                        layers,
                        appearance: layerAppearance
                      }
                    : undefined
                }
                onSelectOverlayHit={handleOverlayHit}
                viewControlRef={viewControlRef}
                onViewReady={onViewReady}
              />
            ) : (
              <Map3DBoundary onUnavailable={handle3DUnavailable}>
                <React.Suspense
                  fallback={terrain3DBusy ? null : terrainLoading(null)}
                >
                  <TerrainViewer
                    models={models}
                    gisRecords={displayedGis}
                    gisSelectedId={gisCardId}
                    onGisSelect={id => {setPanelCollapsed(false);gis.select(id);setGisCardId(id);setGisGroupIds([]);}}
                    geographicPlacements={geographicPlacements}
                    measureMode={locationOpen}
                    onPick={handlePick}
                    profile={showProfile ? routeProfile : null}
                    profileMetadata={analysisTerrain?.metadata}
                    focusPoint={
                      locationOpen
                        ? locationPoint?.scene
                        : showProfile
                          ? focusPoint
                          : null
                    }
                    mapMode={mapMode}
                    theme={theme}
                    locale={locale}
                    onBasemapState={setBasemapState}
                    scenarioProps={
                      snapshotReady && scenarioTerrainCompatible
                        ? {
                            datasetVersion: packet.datasetVersion,
                            aoi: packet.aoi,
                            communities: communities,
                            responseSites: responseSites,
                            hazards,
                            roads: roads,
                            selectedRoute: activeRoute,
                            selectedCommunityId: gisCard ? null : selectedCommunityId,
                            selectedObjectId: gisCard ? null : selectedObjectId,
                            layers: layers,
                            appearance: layerAppearance
                          }
                        : undefined
                    }
                    onSelectOverlayHit={handleOverlayHit}
                    viewControlRef={viewControlRef}
                    onViewReady={onViewReady}
                    onUnavailable={handle3DUnavailable}
                  />
                </React.Suspense>
              </Map3DBoundary>
            )}
          </div>

          {mapMode === '3d' && terrain3DBusy
            ? terrainLoading(progress3D)
            : !mapTerrain &&
              uploadBusy && (
                <div className="map-load-state" role="status">
                  {locale === 'vi'
                    ? 'Đang mở bản đồ địa hình'
                    : 'Opening terrain map'}
                </div>
              )}
          {!mapTerrain && startupError && (
            <div className="map-load-state" role="alert">
              <strong>
                {locale === 'vi'
                  ? 'Không mở được bản đồ địa hình'
                  : 'Terrain map could not be opened'}
              </strong>
              <button className="button soft" onClick={retryTerrain}>
                {locale === 'vi' ? 'Thử lại' : 'Retry'}
              </button>
            </div>
          )}
          {models.length > 0 && !scenarioTerrainCompatible && (
            <p className="map-model-note" role="status">
              {locale === 'vi'
                ? 'Chưa ghép lớp sự kiện: cần lưới độ cao và hệ tọa độ EPSG:32648.'
                : 'Incident layers require an elevation grid in EPSG:32648.'}
            </p>
          )}

          <MapControls
            panelCollapsed={panelCollapsed}
            onTogglePanel={() => setPanelCollapsed((value) => !value)}
            locale={locale}
            mapMode={mapMode}
            onChangeMapMode={setMapMode}
            onZoomIn={() => viewControlRef.current?.zoomIn()}
            onZoomOut={() => viewControlRef.current?.zoomOut()}
            onResetView={() => viewControlRef.current?.resetView()}
            onOpenGis={() => setActiveDialog('geodata')}
            gisObservations={
              mapMode === '2d' && layers.gis
                ? gis.records
                    .filter((record) => record.visible)
                    .flatMap((record) => {
                      const observation = observationOf(record);
                      return observation ? [observation.kind] : [];
                    })
                : []
            }
            onOpenLayers={() =>
              setActiveDialog(activeDialog === 'layers' ? null : 'layers')
            }
            layersOpen={activeDialog === 'layers'}
            layers={scenarioTerrainCompatible ? layers : {}}
            hazards={scenarioTerrainCompatible ? hazards : []}
            hasSelectedRoute={scenarioTerrainCompatible && Boolean(activeRoute)}
            hasHLZData={
              scenarioTerrainCompatible &&
              responseSites.some((site) => site.kind === 'hlz')
            }
            measuring={measurementOpen}
            drawing={drawOpen}
            onDraw={() => interaction.dispatch({ type: 'toggle-tool', tool: 'draw' })}
            locating={locationOpen}
            onLocation={() =>
              interaction.dispatch({ type: 'toggle-tool', tool: 'location' })
            }
            affectedOnly={layerAppearance.roads === 'affected'}
            onMeasure={() =>
              interaction.dispatch({ type: 'toggle-tool', tool: 'measure' })
            }
          >
            <button
              className="icon-button map-journey-trigger"
              title={
                locale === 'vi'
                  ? 'Hành trình giữa hai điểm'
                  : 'Journey between two points'
              }
              aria-label={
                locale === 'vi'
                  ? 'Hành trình giữa hai điểm'
                  : 'Journey between two points'
              }
              aria-pressed={journey.open}
              onClick={() => {
                resetTools();
                setMapMode('2d');
                journey.setOpen(!journey.open);
              }}
            >
              <UiIcon name="route" />
            </button>
            <MapSearch
              locale={locale}
              query={mapQuery}
              onQuery={setMapQuery}
              results={mapResults}
              disabled={!snapshotReady}
              onSelect={(result) => {
                setPanelCollapsed(false);
                const [kind, id] = result.key.split(':');
                const hazard =
                  kind === 'hazard'
                    ? hazards.find((h) => h.id === id)
                    : undefined;
                const site =
                  kind === 'poi'
                    ? responseSites.find((s) => s.id === id)
                    : undefined;
                const layer =
                  kind === 'community'
                    ? 'communities'
                    : kind === 'road'
                      ? 'roads'
                      : kind === 'aoi'
                        ? 'aoi'
                        : (site?.kind ??
                          (hazard?.kind === 'landslide'
                            ? 'landslide'
                            : hazard?.kind === 'flood'
                              ? 'flood'
                              : 'crossings'));
                setLayers((previous) => ({ ...previous, [layer]: true }));
                if (kind === 'community') selectCommunity(id);
                else inspectObject(result.key);
                viewControlRef.current?.focusProjected(result.projected);
              }}
            />
          </MapControls>
          <MapAttribution
            locale={locale}
            state={basemapState}
            onRetry={() => viewControlRef.current?.retryBasemap()}
            localSource={
              mapTerrain
                ? defaultTerrainData
                  ? ['Ảnh nền và địa hình', 'Imagery and terrain']
                  : [
                      'Lưới độ cao từ mô hình đã tải lên',
                      'Elevation grid from the uploaded model'
                    ]
                : undefined
            }
          />
          {mapMode === '2d' && journey.open && (
            <RoadJourneyPanel
              locale={locale}
              journey={journey}
              communities={communities}
              sites={responseSites}
              roads={roads}
              places={layers.gis ? gisJourneyPlaces(gis.records) : []}
              onProfile={() =>
                interaction.dispatch({ type: 'toggle-tool', tool: 'profile' })
              }
            />
          )}
          {(mapMode === '2d' || !!gisCard && !!landslideAreaOf(gisCard)) &&
            !journey.open &&
            gisCard &&
            (layers.gis || !!landslideAreaOf(gisCard)) &&
            !locationOpen &&
            !measurementOpen &&
            !drawOpen && (
              <ResponseObservationCard
                record={gisCard}
                roads={landslideAreaOf(gisCard)?.networkVersion === packet.datasetVersion ? roads : []}
                onRoad={id => inspectObject('road:'+id)}
                locale={locale}
                onClose={() => {
                  setGisCardId(null);
                  setGisGroupIds([]);
                }}
                onEdit={() => {
                  gis.select(gisCard.id);
                  setActiveDialog('geodata');
                }}
                onBack={
                  gisGroup.length > 1 && gisGroupIds.includes(gisCard.id)
                    ? () => setGisCardId(null)
                    : undefined
                }
              />
            )}
          {mapMode === '2d' &&
            !journey.open &&
            layers.gis &&
            !gisCard &&
            gisGroup.length > 1 &&
            !locationOpen &&
            !measurementOpen &&
            !drawOpen && (
              <PointGroupCard
                records={gisGroup}
                locale={locale}
                activeId={null}
                openLabel={locale === 'vi' ? 'Xem chi tiết' : 'View details'}
                onOpen={(id) => {
                  setPanelCollapsed(false);
                  gis.select(id);
                  setGisCardId(id);
                }}
                onClose={() => setGisGroupIds([])}
              />
            )}
          {locationOpen && (
            <MapLocationPanel
              locale={locale}
              point={locationPoint}
              onClose={closeLocation}
            />
          )}

          {activeDialog === 'layers' && (
            <LayersDialog
              locale={locale}
              imageryPreview={
                defaultTerrainData
                  ? scenarioManifest?.terrain.image?.url
                  : undefined
              }
              layers={layers}
              appearance={layerAppearance}
              mapMode={mapMode}
              onAppearance={setLayerAppearance}
              onCompare={() => setActiveDialog('comparison')}
              hasFloodData={hazards.some((hazard) => hazard.kind === 'flood')}
              hasHLZData={responseSites.some((site) => site.kind === 'hlz')}
              hasSelectedRoute={Boolean(activeRoute)}
              hasIncidentLayers={scenarioTerrainCompatible}
              onToggleLayer={(layerId) =>
                setLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }))
              }
              onClose={() => setActiveDialog(null)}
            />
          )}

          {showProfile && profileTarget && (
            <ProfileDrawer
              key={profileTarget.id}
              name={profileTarget.name[locale === 'vi' ? 0 : 1]}
              locale={locale}
              profile={routeProfile}
              onHoverDistance={setFocusDistance}
              onClose={closeProfile}
            />
          )}
        </section>
      </main>

      <nav
        className="mobile-view-switch"
        aria-label={locale === 'vi' ? 'Chế độ xem' : 'View'}
      >
        <button
          aria-pressed={mobileView === 'info'}
          onClick={() => setMobileView('info')}
        >
          {locale === 'vi' ? 'Thông tin' : 'Information'}
        </button>
        <button
          aria-pressed={mobileView === 'map'}
          onClick={() => setMobileView('map')}
        >
          {locale === 'vi' ? 'Bản đồ' : 'Map'}
        </button>
      </nav>

      <AssessmentTimeline locale={locale} packet={packet} applied={reportApplied} historical={historical} onRevision={setHistorical} onReport={() => setActiveDialog('alerts')} onJournal={() => setActiveDialog('timeline')}/>

      <WorkspaceDialogs
        identity={identity}
        onRename={onRename}
        scenarioEdits={historical ? undefined : scenarioEdits}
        scenarioRequest={gisScenarioRequest}
        onResponseScenario={target => {
          inspectObject(`${target.type === 'site' ? 'poi' : target.type}:${target.id}`);
          setMapMode('2d');setMobileView('map');setActiveDialog(null);setGisScenarioRequest(null);
        }}
        onEditGis={(id) => {
          gis.select(id);
          setActiveDialog('geodata');
        }}
        gisSession={gis}
        onGisResponse={showGisOnResponse}
        dialog={interaction.dialog}
        offline={offlineMode}
        locale={locale}
        packet={packet}
        snapshot={incidentSnapshot}
        updated={updated}
        reportApplied={reportApplied}
        historical={historical}
        workTasks={workTasks}
        workTaskId={workTaskId}
        workEntries={work.entries}
        workStorageError={work.error}
        onRecordWork={work.record}
        onVerifyRoad={!historical && scenarioEdits?.canEdit ? (roadId, status, note) => {
          const road = incidentSnapshot.roads.find(item => item.id === roadId);
          return !!road && scenarioEdits.record({ target: { type: 'road', id: road.id, name: road.name[0] },
            change: { kind: 'status', from: road.status, to: status }, note });
        } : undefined}
        onVerifyHazard={!historical && scenarioEdits?.canEdit ? (hazardId, confirmed, note) => {
          // "Not found" is recorded in the work log only; the hazard keeps its suspected status.
          if (!confirmed) return true;
          const hazard = incidentSnapshot.hazards.find(item => item.id === hazardId);
          if (!hazard) return false;
          const from = scenarioProperties(hazard);
          return scenarioEdits.record({ target: { type: 'hazard', id: hazard.id, name: hazard.name[0] },
            change: { kind: 'properties', from, to: { ...from, observation: 'reported' } }, note });
        } : undefined}
        appliedAt={appliedAt}
        comparisonPair={comparisonPair}
        onComparisonPair={setComparisonPair}
        decisionSnapshot={decisionSnapshot}
        evidenceId={evidenceModalId}
        terrain={defaultTerrainData}
        terrainMetadata={mapTerrain?.metadata}
        manifest={scenarioManifest}
        upload={{
          mode: uploadMode,
          geographicMerge,
          fileNames: uploadedNames,
          busy: uploadBusy,
          error: uploadError,
          onModeChange: handleUploadModeChange,
          onGeographicMergeChange: handleGeographicMergeChange,
          onFiles: handleUpload,
          onClear: clearUploadedModels
        }}
        onClose={() => {setActiveDialog(null);setGisScenarioRequest(null);}}
        onOpenReport={() => setActiveDialog('alerts')}
        onApplyReport={handleSimulateUpdate}
        onRevision={(value) => {
          setHistorical(value);
          resetTools();
        }}
        onInspectObject={inspectObject}
      />

      {mapMenu && (
        <ContextMenu
          request={mapMenu}
          label={locale === 'vi' ? 'Thao tác tại vị trí' : 'Map actions'}
          onClose={closeMapMenu}
        />
      )}
      <NoticeToast notice={notice} locale={locale} onDismiss={dismissToast} />
    </div>
  );
}
