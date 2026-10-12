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

const storageKey = 'dear.geodata.v1';
function read() {
  try {
    const text = localStorage.getItem(storageKey);
    if (text && textBytes(text) > GEOMETRY_LIMITS.storageBytes) throw new GeometryError('storage');
    return {
      records: text ? restoreGeometryRecords(JSON.parse(text)) : [],
      error: null as unknown
    };
  } catch {
    return {
      records: [] as GeometryRecord[],
      error: new GeometryError('storage')
    };
  }
}

export function useGeometrySession() {
  const [initial] = useState(read);
  const [records, setRecords] = useState(initial.records);
  const [error, setError] = useState<unknown>(initial.error);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initial.records[0]?.id ?? null);
  const [viewRequest, setViewRequest] = useState({
    version: initial.records.length ? 1 : 0,
    id: null as string | null
  });
  const latest = useRef(records);
  latest.current = records;
  const past = useRef<GeometryRecord[][]>([]),
    future = useRef<GeometryRecord[][]>([]);
  const [, setHistoryVersion] = useState(0);
  const commit = (next: GeometryRecord[]) => {
    if (next === latest.current) return;
    past.current = [...past.current, latest.current].slice(-25);
    future.current = [];
    latest.current = next;
    setRecords(next);
    setHistoryVersion((value) => value + 1);
  };
  const travel = (action: 'undo' | 'redo') => {
    const next = geometryHistory(past.current, latest.current, future.current, action);
    past.current = next.past;
    future.current = next.future;
    latest.current = next.present;
    setRecords(next.present);
    setSelectedId((id) => (next.present.some((record) => record.id === id) ? id : null));
    setError(null);
    setHistoryVersion((value) => value + 1);
  };
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (initial.error && records === initial.records) return;
    try {
      validateGeometryStorageBudget(records);
      const value = JSON.stringify(records);
      localStorage.setItem(storageKey, value);
    } catch {
      setError(new GeometryError('storage'));
    }
  }, [records]);
  const fit = (id: string | null = null) =>
    setViewRequest((previous) => ({ version: previous.version + 1, id }));
  const add = (additions: GeometryRecord[]) => {
    const combined = addGeometryRecords(latest.current, additions);
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
      (patch.role && patch.role !== 'reference' && !isPolygon(target.feature.geometry))
    )
      return;
    commit(
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
                editedAt: new Date().toISOString(),
                editMethod: 'manual-vertices-v1'
              }
            }
          }
        : record
    );
    validateGeometryBudget(next.map(record => record.feature.geometry));
    validateGeometryStorageBudget(next);
    commit(next);
    setError(null);
  };
  const remove = (id: string) => {
    commit(latest.current.filter((record) => record.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const annotate = (id: string, observation: FieldObservation): boolean => {
    try {
      const target = latest.current.find(record => record.id === id);
      if (!target) return false;
      const edited = annotateRecord(target, observation);
      const next = latest.current.map(record => record.id === id ? edited : record);
      validateGeometryStorageBudget(next);
      // Fail before changing the map if storage cannot retain the observation and photo previews.
      localStorage.setItem(storageKey, JSON.stringify(next));
      commit(next); setError(null); return true;
    } catch { setError(new GeometryError('storage')); return false; }
  };
  return {
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
