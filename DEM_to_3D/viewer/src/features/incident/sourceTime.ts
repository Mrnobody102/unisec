import type { IncidentSource } from '../../types/dear';

export function sourceObservedAt(source: IncidentSource, updated: boolean): string {
  return updated ? source.observedAtUpdated ?? source.observedAt : source.observedAt;
}

export function localClock(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(new Date(iso));
}

export function observationTime(iso: string, locale: 'vi' | 'en'): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(new Date(iso));
}
