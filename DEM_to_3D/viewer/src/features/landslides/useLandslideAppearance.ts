import { useSyncExternalStore } from 'react';
import { defaultLandslideFillOpacity, landslideFillOpacity, landslideFillOpacityKey } from './landslideAppearance';

function read(): number {
  try {
    const stored = localStorage.getItem(landslideFillOpacityKey);
    return stored === null ? defaultLandslideFillOpacity : landslideFillOpacity(Number(stored));
  } catch { return defaultLandslideFillOpacity; }
}
let current = read();
const listeners = new Set<() => void>();
const snapshot = () => current;
const serverSnapshot = () => defaultLandslideFillOpacity;
function subscribe(listener: () => void) {
  listeners.add(listener);
  const storage = (event: StorageEvent) => {
    if (event.key !== landslideFillOpacityKey && event.key !== null) return;
    current = read();
    listener();
  };
  window.addEventListener('storage', storage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', storage); };
}
function setFillOpacity(value: number) {
  current = landslideFillOpacity(value);
  try { localStorage.setItem(landslideFillOpacityKey, String(current)); } catch { /* Keep the session preference. */ }
  listeners.forEach(listener => listener());
}
/** One display preference across resident, response, GIS and terrain views. */
export function useLandslideAppearance() {
  return { fillOpacity: useSyncExternalStore(subscribe, snapshot, serverSnapshot), setFillOpacity };
}
