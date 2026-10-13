import { useSyncExternalStore } from 'react';
import {
  pointRenderingKey,
  pointRenderingMode,
  type PointRenderingMode
} from './pointRendering';

function readPreference(): PointRenderingMode {
  try {
    return typeof window === 'undefined'
      ? 'group'
      : pointRenderingMode(window.localStorage.getItem(pointRenderingKey));
  } catch {
    return 'group';
  }
}

let current = readPreference();
const listeners = new Set<() => void>();
const snapshot = () => current;
const serverSnapshot = (): PointRenderingMode => 'group';

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const storage = (event: StorageEvent) => {
    if (event.key !== pointRenderingKey && event.key !== null) return;
    current = event.key === null ? 'group' : pointRenderingMode(event.newValue);
    listener();
  };
  window.addEventListener('storage', storage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', storage);
  };
}

function setMode(mode: PointRenderingMode): void {
  current = mode;
  try {
    window.localStorage.setItem(pointRenderingKey, mode);
  } catch {
    // Map display still changes in this session when browser storage is unavailable.
  }
  for (const listener of listeners) listener();
}

/** One display preference for both the GIS workspace and response map; it never edits geometry. */
export function usePointRendering() {
  return {
    mode: useSyncExternalStore(subscribe, snapshot, serverSnapshot),
    setMode
  };
}
