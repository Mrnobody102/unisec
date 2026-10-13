import type { GeometryRecord } from '../../geo/vector/types';
import type { FieldPhoto, FieldObservation } from './model';
import type { Locale } from '../../types/dear';

export type CaptureTime = { local: string; instant: string; source: string };
/** Keep EXIF wall time separate from an instant when the camera did not record an offset. */
export function captureTime(
  value: unknown,
  offset: unknown = '',
  source = ''
): CaptureTime | null {
  if (typeof value !== 'string') return null;
  const match =
    /^(\d{4})[:-](\d{2})[:-](\d{2})[T ](\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/.exec(
      value.trim()
    );
  if (!match) return null;
  const [, y, m, d, h, min, sec, fraction = '', embedded] = match;
  const local = `${y}-${m}-${d}T${h}:${min}:${sec}${fraction}`;
  const wall = new Date(local + 'Z');
  if (
    !Number.isFinite(wall.getTime()) ||
    wall.toISOString().slice(0, 19) !== local.slice(0, 19)
  )
    return null;
  const zone = embedded || (typeof offset === 'string' ? offset.trim() : '');
  if (zone && !/^(Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(zone)) return null;
  if (
    zone &&
    Math.abs(Number(zone.slice(1, 3))) === 14 &&
    zone.slice(4) !== '00'
  )
    return null;
  const instant = zone ? new Date(local + zone).toISOString() : '';
  return { local, instant, source };
}
export function photoCaptureTime(photo: FieldPhoto): CaptureTime | null {
  return captureTime(
    photo.exif.DateTimeOriginal,
    photo.exif.OffsetTimeOriginal,
    photo.name
  );
}
export function recordCaptureTime(record: GeometryRecord): CaptureTime | null {
  for (const key of [
    'observedAt',
    'observed_at',
    'timestamp',
    'date',
    'DateTimeOriginal'
  ]) {
    const result = captureTime(
      record.feature.properties[key],
      record.feature.properties.OffsetTimeOriginal,
      key
    );
    if (result) return result;
  }
  return null;
}
export function deviceLocal(instant: string): string {
  const date = new Date(instant);
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  ).toISOString();
  return local.slice(0, date.getMilliseconds() ? 23 : 19);
}
export function observationTimeLabel(
  value: FieldObservation,
  locale: Locale
): string {
  if (value.observedAt)
    return new Date(value.observedAt).toLocaleString(
      locale === 'vi' ? 'vi-VN' : 'en-GB'
    );
  if (value.observedLocalTime)
    return new Date(value.observedLocalTime + 'Z').toLocaleString(
      locale === 'vi' ? 'vi-VN' : 'en-GB',
      { timeZone: 'UTC' }
    );
  return locale === 'vi' ? 'Chưa ghi nhận' : 'Not recorded';
}

/** Display the camera wall time with its recorded offset, without substituting the device zone. */
export function photoCaptureLabel(photo: FieldPhoto, locale: Locale): string {
  const capture = photoCaptureTime(photo);
  if (!capture) return String(photo.exif.DateTimeOriginal ?? '');
  const wall = new Date(capture.local + 'Z').toLocaleString(
    locale === 'vi' ? 'vi-VN' : 'en-GB',
    { timeZone: 'UTC' }
  );
  const offset =
    String(photo.exif.DateTimeOriginal).match(/(Z|[+-]\d{2}:\d{2})$/)?.[1] ||
    photo.exif.OffsetTimeOriginal ||
    'UTC';
  return (
    wall + (capture.instant ? ' ' + (offset === 'Z' ? 'UTC' : offset) : '')
  );
}
