import {
  restoreGeometryRecords,
  validateGeometryStorageBudget,
} from "./geometrySession";
import type { GeometryRecord } from "../../geo/vector/types";
import type { ScenarioEdit } from "../access/scenarioEdits";
export const publishedGisKey = "dear.gis.v2";
/** JSON object field order is not a data change; feature/edit array order still is. */
export function gisValueKey(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
      : item,
  );
}
export type PreparedGeometrySource = {id:string; records:GeometryRecord[]; additionalSources?:Array<{id:string;records:GeometryRecord[]}>};
export const preparedSources = (source: PreparedGeometrySource) => [source, ...(source.additionalSources ?? [])];
export type PublishedGis = {
  schema: "dear-gis/v2";
  records: GeometryRecord[];
  scenarios: Record<string, ScenarioEdit[]>;
  installedSources?: string[];
};
const legacyRecords = "dear.geodata.v1",
  prefix = "dear.scenario-edits.v1:";
export function readPublishedGis(
  storage: Storage = localStorage,
): PublishedGis {
  const text = storage.getItem(publishedGisKey);
  if (text) {
    const raw = JSON.parse(text) as PublishedGis;
    if (
      raw?.schema !== "dear-gis/v2" ||
      !Array.isArray(raw.records) ||
      !raw.scenarios ||
      typeof raw.scenarios !== "object" ||
      Array.isArray(raw.scenarios) ||
      !Object.values(raw.scenarios).every(Array.isArray) ||
      (raw.installedSources !== undefined && (!Array.isArray(raw.installedSources) || !raw.installedSources.every(id => typeof id === 'string' && /^[0-9a-f]{64}$/.test(id))))
    )
      throw new Error("Invalid GIS workspace");
    return { ...raw, records: restoreGeometryRecords(raw.records) };
  }
  const records = restoreGeometryRecords(
      JSON.parse(storage.getItem(legacyRecords) ?? "[]"),
    ),
    scenarios: Record<string, ScenarioEdit[]> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(prefix)) {
      try {
        const entries = JSON.parse(storage.getItem(key) ?? "[]");
        if (Array.isArray(entries))
          scenarios[key.slice(prefix.length)] = entries;
      } catch {
        /* Preserve invalid legacy sources. */
      }
    }
  }
  return { schema: "dear-gis/v2", records, scenarios };
}
export function writePublishedGis(
  next: PublishedGis,
  storage: Storage = localStorage,
): void {
  validateGeometryStorageBudget(next.records);
  const text = JSON.stringify(next);
  if (new TextEncoder().encode(text).byteLength > 5_000_000)
    throw new Error("GIS storage budget exceeded");
  storage.setItem(publishedGisKey, text);
  try {
    storage.removeItem(legacyRecords);
    for (const version of Object.keys(next.scenarios))
      storage.removeItem(prefix + version);
  } catch {
    /* Canonical publication succeeded. */
  }
}
/** One atomic installation per source revision. Later edits/deletions are retained on reload. */
export function installPreparedRecords(source: PreparedGeometrySource, storage: Storage = localStorage): PublishedGis {
  const stored = readPublishedGis(storage);
  // Keep locally reviewed records when a prepared source leaves the active dataset.
  // Hide them without deleting edits; preserve installation history so deleted records stay deleted.
  const offered = new Set(preparedSources(source).map(item => item.id));
  const installed = new Set(stored.installedSources ?? []);
  let changed = false;
  const records = stored.records.map(record => {
    const properties = record.feature.properties, sourceId = String(properties.sourceDatasetId ?? '');
    const previousVisibility = properties.dearInactiveSourceVisibility;
    if (installed.has(sourceId) && !offered.has(sourceId) && typeof previousVisibility !== 'boolean') {
      changed = true;
      return {...record, visible:false, feature:{...record.feature, properties:{...properties, dearInactiveSourceVisibility:record.visible}}};
    }
    if (offered.has(sourceId) && typeof previousVisibility === 'boolean') {
      changed = true;
      const restored = {...properties};delete restored.dearInactiveSourceVisibility;
      return {...record, visible:previousVisibility, feature:{...record.feature, properties:restored}};
    }
    return record;
  });
  const current = changed ? {...stored,records} : stored;
  const pending = preparedSources(source).filter(item => !installed.has(item.id));
  if (!pending.length) { if (changed) writePublishedGis(current, storage); return current; }
  const ids = new Set(current.records.map(record => record.id));
  const additions = pending.flatMap(item => item.records).filter(record => {
    if (ids.has(record.id)) return false;
    ids.add(record.id); return true;
  });
  const next = {...current, records:[...current.records,...additions],
    installedSources:[...(current.installedSources ?? []),...pending.map(item => item.id)]};
  writePublishedGis(next, storage);
  return next;
}

/** Another tab (e.g. a resident submitting a report) may have written since `base` was
 * read. Keep its changes and apply only what this tab added, changed or removed. */
export function mergeRecords(
  stored: GeometryRecord[],
  base: GeometryRecord[],
  local: GeometryRecord[],
): GeometryRecord[] {
  const before = new Map(base.map((record) => [record.id, gisValueKey(record)]));
  const kept = new Set(local.map((record) => record.id));
  const out = stored.filter((record) => !(before.has(record.id) && !kept.has(record.id)));
  const index = new Map(out.map((record, i) => [record.id, i]));
  for (const record of local) {
    if (before.get(record.id) === gisValueKey(record)) continue;
    const at = index.get(record.id);
    if (at === undefined) out.push(record);
    else out[at] = record;
  }
  return out;
}
/** Returns what was stored, which includes other tabs' records when they changed meanwhile. */
export function writePublishedRecords(
  records: GeometryRecord[],
  base?: GeometryRecord[],
): GeometryRecord[] {
  const current = readPublishedGis();
  const next = base && gisValueKey(current.records) !== gisValueKey(base)
    ? mergeRecords(current.records, base, records)
    : records;
  writePublishedGis({ ...current, records: next });
  return next;
}
/** The edit log is append-only, so concurrent tabs merge by id without losing entries. */
export function writePublishedEdits(
  version: string,
  edits: ScenarioEdit[],
): ScenarioEdit[] {
  const current = readPublishedGis();
  const ids = new Set(edits.map((edit) => edit.id));
  const stored = (current.scenarios[version] ?? []).filter((edit) => !ids.has(edit.id));
  const next = stored.length
    ? [...edits, ...stored].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    : edits;
  writePublishedGis({
    ...current,
    scenarios: { ...current.scenarios, [version]: next },
  });
  return next;
}
export function publishGisDraft(
  version: string,
  baseRecords: GeometryRecord[],
  baseEdits: ScenarioEdit[],
  records: GeometryRecord[],
  edits: ScenarioEdit[],
  storage: Storage = localStorage,
): void {
  const current = readPublishedGis(storage);
  if (
    gisValueKey(current.records) !== gisValueKey(baseRecords) ||
    gisValueKey(current.scenarios[version] ?? []) !==
      gisValueKey(baseEdits)
  )
    throw new Error("GIS_CONFLICT");
  writePublishedGis(
    {
      ...current,
      records,
      scenarios: { ...current.scenarios, [version]: edits },
    },
    storage,
  );
}
