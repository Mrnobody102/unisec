import type { RenameScenario } from '../access/ScenarioLabels';
import { isSelectPickerEvent } from '../../shared/ui/selectKeyboard';
import type { ScenarioEdits } from '../access/scenarioEdits';
import type { ScenarioOverlay } from './scenarioOverlay';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GeometryError } from '../../geo/vector/types';
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
import {
  createFieldArea,
  fieldAreaOwner,
  linkedFieldAreas
} from '../observations/fieldAreas';
import { GeometryLayers } from './GeometryLayers';
import { GeometryCoverage } from './GeometryCoverage';
import { GeometryMap } from './GeometryMap';
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
  locale: Locale;
  onClose: () => void;
  offline?: boolean;
  standalone?: boolean;
  session?: ReturnType<typeof useGeometrySession>;
  onResponse?: (id: string) => void;
  scenario?: ScenarioOverlay;
  scenarioEdits?: ScenarioEdits;
  onRenameScenario?: RenameScenario;
};
type Tab = 'layers' | 'aoi' | 'scenes';
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
    <GeometryWorkspaceView {...props} session={props.session} />
  ) : (
    <LocalGeometryWorkspace {...props} />
  );
}
function LocalGeometryWorkspace(props: Props): JSX.Element {
  const session = useGeometrySession();
  return <GeometryWorkspaceView {...props} session={session} />;
}
function GeometryWorkspaceView({
  scenario,
  scenarioEdits,
  onRenameScenario,
  locale,
  onClose,
  offline = false,
  standalone = false,
  session,
  onResponse
}: Props & { session: ReturnType<typeof useGeometrySession> }): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const workspaceRoot = useRef<HTMLDivElement>(null);
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
  const [inputTask, setInputTask] = useState<'point' | 'import' | null>(null);
  const [tab, setTab] = useState<Tab>('layers'),
    [mobileTab, setMobileTab] = useState<'data' | 'map'>('data');
  const [snapping, setSnapping] = useState(false),
    [exportScope, setExportScope] = useState('all');
  const [selectedScenes, setSelectedScenes] = useState(readSelection),
    [results, setResults] = useState<SceneResult[]>([]);
  const [queryAoi, setQueryAoi] = useState<string | null>(null),
    [sceneId, setSceneId] = useState<string | null>(null);
  const [showScenes, setShowScenes] = useState(true),
    [sceneView, setSceneView] = useState<{
      version: number;
      id: string | null;
    } | null>(null);
  const [inspecting, setInspecting] = useState(!!session.selectedId);
  const [areaPointId, setAreaPointId] = useState<string | null>(null);
  const aoi = session.records.find((record) => record.role === 'aoi');
  const selected = session.records.find(
    (record) => record.id === session.selectedId
  );
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
      if (event.key === 'Escape' && sceneId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setSceneId(null);
        return;
      }
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
      onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [editor.active, onClose]);
  const select = (id: string) => {
    if (editor.active) return;
    const candidate = repository.catalog?.scenes.find(
      (item) => `scene:${item.id}` === id
    );
    if (candidate && !session.records.some((record) => record.id === id)) {
      setSceneId(candidate.id);
      return;
    }
    const record = session.records.find((r) => r.id === id);
    const owner = record && fieldAreaOwner(record, session.records);
    session.select(owner?.id ?? id);
    setInspecting(true);
    setMobileTab('data');
    setSceneId(null);
    setTab('layers');
  };
  const start = (mode: GeometryMode) => {
    setAreaPointId(null);
    setInspecting(false);
    session.setError(null);
    setSceneId(null);
    setSceneView(null);
    setMobileTab('map');
    if (mode === 'edit' && selected) {
      editor.start(mode, selected.id, selected.feature.geometry);
      setTab('aoi');
    } else editor.start(mode);
  };
  const finish = () => {
    try {
      const geometry = editor.result();
      const fieldOwner =
        areaPointId && session.records.find((r) => r.id === areaPointId);
      if (fieldOwner) {
        if (editor.mode === 'edit' && editor.recordId)
          session.replaceGeometry(editor.recordId, geometry);
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
      } else if (editor.mode === 'edit' && editor.recordId)
        session.replaceGeometry(editor.recordId, geometry);
      else if (aoi) {
        session.replaceGeometry(aoi.id, geometry, true);
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
      setTab(fieldOwner ? 'layers' : 'aoi');
      setInspecting(!!fieldOwner);
      setAreaPointId(null);
      if (fieldOwner) setMobileTab('data');
    } catch (error) {
      session.setError(error);
    }
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
      setSceneId(null);
      setSceneView(null);
      setTab('layers');
    } catch (error) {
      session.setError(error);
    }
  };
  const error = session.error || analysis.error;
  const working = editor.active || session.busy;
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
        busy={session.busy}
        canUndo={session.canUndo}
        canRedo={session.canRedo}
        onUndo={session.undo}
        onRedo={session.redo}
        hasSelection={Boolean(selected)}
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
        onCancel={() => {
          editor.cancel();
          session.setError(null);
        }}
      />
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
            setSceneId(null);
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
            inspecting && !!selected && tab === 'layers' && !editor.active
              ? 'true'
              : undefined
          }
          aria-label={t('Quản lý dữ liệu GIS', 'GIS data controls')}
        >
          <nav
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
                onClick={() => setTab(id)}
                onKeyDown={(event) => {
                  if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                    event.preventDefault();
                    const next = (['layers', 'aoi', 'scenes'] as const)[
                      (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3
                    ];
                    setTab(next);
                    document.getElementById(`geo-tab-${next}`)?.focus();
                  }
                }}
              >
                {id === 'layers'
                  ? t('Lớp', 'Layers')
                  : id === 'aoi'
                    ? 'AOI'
                    : t('Ảnh vệ tinh', 'Imagery')}
              </button>
            ))}
          </nav>
          <div className="geodata-sidebar-scroll">
            <div
              id="geo-panel-layers"
              role="tabpanel"
              aria-labelledby="geo-tab-layers"
              hidden={tab !== 'layers'}
            >
              <div className="geodata-add-actions">
                <PointEntry
                  open={inputTask === 'point'}
                  onOpenChange={(open) => setInputTask(open ? 'point' : null)}
                  locale={locale}
                  session={session}
                  disabled={working}
                  onAdded={select}
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
                    return session.importFiles(files, role);
                  }}
                  onText={(text, role) => {
                    setSceneView(null);
                    return session.importText(text, role);
                  }}
                />
              </div>
              <GeometryLayers
                records={session.records}
                selectedId={session.selectedId}
                locale={locale}
                disabled={working}
                onSelect={select}
                onUpdate={session.update}
                onBatch={session.batch}
              />

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
                    <label className="geodata-field">
                      {t('Tên vùng', 'Area name')}
                      <input
                        aria-label={t('Tên vùng', 'Area name')}
                        key={aoi.id}
                        defaultValue={aoi.name}
                        maxLength={160}
                        disabled={working}
                        onBlur={(e) => {
                          const name = e.target.value.trim();
                          if (name) session.update(aoi.id, { name });
                          else e.target.value = aoi.name;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                      />
                    </label>
                    <div className="geodata-actions geodata-aoi-actions">
                      <button
                        className="button"
                        disabled={working}
                        onClick={() => {
                          session.select(aoi.id);
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
                onInspect={(item) => setSceneId(item.id)}
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
          {tab !== 'scenes' && (
            <GeometryExport
              locale={locale}
              exportRecords={exportRecords}
              exportScope={exportScope}
              onScope={setExportScope}
              disabled={working}
              onError={session.setError}
            />
          )}
        </aside>
        <PanelResizeHandle
          locale={locale}
          storageKey="dear.geodata.panel-width"
        />
        <GeometryMap
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
          onGroupOpen={() => setInspecting(false)}
          editor={editor}
          snapping={snapping}
          drawingColor={areaPointId ? '#b87919' : undefined}
          onFinish={finish}
          onCancel={() => {
            editor.cancel();
            if (areaPointId) {
              setInspecting(true);
              setMobileTab('data');
            }
            setAreaPointId(null);
            session.setError(null);
          }}
          intersection={analysis.result?.intersection ?? null}
        />
        {inspecting && selected && tab === 'layers' && !scene && (
          <aside
            className="geodata-inspector"
            hidden={editor.active}
            aria-label={t('Hồ sơ đối tượng', 'Feature record')}
          >
            <header className="geodata-inspector-header">
              <h2>{selected.name}</h2>
              <button
                className="icon-button"
                aria-label={t('Đóng hồ sơ đối tượng', 'Close feature record')}
                onClick={() => setInspecting(false)}
              >
                <UiIcon name="close" />
              </button>
            </header>
            <div className="geodata-inspector-scroll">
              <GeometryInspector
                records={session.records}
                selectedId={session.selectedId}
                locale={locale}
                disabled={working}
                onUpdate={session.update}
                onCoordinates={(id, coordinates) =>
                  session.replaceGeometry(id, { type: 'Point', coordinates })
                }
                onAnnotate={session.annotate}
                onResponse={onResponse}
                onRemove={session.remove}
                onFit={(id) => {
                  session.fit(id);
                  setMobileTab('map');
                }}
                onDrawArea={(id) => {
                  session.setError(null);
                  setAreaPointId(id);
                  setMobileTab('map');
                  editor.start('polygon');
                }}
                onEditArea={(id) => {
                  const region = session.records.find((r) => r.id === id);
                  const owner =
                    region && fieldAreaOwner(region, session.records);
                  if (region && owner) {
                    setAreaPointId(owner.id);
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
            onClose={() => setSceneId(null)}
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
                setSceneId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
