import { useEffect, useState } from 'react';
export type ScenarioRevision = { applied: boolean; at: string | null };
const initial: ScenarioRevision = { applied: false, at: null };
const changeEvent = 'dear:scenario-revision';
export function readScenarioRevision(value: string | null): ScenarioRevision {
  try {
    const parsed: unknown = JSON.parse(value ?? 'null');
    if (parsed && typeof parsed === 'object' && 'applied' in parsed && typeof parsed.applied === 'boolean' &&
      'at' in parsed && (parsed.at === null || typeof parsed.at === 'string' && Number.isFinite(Date.parse(parsed.at)))) {
      return { applied: parsed.applied, at: parsed.at };
    }
  } catch { /* Invalid storage is not a valid scenario update. */ }
  return initial;
}
export function useScenarioRevision(datasetVersion: string) {
  const key = 'dear.scenario-revision.v1:' + datasetVersion;
  const [stored, setStored] = useState(() => {
    try { return { key, revision: readScenarioRevision(localStorage.getItem(key)) }; }
    catch { return { key, revision: initial }; }
  });
  const revision = stored.key === key ? stored.revision : initial;
  useEffect(() => {
    const refresh = () => {
      try { setStored({ key, revision: readScenarioRevision(localStorage.getItem(key)) }); }
      catch { setStored({ key, revision: initial }); }
    };
    const storage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === key || event.key === null)) refresh();
    };
    const sameTab = (event: Event) => { if ((event as CustomEvent<string>).detail === key) refresh(); };
    refresh();
    window.addEventListener('storage', storage);
    window.addEventListener(changeEvent, sameTab);
    return () => { window.removeEventListener('storage', storage); window.removeEventListener(changeEvent, sameTab); };
  }, [key]);
  const change = (applied: boolean) => {
    const next = { applied, at: applied ? (revision.at ?? new Date().toISOString()) : null };
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(changeEvent, { detail: key }));
    } catch { /* The current demo session remains usable. */ }
    setStored({ key, revision: next });
  };
  return { revision, change };
}
