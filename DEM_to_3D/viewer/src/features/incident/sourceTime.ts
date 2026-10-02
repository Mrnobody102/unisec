import type { IncidentSource } from '../../types/dear';

export function sourceObservedAt(source: IncidentSource, updated: boolean): string {
  return updated ? source.observedAtUpdated ?? source.observedAt : source.observedAt;
}

export function localClock(iso: string): string {
  return iso.slice(11, 16);
}
