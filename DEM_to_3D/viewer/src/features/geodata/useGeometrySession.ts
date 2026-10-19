import type { FieldDataset } from '../landslides/fieldDataset';
import { installPreparedRecords, gisValueKey, publishedGisKey, readPublishedGis, writePublishedRecords } from './publishedGis';
import { landslideAreaKey, landslideAreaOf, revisedLandslideBoundary } from '../landslides/landslideAreas';
import { GEOMETRY_LIMITS, textBytes } from '../../geo/vector/limits';
import { validateGeometryBudget } from '../../geo/vector/geometryBudget';
import { importGeometryFiles } from './importGeometryFiles';
import { useEffect, useRef, useState } from 'react';
import {
  GeometryError,
  isPolygon,
  type GeometryRecord,
  type VectorGeometry
} from '../../geo/vector/types';
import { validateGeometry } from '../../geo/vector/validateGeometry';
import { parseSpatialInput } from './parseSpatialInput';
import {
  addGeometryRecords,
  createGeometryRecords,
  restoreGeometryRecords,
  validateGeometryStorageBudget,
  type ImportRole
} from './geometrySession';
import { geometryHistory } from './geometryEditing';

import { annotateRecord, type FieldObservation } from '../observations/model';

import { removeWithFieldAreas, fieldAreaOf } from '../observations/fieldAreas';


function read(prepared?: FieldDataset) {
  try {
    const text = JSON.stringify((prepared ? installPreparedRecords(prepared) : readPublishedGis()).records);
    if (text && textBytes(text) > GEOMETRY_LIMITS.storageBytes)
      throw new GeometryError('storage');
    return {
      records: text ? restoreGeometryRecords(JSON.parse(text)) : [],
      error: null as unknown
    };
  } catch {
    // A failed source installation must not hide records that were already saved.
    let records = prepared?.records ?? [] as GeometryRecord[];
    try {
      const saved = readPublishedGis();
      const ids = new Set(saved.records.map(record => record.id));
      const pending = prepared && !saved.installedSources?.includes(prepared.id) ? prepared.records : [];
      records = [...saved.records, ...pending.filter(record => !ids.has(record.id))];
    } catch { /* Invalid or inaccessible storage remains read-only. */ }
    return {records, error: new GeometryError('storage')};
  }
}

export function useGeometrySession(options: {draft?:boolean;initialRecords?:GeometryRecord[];initialSelectedId?:string|null;prepared?:FieldDataset} = {}) {
  const [initial] = useState(()=>options.initialRecords?{records:options.initialRecords,error:null}:read(options.prepared));
  // Records as last read from or written to storage; writes merge against it (see mergeRecords).
  const synced = useRef(initial.records);
  // Set when a write had to merge in another tab's changes; the next commit adopts it.
  const merged = useRef<GeometryRecord[] | null>(null);
  const write=(next:GeometryRecord[])=>{validateGeometryStorageBudget(next);if(options.draft)return;
    const written=writePublishedRecords(next,synced.current);synced.current=written;merged.current=written===next?null:written;};
  const [records, setRecords] = useState(initial.records);
  const [error, setError] = useState<unknown>(initial.error);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() => options.initialSelectedId ?? null);
  const [viewRequest, setViewRequest] = useState({
    version: initial.records.length ? 1 : 0,
    id: options.initialSelectedId ?? null as string | null
  });
  const latest = useRef(records);
  latest.current = records;
  const past = useRef<GeometryRecord[][]>([]),
    future = useRef<GeometryRecord[][]>([]);
  const [, setHistoryVersion] = useState(0);
  const commit = (proposed: GeometryRecord[]) => {
    const next = merged.current ?? proposed;
    merged.current = null;
    if (next === latest.current) return;
    past.current = [...past.current, latest.current].slice(-25);
    future.current = [];
    latest.current = next;
    setRecords(next);
    setHistoryVersion((value) => value + 1);
  };
  const store = (next: GeometryRecord[]): boolean => {
    try {
      validateGeometryStorageBudget(next);
      write(next);
      setError(null);
      return true;
    } catch {
      setError(new GeometryError('storage'));
      return false;
    }
  };
  const persist = (next: GeometryRecord[]): boolean => {
    if (!store(next)) return false;
    commit(next);
    return true;
  };
  const travel = (action: 'undo' | 'redo') => {
    const next = geometryHistory(
      past.current,
      latest.current,
      future.current,
      action
    );
    if (!store(next.present)) return;
    const present = merged.current ?? next.present;
    merged.current = null;
    past.current = next.past;
    future.current = next.future;
    latest.current = present;
    setRecords(present);
    setSelectedId((id) =>
      next.present.some((record) => record.id === id) ? id : null
    );
    setError(null);
    setHistoryVersion((value) => value + 1);
  };
  // Pick up records published by another tab, e.g. a resident report or a coordinator review.
  useEffect(() => {
    if (options.draft) return;
    const sync = (event: StorageEvent) => {
      if (event.key !== publishedGisKey) return;
      const stored = read();
      if (stored.error) return;
      if (gisValueKey(stored.records) === gisValueKey(latest.current)) return;
      synced.current = stored.records;
      latest.current = stored.records;
      merged.current = null;
      // An undo snapshot predating another tab's report must never erase that report.
      past.current = [];
      future.current = [];
      setRecords(stored.records);
      setSelectedId(id => stored.records.some(record => record.id === id) ? id : null);
      setHistoryVersion(value => value + 1);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [options.draft]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const fit = (id: string | null = null) =>
    setViewRequest((previous) => ({ version: previous.version + 1, id }));
  const add = (additions: GeometryRecord[]) => {
    const combined = addGeometryRecords(latest.current, additions);
    write(combined);
    commit(combined);
    setSelectedId(additions[0]?.id ?? null);
    setError(null);
    fit();
  };
  const importText = (text: string, role: ImportRole) => {
    try {
      const parsed = parseSpatialInput(text);
      add(
        createGeometryRecords(
          parsed,
          parsed.format === 'coordinate' ? 'WGS84' : parsed.format,
          role
        )
      );
      return true;
    } catch (reason) {
      setError(reason);
      return false;
    }
  };
  const importFiles = async (files: File[], role: ImportRole) => {
    setBusy(true);
    setError(null);
    try {
      const additions = await importGeometryFiles(files, role);
      if (alive.current) {
        add(additions);
        return true;
      }
      return false;
    } catch (reason) {
      if (alive.current) setError(reason);
      return false;
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const select = (id: string) => {
    setSelectedId(id);
  };
  const update = (
    id: string,
    patch: Partial<Pick<GeometryRecord, 'name' | 'visible' | 'role'>>
  ) => {
    const previous = latest.current;
    const target = previous.find((record) => record.id === id);
    if (
      !target ||
      ((fieldAreaOf(target) || landslideAreaOf(target)) && patch.role && patch.role !== 'reference') ||
      (patch.role &&
        patch.role !== 'reference' &&
        !isPolygon(target.feature.geometry))
    )
      return false;
    return persist(
      previous.map((record) => {
        if (record.id === id) return { ...record, ...patch };
        return patch.role === 'aoi' && record.role === 'aoi'
          ? { ...record, role: 'reference' as const }
          : record;
      })
    );
  };
  const replaceGeometry = (id: string, raw: VectorGeometry, show = false) => {
    const geometry = validateGeometry(raw);
    const next = latest.current.map((record) =>
      record.id === id
        ? {
            ...record,
            visible: show || record.visible,
            feature: {
              ...record.feature,
              geometry,
              properties: {
                ...record.feature.properties,
                ...(landslideAreaOf(record) ? { [landslideAreaKey]: revisedLandslideBoundary(landslideAreaOf(record)!, new Date().toISOString()) } : {}),
                editedAt: new Date().toISOString(),
                editMethod: geometry.type === 'Point' ? 'manual-coordinates-v1' : 'manual-vertices-v1'
              }
            }
          }
        : record
    );
    validateGeometryBudget(next.map((record) => record.feature.geometry));
    validateGeometryStorageBudget(next);
    return persist(next);
  };
  const remove = (id: string) => {
    if (!persist(removeWithFieldAreas(latest.current, id))) return false;
    if (selectedId === id) setSelectedId(null);
    return true;
  };
  const annotate = (
    id: string,
    observation: FieldObservation,
    properties: Record<string, unknown> = {}
  ): boolean => {
    try {
      const target = latest.current.find((record) => record.id === id);
      if (!target) return false;
      const edited = annotateRecord(
        {
          ...target,
          feature: {
            ...target.feature,
            properties: { ...target.feature.properties, ...properties }
          }
        },
        observation
      );
      const next = latest.current.map((record) =>
        record.id === id ? edited : record
      );
      validateGeometryStorageBudget(next);
      // Fail before changing the map if storage cannot retain the observation and photo previews.
      write(next);
      commit(next);
      setError(null);
      return true;
    } catch {
      setError(new GeometryError('storage'));
      return false;
    }
  };
  const updateProperties = (
    id: string,
    properties: Record<string, unknown>
  ): boolean => {
    try {
      const target = latest.current.find((r) => r.id === id);
      if (!target) return false;
      const next = latest.current.map((r) =>
        r.id === id
          ? {
              ...r,
              feature: {
                ...r.feature,
                properties: { ...r.feature.properties, ...properties }
              }
            }
          : r
      );
      validateGeometryStorageBudget(next);
      write(next);
      commit(next);
      setError(null);
      return true;
    } catch {
      setError(new GeometryError('storage'));
      return false;
    }
  };
  const batch = (
    ids: string[],
    action: 'show' | 'hide' | 'delete'
  ): boolean => {
    try {
      const chosen = new Set(ids);
      // Linked extents follow their parent when hidden or removed.
      const affected = latest.current
        .filter(
          (r) =>
            chosen.has(r.id) || chosen.has(fieldAreaOf(r)?.observationId ?? '')
        )
        .map((r) => r.id);
      const set = new Set(affected);
      const next =
        action === 'delete'
          ? latest.current.filter((r) => !set.has(r.id))
          : latest.current.map((r) =>
              set.has(r.id) ? { ...r, visible: action === 'show' } : r
            );
      write(next);
      commit(next);
      if (action === 'delete' && selectedId && set.has(selectedId))
        setSelectedId(null);
      setError(null);
      return true;
    } catch {
      setError(new GeometryError('storage'));
      return false;
    }
  };
  const accept = (next: GeometryRecord[], { preserveHistory = false } = {}) => {
    validateGeometryStorageBudget(next);
    if (!options.draft) synced.current = next;
    latest.current = next;
    setRecords(next);
    setSelectedId(id => next.some(record => record.id === id) ? id : null);
    if (!preserveHistory) { past.current = []; future.current = []; }
    setHistoryVersion(v => v + 1);
    setError(null);
  };
  return {
    accept,
    draft:!!options.draft,
    batch,
    updateProperties,
    annotate,
    records,
    selectedId,
    viewRequest,
    error,
    busy,
    importText,
    importFiles,
    add,
    fit,
    select,
    update,
    replaceGeometry,
    remove,
    setError,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    undo: () => travel('undo'),
    redo: () => travel('redo')
  };
}
