import { useMapPreview } from '../map/useMapPreview';
import { LandslideAreaList } from '../landslides/LandslideAreaList';
import type { PickedRoadInterval } from '../landslides/LandslideAreaEditor';
import { nearestRoadAnchor, roadGeographic } from '../routes/selectedRoadJourney';
import { createLandslideArea, landslideAreaKey, landslideAreaOf, type LandslideArea } from '../landslides/landslideAreas';
import { GisEditSession } from './GisEditSession';
import type { ReactNode } from 'react';
import type { RenameScenario } from '../access/ScenarioLabels';
import { isSelectPickerEvent } from '../../shared/ui/selectKeyboard';
import type { ScenarioEdits } from '../access/scenarioEdits';
import { ScenarioFeatureList } from './ScenarioFeatureList';
import { ScenarioPointDialog, newPointDraft, type ScenarioPointDraft } from './ScenarioPointDialog';
import type { ScenarioTarget } from './scenarioOverlay';
import type { ScenarioOverlay } from './scenarioOverlay';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GeometryError, isPolygon, type GeometryRecord, type VectorGeometry } from '../../geo/vector/types';
import { GeometryActionDialog, type GeometryAction } from './GeometryActionDialog';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { roadProjected } from '../routes/selectedRoadJourney';
import { useNotice } from '../../shared/hooks/useNotice';
import { NoticeToast } from '../../shared/ui/NoticeToast';
import { polygonCoverage } from '../../geo/vector/polygonCoverage';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { PanelResizeHandle } from '../../shared/ui/PanelResizeHandle';
import { downloadBlob } from '../../shared/downloadBlob';
import {
  SceneCatalog,
  SceneDetails,
  type SceneResult
} from '../catalog/SceneCatalog';
import { useImageryCatalog } from '../catalog/useImageryCatalog';
import { sceneRecord, reviewScenePair } from '../catalog/imageryCatalog';
import { GeometryImport } from './GeometryImport';
import { GeometryInspector } from './GeometryInspector';
import { GeometryNameEditor } from './GeometryNameEditor';
import {
  createFieldArea,
  fieldAreaKey,
  fieldAreaOwner,
  linkedFieldAreas
} from '../observations/fieldAreas';
import { GeometryLayers } from './GeometryLayers';
import { GeometryCoverage } from './GeometryCoverage';
import { GeometryMap } from './GeometryMap';
import type { GeometryDetail } from './geometryDetail';
import { useGeometrySession } from './useGeometrySession';
import { useGeometryEditor, type GeometryMode } from './useGeometryEditor';
import { GeometryVertexEditor } from './GeometryVertexEditor';
import { createGeometryRecords } from './geometrySession';
import { GeometryToolbar } from './GeometryToolbar';
import { GeometryExport } from './GeometryExport';
import { geometryErrorText } from './geometryErrors';
import { PointEntry } from '../observations/PointEntry';
import './geodata.css';
import './geometry-inspector.css';

type Props = {
  publication?: ReactNode;
  annotationProperties?: (id: string, records: GeometryRecord[]) => Record<string, unknown>;
  locale: Locale;
  onClose: () => void;
  offline?: boolean;
  standalone?: boolean;
  session?: ReturnType<typeof useGeometrySession>;
  onResponse?: (id: string) => void;
  scenario?: ScenarioOverlay;
  scenarioEdits?: ScenarioEdits;
  onRenameScenario?: RenameScenario;
  scenarioRequest?: ScenarioTarget | null;
  onResponseScenario?: (target: ScenarioTarget) => void;
};
type Tab = 'areas' | 'roads' | 'layers' | 'aoi' | 'scenes';
const selectionKey = 'dear.imagery-selection.v1';
function readSelection(): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(selectionKey) ?? '[]'
    );
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === 'string').slice(0, 100)
      : [];
  } catch {
    return [];
  }
}

/** Composition only: geometry drafts, published response data and catalog selections are separate. */
export function GeometryWorkspace(props: Props): JSX.Element {
  return props.session ? (
    <GisEditSession published={props.session} edits={props.scenarioEdits} scenario={props.scenario} annotationProperties={props.annotationProperties} locale={props.locale} onClose={props.onClose} onResponse={props.onResponse} onResponseScenario={props.onResponseScenario}>
      {draft=><GeometryWorkspaceView {...props} {...draft}/>}
    </GisEditSession>
  ) : (
    <LocalGeometryWorkspace {...props} />
  );
}
function LocalGeometryWorkspace(props: Props): JSX.Element {
  const session = useGeometrySession();
  return <GeometryWorkspace {...props} session={session} />;
}
function GeometryWorkspaceView({
  publication,
  scenario,
  scenarioEdits,
  onRenameScenario,
  scenarioRequest,
  onResponseScenario,
  locale,
  onClose,
  offline = false,
  standalone = false,
  session,
  onResponse
}: Props & { session: ReturnType<typeof useGeometrySession> }): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const workspaceRoot = useRef<HTMLDivElement>(null);
  useMapPreview(workspaceRoot,key=>{const [kind,...parts]=key.split(':'),id=parts.join(':');const f=kind==='community'?scenario?.communities.find(f=>f.id===id):kind==='hazard'?scenario?.hazards.find(f=>f.id===id):kind==='poi'?scenario?.responseSites.find(f=>f.id===id):kind==='road'?scenario?.roads.find(f=>f.id===id):null;if(f)return {point:'projected' in f?f.projected:f.points[Math.floor(f.points.length/2)],name:typeof f.name==='string'?f.name:f.name[locale==='vi'?0:1]};const r=session.records.find(r=>r.id===id);if(r?.feature.geometry.type==='Point'){const [lon,lat]=r.feature.geometry.coordinates;return {point:roadProjected(lat,lon),name:r.name};}return null;});
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    workspaceRoot.current
      ?.querySelector<HTMLButtonElement>('.geodata-title button')
      ?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  const editor = useGeometryEditor(),
    repository = useImageryCatalog();
  const [inputTask, setInputTask] = useState<'point' | 'import' | 'scenario' | null>(null);
  const [newDraft, setNewDraft] = useState<ScenarioPointDraft | null>(null);
  const [pickTask, setPickTask] = useState<'scenario-new' | 'reference-new' | 'scenario-edit' | {kind:'import-edit';id:string} | {kind:'area-road';areaId:string;roadId:string;start?:{station:number;latitude:number;longitude:number}} | null>(null);
  const [pickedRoadInterval,setPickedRoadInterval]=useState<PickedRoadInterval|null>(null);
  const [pickedReference, setPickedReference] = useState<{latitude:number;longitude:number}|null>(null);
  const [pickedImportEdit, setPickedImportEdit] = useState<{id:string;latitude:number;longitude:number}|null>(null);
  const [scenarioFocus, setScenarioFocus] = useState<ScenarioTarget | null>(scenarioRequest ?? null);
  const [tab, setTab] = useState<Tab>(() => {
    if (scenarioRequest?.type === 'road') return 'roads';
    const areaSelected = session.records.some(record => record.id === session.selectedId && landslideAreaOf(record));
    return areaSelected || scenario && !session.selectedId ? 'areas' : 'layers';
  });
  const [mobileTab, setMobileTab] = useState<'data' | 'map'>('data');
  const [snapping, setSnapping] = useState(false),
    [exportScope, setExportScope] = useState('all');
  const [selectedScenes, setSelectedScenes] = useState(readSelection),
    [results, setResults] = useState<SceneResult[]>([]);
  const [queryAoi, setQueryAoi] = useState<string | null>(null);
  const [showScenes, setShowScenes] = useState(true),
    [sceneView, setSceneView] = useState<{
      version: number;
      id: string | null;
    } | null>(null);
  const [detail, setDetail] = useState<GeometryDetail>(
    session.selectedId ? { kind: 'feature' } : null
  );
  const selectScenario = (target: ScenarioTarget) => {
    if (editor.active || pickTask) return;
    setTab(target.type === 'road' ? 'roads' : target.type === 'hazard' ? 'areas' : 'layers'); setDetail({kind:'scenario',target,moving:false,pending:null}); setScenarioFocus({...target}); setMobileTab('map');
  };
  useEffect(() => { if (scenarioRequest) selectScenario(scenarioRequest); }, [scenarioRequest]);
  const inspecting = detail?.kind === 'feature';
  const sceneId = detail?.kind === 'scene' ? detail.id : null;
  const [areaPointId, setAreaPointId] = useState<string | null>(null);
  const [drawingLandslide, setDrawingLandslide] = useState<LandslideArea['state'] | null>(null);
  const [pendingAction, setPendingAction] = useState<GeometryAction | null>(null);
  const { notice, notify, dismiss } = useNotice();
  const aoi = session.records.find((record) => record.role === 'aoi');
  const selected = session.records.find(
    (record) => record.id === session.selectedId
  );
  const editTarget = tab === 'aoi' ? aoi : inspecting ? selected : undefined;
  const scene = repository.catalog?.scenes.find(
    (record) => record.id === sceneId
  );
  const analysis = useMemo(() => {
    try {
      return { result: polygonCoverage(session.records), error: null };
    } catch {
      return { result: null, error: new GeometryError('analysis') };
    }
  }, [session.records]);
  const mapRecords = useMemo(() => {
    if (!repository.catalog) return session.records;
    const existing = new Set(session.records.map((record) => record.id));
    const candidates = results.map((row) => row.scene);
    const focused =
      scene ??
      repository.catalog.scenes.find(
        (item) => `scene:${item.id}` === sceneView?.id
      );
    if (focused && !candidates.some((candidate) => candidate.id === focused.id))
      candidates.push(focused);
    return [
      ...session.records,
      ...candidates
        .map((candidate) => ({
          ...sceneRecord(candidate, repository.catalog!.source.retrievedAt),
          visible: showScenes
        }))
        .filter((record) => !existing.has(record.id))
    ];
  }, [
    session.records,
    results,
    scene,
    sceneView,
    showScenes,
    repository.catalog
  ]);
  useEffect(() => {
    try {
      localStorage.setItem(selectionKey, JSON.stringify(selectedScenes));
    } catch {
      session.setError(new GeometryError('storage'));
    }
  }, [selectedScenes]);
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (
        editor.active ||
        isSelectPickerEvent(event) ||
        (event.target as HTMLElement)?.closest('dialog[open]')
      )
        return;
      const key = event.key.toLowerCase();
      if (
        (event.ctrlKey || event.metaKey) &&
        ['z', 'y'].includes(key) &&
        !(event.target as HTMLElement)?.closest(
          'input,textarea,select,[contenteditable]'
        )
      ) {
        event.preventDefault();
        if (key === 'y' || event.shiftKey) session.redo();
        else session.undo();
      }
    };
    document.addEventListener('keydown', keys, true);
    return () => document.removeEventListener('keydown', keys, true);
  });
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        editor.active ||
        isSelectPickerEvent(event) ||
        (event.target as HTMLElement)?.closest('dialog[open]')
      )
        return;
      event.preventDefault();
      if (pickTask) {const previous=pickTask;setPickTask(null);if(previous==='scenario-new') setInputTask('scenario');if(previous==='reference-new') setInputTask('point');return;}
      if (detail) setDetail(null);
      else onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [editor.active, detail, pickTask, onClose]);
  const select = (id: string) => {
    if (editor.active || pickTask) return;
    const candidate = repository.catalog?.scenes.find(
      (item) => `scene:${item.id}` === id
    );
    if (candidate && !session.records.some((record) => record.id === id)) {
      setDetail({ kind: 'scene', id: candidate.id });
      return;
    }
    const record = session.records.find((r) => r.id === id);
    const owner = record && fieldAreaOwner(record, session.records);
    session.select(record && landslideAreaOf(record) ? id : owner?.id ?? id);
    setDetail({ kind: 'feature' });
    setMobileTab('data');
    setTab(record && landslideAreaOf(record) ? 'areas' : 'layers');
  };
  const start = (mode: GeometryMode) => {
    setAreaPointId(null);
    setDrawingLandslide(null);
    setDetail(null);
    session.setError(null);
    setSceneView(null);
    setMobileTab('map');
    if (mode === 'edit' && editTarget) {
      session.select(editTarget.id);
      editor.start(mode, editTarget.id, editTarget.feature.geometry);
      setTab(landslideAreaOf(editTarget) ? 'areas' : 'aoi');
    } else editor.start(mode);
  };
  const applyGeometry = (geometry: VectorGeometry): boolean => {
    try {
      const fieldOwner =
        areaPointId && session.records.find((r) => r.id === areaPointId);
      let mappedAreaId: string | null = null;
      if (drawingLandslide && editor.mode !== 'edit') {
        const count = session.records.filter(r => landslideAreaOf(r)?.state === drawingLandslide).length + 1;
        const record = createLandslideArea(geometry, drawingLandslide, drawingLandslide === 'potential' ? t('Vùng nguy cơ ', 'Potential area ') + count : t('Vết sạt lở ', 'Landslide scar ') + count, scenario?.datasetVersion);
        session.add([record]); session.select(record.id); mappedAreaId = record.id;
      } else if (fieldOwner) {
        if (editor.mode === 'edit' && editor.recordId) {
          if (!session.replaceGeometry(editor.recordId, geometry)) return false;
        }
        else
          session.add([
            createFieldArea(
              fieldOwner,
              geometry,
              t('Vùng nghi ảnh hưởng ', 'Suspected affected area ') +
                (linkedFieldAreas(session.records, fieldOwner.id).length + 1)
            )
          ]);
        session.select(fieldOwner.id);
      } else if (editor.mode === 'edit' && editor.recordId) {
        if (!session.replaceGeometry(editor.recordId, geometry)) return false;
      }
      else if (aoi) {
        if (!session.replaceGeometry(aoi.id, geometry, true)) return false;
        session.select(aoi.id);
      } else
        session.add(
          createGeometryRecords(
            {
              features: [
                { type: 'Feature', properties: { name: 'AOI' }, geometry }
              ],
              format: 'drawing'
            },
            t('Vẽ trên bản đồ', 'Map drawing'),
            'aoi'
          )
        );
      editor.cancel();
      session.setError(null);
      const isMapped = !!mappedAreaId || !!session.records.find(r => r.id === editor.recordId && landslideAreaOf(r));
      setTab(isMapped ? 'areas' : fieldOwner ? 'layers' : 'aoi');
      setDetail(fieldOwner || isMapped ? { kind: 'feature' } : null);
      setAreaPointId(null);
      setDrawingLandslide(null);
      if (fieldOwner || isMapped) setMobileTab('data');
      notify(['Đã sửa ranh giới trong bản nháp.', 'Boundary updated in draft.']);
      return true;
    } catch (error) {
      session.setError(error);
      return false;
    }
  };
  // Save on the map is the decision; undo reverts it, so no second confirmation.
  const cancelGeometry = () => {
    editor.cancel();
    if (areaPointId) {
      setDetail({ kind: 'feature' });
      setMobileTab('data');
    }
    setAreaPointId(null);
    setDrawingLandslide(null);
    session.setError(null);
  };
  const finish = () => {
    try { applyGeometry(editor.result()); } catch (error) { session.setError(error); }
  };
  const display = (ids: string[], show: boolean): boolean => {
    const saved = session.batch(ids, show ? 'show' : 'hide');
    if (saved) notify(['Đã sửa lớp trong bản nháp.', 'Layer updated in draft.']);
    return saved;
  };
  const reviewUpdate = (id: string, patch: Partial<Pick<GeometryRecord, 'name' | 'visible' | 'role'>>): boolean => {
    if (patch.visible !== undefined) return display([id], patch.visible);
    if (patch.role) {
      setPendingAction({ kind: 'role', id, role: patch.role });
      return false;
    }
    return session.update(id, patch);
  };
  const batch = (ids: string[], action: 'show' | 'hide' | 'delete'): boolean => {
    if (action !== 'delete') return display(ids, action === 'show');
    // Bulk deletion reaches this callback only after GeometryLayers' modal confirmation.
    const saved = session.batch(ids, action);
    if (saved) notify(['Đã đánh dấu xóa trong bản nháp.', 'Selected features marked for deletion in draft.']);
    return saved;
  };
  const confirmAction = (): boolean => {
    if (!pendingAction) return false;
    const saved = pendingAction.kind === 'delete' ? session.remove(pendingAction.id)
      : session.update(pendingAction.id, { role: pendingAction.role });
    if (saved) {
      if (pendingAction.kind === 'delete') {
        if (session.selectedId === pendingAction.id) setDetail(null);
        notify(['Đã đánh dấu xóa trong bản nháp.', 'Feature marked for deletion in draft.']);
      } else notify(['Đã sửa lớp trong bản nháp.', 'Layer updated in draft.']);
      setPendingAction(null);
    }
    return saved;
  };
  const exportRecords =
    exportScope === 'aoi'
      ? session.records.filter((record) => record.role === 'aoi')
      : session.records;
  const download = (text: string, name: string, type = 'application/json') =>
    downloadBlob(new Blob([text], { type }), name);
  const addScenes = () => {
    try {
      const additions = (
        repository.catalog?.scenes.filter((item) =>
          selectedScenes.includes(item.id)
        ) ?? []
      ).map((item) =>
        sceneRecord(item, repository.catalog!.source.retrievedAt)
      );
      const existing = new Set(session.records.map((record) => record.id));
      const fresh = additions.filter((record) => !existing.has(record.id));
      if (fresh.length) session.add(fresh);
      setDetail(null);
      setSceneView(null);
      setTab('layers');
    } catch (error) {
      session.setError(error);
    }
  };
  const error = session.error || analysis.error;
  const working = editor.active || Boolean(pickTask) || session.busy;
  return (
    <div
      ref={workspaceRoot}
      className="geodata-workspace"
      data-standalone={standalone}
      role={standalone ? undefined : 'region'}
      aria-labelledby="geodata-title"
      data-mobile-tab={mobileTab}
    >
      <GeometryToolbar
        locale={locale}
        leading={
          <div className="geodata-title">
            <button
              className="icon-button"
              onClick={onClose}
              aria-label={
                standalone
                  ? t('Về bản đồ ứng phó', 'Back to response map')
                  : t('Đóng dữ liệu GIS', 'Close GIS data')
              }
              title={t('Về bản đồ ứng phó', 'Back to response map')}
            >
              <UiIcon name="back" />
            </button>
            <h1 id="geodata-title">{t('Dữ liệu GIS', 'GIS data')}</h1>
          </div>
        }
        editor={editor}
        showAoiTools={tab === 'aoi' || tab === 'scenes'}
        drawingLabel={drawingLandslide === 'potential' ? t('Khoanh vùng nguy cơ', 'Map potential area') : drawingLandslide === 'occurred' ? t('Khoanh vết sạt lở', 'Map landslide scar') : undefined}
        busy={session.busy}
        canUndo={session.canUndo}
        canRedo={session.canRedo}
        onUndo={session.undo}
        onRedo={session.redo}
        hasSelection={!!editTarget && isPolygon(editTarget.feature.geometry)}
        aoiName={aoi?.name}
        fieldAreaName={
          areaPointId
            ? session.records.find((r) => r.id === areaPointId)?.name
            : undefined
        }
        snapping={snapping}
        onSnap={setSnapping}
        onStart={start}
        onFinish={finish}
        onCancel={cancelGeometry}
      />
      {publication}
      <nav
        className="geodata-mobile-tabs"
        aria-label={t('Không gian dữ liệu GIS', 'GIS workspace')}
      >
        <button
          aria-pressed={mobileTab === 'data'}
          onClick={() => setMobileTab('data')}
        >
          {t('Dữ liệu', 'Data')}
        </button>
        <button
          aria-pressed={mobileTab === 'map'}
          onClick={() => {
            if (mobileTab !== 'map') setDetail(null);
            setMobileTab('map');
          }}
        >
          {t('Bản đồ', 'Map')}
        </button>
      </nav>
      {error && inputTask !== 'import' && (
        <div className="geodata-error" role="alert">
          <UiIcon name="uncertain" />
          <span>{geometryErrorText(error, locale)}</span>
          <button
            className="icon-button"
            onClick={() => session.setError(null)}
            aria-label={t('Đóng lỗi nhập', 'Dismiss import error')}
          >
            <UiIcon name="close" />
          </button>
        </div>
      )}
      <div className="geodata-body">
        <aside
          className="geodata-sidebar"
          data-inspecting={
            inspecting && !!selected && !editor.active
              ? 'true'
              : undefined
          }
          aria-label={t('Quản lý dữ liệu GIS', 'GIS data controls')}
        >
          <nav className="geodata-task-nav" aria-label={t('Nghiệp vụ GIS', 'GIS workflow')}>
            {(['areas', ...(scenario ? ['roads' as const] : []), 'layers'] as const).map(id => <button key={id} type="button"
              aria-pressed={id === 'layers' ? !['areas', 'roads'].includes(tab) : tab === id}
              disabled={editor.active || !!pickTask}
              onClick={() => { setDetail(null); setTab(id); }}>
              {id === 'areas' ? t('Vùng sạt lở', 'Landslide areas') : id === 'roads' ? t('Đường', 'Roads') : t('Dữ liệu', 'Data')}
            </button>)}
          </nav>
          <nav
            hidden={tab === 'areas' || tab === 'roads'}
            className="geodata-tabs"
            role="tablist"
            aria-label={t('Công việc GIS', 'GIS tasks')}
          >
            {(['layers', 'aoi', 'scenes'] as const).map((id, index) => (
              <button
                key={id}
                id={`geo-tab-${id}`}
                role="tab"
                aria-selected={tab === id}
                aria-controls={`geo-panel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                disabled={editor.active || !!pickTask}
                onClick={() => {
                  setDetail(null);
                  setTab(id);
                }}
                onKeyDown={(event) => {
                  if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                    event.preventDefault();
                    const next = (['layers', 'aoi', 'scenes'] as const)[
                      (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3
                    ];
                    setDetail(null);
                    setTab(next);
                    document.getElementById(`geo-tab-${next}`)?.focus();
                  }
                }}
              >
                {id === 'layers'
                  ? t('Lớp', 'Layers')
                  : id === 'aoi'
                    ? t('Vùng quan tâm', 'AOI')
                    : t('Ảnh vệ tinh', 'Imagery')}
              </button>
            ))}
          </nav>
          <div className="geodata-sidebar-scroll">
            <div hidden={tab !== 'areas'} className="geodata-task-panel" aria-label={t('Vùng sạt lở', 'Landslide areas')}>
              <LandslideAreaList records={session.records} selectedId={session.selectedId} locale={locale} disabled={working}
                onCreate={state => {setAreaPointId(null);setDrawingLandslide(state);setDetail(null);setMobileTab('map');session.setError(null);editor.start('polygon');}}
                onSelect={select} onVisible={(id, visible) => display([id], visible)}/>
              {scenario && <ScenarioFeatureList scenario={scenario} types={['hazard']} disabled={working} selected={detail?.kind === 'scenario' ? detail.target : null} locale={locale}
                onSelect={selectScenario} onCreate={scenarioEdits?.canEdit ? type => {setNewDraft(newPointDraft(type));setInputTask('scenario');setDetail(null);} : undefined} />}
            </div>
            <div hidden={tab !== 'roads'} className="geodata-task-panel" aria-label={t('Đánh giá đường', 'Road assessment')}>
              {scenario && <ScenarioFeatureList scenario={scenario} types={['road']} disabled={working} selected={detail?.kind === 'scenario' ? detail.target : null} locale={locale} onSelect={selectScenario} />}
            </div>
            <div
              id="geo-panel-layers"
              role="tabpanel"
              aria-labelledby="geo-tab-layers"
              hidden={tab !== 'layers'}
            >
              {scenario && <ScenarioFeatureList scenario={scenario} types={['site', 'community']} disabled={working} selected={detail?.kind === 'scenario' ? detail.target : null} locale={locale}
                onSelect={selectScenario} onCreate={scenarioEdits?.canEdit ? type => {setNewDraft(newPointDraft(type));setInputTask('scenario');setDetail(null);} : undefined} />}
              {scenario && <h2 className="geodata-source-heading">{t('Dữ liệu nhập', 'Imported data')}</h2>}
              <div className="geodata-add-actions">
                <PointEntry
                  open={inputTask === 'point'}
                  onOpenChange={(open) => setInputTask(open ? 'point' : null)}
                  locale={locale}
                  session={session}
                  disabled={working}
                  onAdded={id => { select(id); notify(['Đã thêm điểm vào bản nháp.', 'Point added to draft.']); }}
                  pickedPoint={pickedReference}
                  onPick={() => { setPickTask('reference-new'); setDetail(null); setMobileTab('map'); }}
                />
                <GeometryImport
                  open={inputTask === 'import'}
                  onOpenChange={(open) => setInputTask(open ? 'import' : null)}
                  locale={locale}
                  busy={session.busy}
                  disabled={editor.active}
                  onDismissError={() => session.setError(null)}
                  error={
                    session.error
                      ? geometryErrorText(session.error, locale)
                      : undefined
                  }
                  onFiles={async (files, role) => {
                    setSceneView(null);
                    const saved = await session.importFiles(files, role);
                    if (saved) notify(['Đã thêm dữ liệu vào bản nháp.', 'Data added to draft.']);
                    return saved;
                  }}
                  onText={(text, role) => {
                    setSceneView(null);
                    const saved = session.importText(text, role);
                    if (saved) notify(['Đã thêm dữ liệu vào bản nháp.', 'Data added to draft.']);
                    return saved;
                  }}
                />
              </div>
              {session.records.some(record => !landslideAreaOf(record)) && <GeometryLayers
                records={session.records.filter(record => !landslideAreaOf(record))}
                selectedId={session.selectedId}
                locale={locale}
                disabled={working}
                onSelect={select}
                onUpdate={reviewUpdate}
                onBatch={batch}
              />}

              {results.length > 0 && (
                <label className="geodata-section geodata-scene-visibility">
                  <input
                    type="checkbox"
                    checked={showScenes}
                    onChange={(event) => setShowScenes(event.target.checked)}
                  />
                  {t('Phạm vi ảnh tìm được', 'Search result footprints')}
                </label>
              )}
            </div>
            <div
              id="geo-panel-aoi"
              role="tabpanel"
              aria-labelledby="geo-tab-aoi"
              hidden={tab !== 'aoi'}
            >
              <section className="geodata-section">
                <h2>{t('Vùng quan tâm', 'Area of interest')}</h2>
                {aoi ? (
                  <>
                    <GeometryNameEditor key={aoi.id} name={aoi.name} label={t('Tên vùng', 'Area name')}
                      inputLabel={t('Tên vùng', 'Area name')} locale={locale} disabled={working}
                      onSave={name => session.update(aoi.id, { name })} onNotice={notify} />
                    <div className="geodata-actions geodata-aoi-actions">
                      <button
                        className="button"
                        disabled={working}
                        onClick={() => {
                          session.select(aoi.id);
                          setDetail(null);
                          setSceneView(null);
                          setAreaPointId(null);
                          editor.start('edit', aoi.id, aoi.feature.geometry);
                          setMobileTab('map');
                        }}
                      >
                        <UiIcon name="edit" />
                        {t('Sửa ranh giới', 'Edit boundary')}
                      </button>
                      <button
                        className="button soft"
                        disabled={working}
                        onClick={() => setTab('scenes')}
                      >
                        {t('Tìm ảnh vệ tinh', 'Find imagery')}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="geodata-empty">
                    {t(
                      'Vẽ vùng mới hoặc chọn một vùng có sẵn trong tab Lớp.',
                      'Draw a new area or choose an existing area in Layers.'
                    )}
                  </p>
                )}
              </section>
              {editor.mode === 'edit' && editor.draft.geometry && (
                <GeometryVertexEditor
                  geometry={editor.draft.geometry}
                  locale={locale}
                  onMove={editor.move}
                />
              )}
              <GeometryCoverage
                locale={locale}
                coverage={analysis.result}
                onSelect={select}
              />
            </div>
            <div
              id="geo-panel-scenes"
              role="tabpanel"
              aria-labelledby="geo-tab-scenes"
              hidden={tab !== 'scenes'}
            >
              <SceneCatalog
                locale={locale}
                {...repository}
                disabled={working}
                onRetry={repository.retry}
                aoi={aoi}
                results={results}
                queryAoi={queryAoi}
                selected={selectedScenes}
                onSelection={setSelectedScenes}
                onResults={(rows, signature) => {
                  setResults(rows);
                  setQueryAoi(signature);
                  setSceneView(null);
                }}
                onInspect={(item) => setDetail({ kind: 'scene', id: item.id })}
                onAdd={addScenes}
                onExport={() => {
                  if (!aoi || !repository.catalog) return;
                  const scenes = repository.catalog.scenes.filter((item) =>
                    selectedScenes.includes(item.id)
                  );
                  download(
                    JSON.stringify(
                      {
                        type: 'imagery-selection',
                        version: 1,
                        aoi: aoi.feature,
                        catalogSource: repository.catalog.source,
                        scenes,
                        review:
                          aoi.feature.geometry.type === 'Polygon' ||
                          aoi.feature.geometry.type === 'MultiPolygon'
                            ? reviewScenePair(scenes, aoi.feature.geometry)
                            : 'count',
                        rasterLoaded: false
                      },
                      null,
                      2
                    ),
                    'dear-imagery-selection.json'
                  );
                }}
              />
            </div>
          </div>
          {(tab === 'layers' || tab === 'aoi') && (
            <GeometryExport
              locale={locale}
              exportRecords={exportRecords}
              exportScope={exportScope}
              onScope={setExportScope}
              disabled={working}
              onError={session.setError}
              onNotice={notify}
            />
          )}
        </aside>
        <PanelResizeHandle
          locale={locale}
          storageKey="dear.geodata.panel-width"
        />
        <GeometryMap
          onSelectScenario={selectScenario}
          scenarioFocus={scenarioFocus}
          onResponseScenario={onResponseScenario}
          onScenarioNotice={notify}
          onPickPoint={pickTask ? point => {
            if(typeof pickTask==='object' && pickTask.kind==='area-road') {
              const road=scenario?.roads.find(r=>r.id===pickTask.roadId), anchor=road&&nearestRoadAnchor([road],roadProjected(point.latitude,point.longitude),100);
              if(!anchor){notify(['Chọn sát đoạn đường đang liên kết.', 'Choose a point close to the linked road.']);return;}
              if(!pickTask.start){setPickTask({...pickTask,start:{station:anchor.station,...roadGeographic(anchor.point)}});return;}
              const fromM=Math.round(Math.min(pickTask.start.station,anchor.station)),toM=Math.floor(Math.max(pickTask.start.station,anchor.station));
              if(toM<=fromM){notify(['Chọn hai vị trí khác nhau trên đoạn đường.', 'Choose two different locations on the road.']);return;}
              setPickedRoadInterval({areaId:pickTask.areaId,roadId:pickTask.roadId,fromM,toM,version:Date.now()});setPickTask(null);return;
            }
            const latitude=point.latitude.toFixed(6), longitude=point.longitude.toFixed(6);
            if(pickTask==='scenario-new'){setNewDraft(current=>current?{...current,latitude,longitude}:current);setInputTask('scenario');}
            else if(pickTask==='reference-new'){setPickedReference(point);setInputTask('point');}
            else if(pickTask==='scenario-edit') setDetail(current=>current?.kind==='scenario'?{...current,moving:true,pending:roadProjected(point.latitude,point.longitude)}:current);
            else setPickedImportEdit({id:pickTask.id,...point});
            setPickTask(null);
          } : undefined}
          pickLabel={typeof pickTask==='object' && pickTask?.kind==='area-road' ? pickTask.start ? ['Chọn cuối phần đường bị ảnh hưởng.','Choose the end of the exposed road section.'] : ['Chọn đầu phần đường bị ảnh hưởng.','Choose the start of the exposed road section.'] : pickTask==='scenario-new'?['Chọn vị trí điểm mới.','Choose a new point.']:pickTask==='reference-new'?['Chọn điểm dữ liệu nhập.','Choose an imported point.']:['Chọn vị trí mới cho đối tượng.','Choose the new feature position.']}
          pickAnchor={typeof pickTask==='object'&&pickTask?.kind==='area-road'?pickTask.start:undefined}
          onCancelPick={() => { const previous=pickTask;setPickTask(null);if(previous==='scenario-new')setInputTask('scenario');if(previous==='reference-new')setInputTask('point'); }}
          onPickScenarioPosition={() => {setPickTask('scenario-edit');setMobileTab('map');}}
          scenario={scenario}
          scenarioEdits={scenarioEdits}
          onRenameScenario={onRenameScenario}
          records={mapRecords}
          selectedId={scene ? `scene:${scene.id}` : session.selectedId}
          locale={locale}
          offline={offline}
          viewRequest={
            sceneView && sceneView.version > session.viewRequest.version
              ? sceneView
              : session.viewRequest
          }
          onSelect={select}
          detail={detail?.kind === 'scenario' || detail?.kind === 'group' ? detail : null}
          onDetail={setDetail}
          editor={editor}
          snapping={snapping}
          drawingColor={drawingLandslide === 'occurred' ? '#b45147' : drawingLandslide || areaPointId ? '#b77b28' : undefined}
          onFinish={finish}
          onCancel={cancelGeometry}
          intersection={analysis.result?.intersection ?? null}
        />
        {inspecting && selected && !scene && (
          <aside
            className="geodata-inspector"
            hidden={editor.active || !!pickTask}
            aria-label={t('Hồ sơ đối tượng', 'Feature record')}
          >
            <header className="geodata-inspector-header">
              <h2>{selected.name}</h2>
              <button
                className="icon-button"
                aria-label={t('Đóng hồ sơ đối tượng', 'Close feature record')}
                onClick={() => setDetail(null)}
              >
                <UiIcon name="close" />
              </button>
            </header>
            <div className="geodata-inspector-scroll">
              <GeometryInspector
                key={selected.id}
                records={session.records}
                selectedId={session.selectedId}
                locale={locale}
                disabled={working}
                roads={scenario?.roads ?? []}
                networkVersion={scenario?.datasetVersion}
                pickedRoadInterval={pickedRoadInterval}
                onPickRoadInterval={roadId => {setPickTask({kind:'area-road',roadId,areaId:selected.id});setMobileTab('map');setScenarioFocus({type:'road',id:roadId});}}
                onSaveLandslideArea={value => {
                  const owner=fieldAreaOwner(selected,session.records);
                  const mapped=owner?{...value,observationIds:[...new Set([...value.observationIds,owner.id])]}:value;
                  const saved = session.updateProperties(selected.id, { [landslideAreaKey]: mapped, ...(owner?{[fieldAreaKey]:null}:{}) });
                  if (saved) {
                    setPickedRoadInterval(null);
                    notify(['Đã lưu vùng vào bản nháp GIS.', 'Area saved to GIS draft.']);
                  }
                  return saved;
                }}
                onOpenRoad={id => selectScenario({type:'road',id})}
                onUpdate={reviewUpdate}
                onNotice={notify}
                onPickCoordinates={id => {setPickTask({kind:'import-edit',id});setMobileTab('map');}}
                onCoordinates={(id, coordinates) => {
                  const saved = session.replaceGeometry(id, { type: 'Point', coordinates });
                  if (saved) notify(['Đã sửa tọa độ trong bản nháp.', 'Coordinates updated in draft.']);
                  return saved;
                }}
                onAnnotate={(id, value) => {
                  const saved = session.annotate(id, value);
                  if (saved) notify(['Đã sửa ghi nhận trong bản nháp.', 'Field observation updated in draft.']);
                  return saved;
                }}
                onResponse={onResponse}
                onRemove={id => setPendingAction({ kind: 'delete', id })}
                onFit={(id) => {
                  session.fit(id);
                  setMobileTab('map');
                }}
                onDrawArea={(id) => {
                  session.setError(null);
                  setDrawingLandslide(null);
                  setAreaPointId(id);
                  setMobileTab('map');
                  editor.start('polygon');
                }}
                onEditArea={(id) => {
                  const region = session.records.find((r) => r.id === id);
                  const owner =
                    region && fieldAreaOwner(region, session.records);
                  if (region && (owner || landslideAreaOf(region))) {
                    setAreaPointId(owner?.id ?? null);
                    setDrawingLandslide(null);
                    setMobileTab('map');
                    editor.start('edit', id, region.feature.geometry);
                  }
                }}
              />
            </div>
          </aside>
        )}
        {scene && (
          <SceneDetails
            scene={scene}
            locale={locale}
            onClose={() => setDetail(null)}
            onFit={() => {
              setSceneView((previous) => ({
                version:
                  Math.max(
                    previous?.version ?? 0,
                    session.viewRequest.version
                  ) + 1,
                id: `scene:${scene.id}`
              }));
              setShowScenes(true);
              setMobileTab('map');
              if (window.matchMedia('(max-width:1100px)').matches)
                setDetail(null);
            }}
          />
        )}
      </div>
      {inputTask === 'scenario' && newDraft && scenarioEdits?.canEdit && <ScenarioPointDialog draft={newDraft} onDraft={setNewDraft} locale={locale}
        onClose={() => {setInputTask(null);setNewDraft(null);setPickTask(null);}}
        onPick={() => {setInputTask(null);setPickTask('scenario-new');setDetail(null);setMobileTab('map');}}
        onSave={(change,note) => {
          const target:ScenarioTarget={type:newDraft.type,id:change.feature.id};
          const saved=scenarioEdits.record({target:{...target,name:newDraft.name.trim()},change,note});
          if(saved){selectScenario(target);notify(['Đã thêm đối tượng vào bản nháp.','Feature added to draft.']);}
          return saved;
        }} />}
      {pickedImportEdit && <ConfirmDialog title={t('Dời điểm dữ liệu nhập?', 'Move imported point?')} locale={locale}
        confirmLabel={t('Cập nhật vị trí', 'Update position')} onCancel={() => setPickedImportEdit(null)}
        onConfirm={() => {
          const record=session.records.find(item=>item.id===pickedImportEdit.id);
          if(!record||record.feature.geometry.type!=='Point') return;
          const saved=session.replaceGeometry(record.id,{type:'Point',coordinates:[pickedImportEdit.longitude,pickedImportEdit.latitude,...record.feature.geometry.coordinates.slice(2)]});
          if(saved){setPickedImportEdit(null);notify(['Đã sửa vị trí trong bản nháp.','Point position updated in draft.']);}
        }}><p>{session.records.find(item=>item.id===pickedImportEdit.id)?.name}</p><p>{pickedImportEdit.latitude.toFixed(6)}°, {pickedImportEdit.longitude.toFixed(6)}°</p></ConfirmDialog>}
      {pendingAction && <GeometryActionDialog action={pendingAction} records={session.records} locale={locale}
        onConfirm={confirmAction} onCancel={() => setPendingAction(null)} />}
      <NoticeToast notice={notice} locale={locale} onDismiss={dismiss} />
    </div>
  );
}
