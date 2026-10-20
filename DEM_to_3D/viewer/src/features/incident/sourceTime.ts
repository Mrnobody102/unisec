import type { IncidentSource } from '../../types/dear';

export function sourceObservedAt(source: IncidentSource, updated: boolean): string {
  return updated ? source.observedAtUpdated ?? source.observedAt : source.observedAt;
}

export function localClock(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(new Date(iso));
}

/** Date first, then clock, in both languages: "30/09/2026, 00:10" (UTC+7). */
export function observationTime(iso: string, _locale: 'vi' | 'en'): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hourCycle: 'h23'
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')}, ${part('hour')}:${part('minute')}`;
}
