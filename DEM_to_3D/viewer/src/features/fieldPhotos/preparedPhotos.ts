import { useEffect, useState } from 'react';
import type { ScenarioAsset } from '../../data/scenarioManifest';
import { verifiedAssetBytes } from '../../data/ScenarioRepository';

/** Prepared survey photos of a hazard. They document a later visit, not the incident snapshot. */
export type PreparedPhoto = {
  name: string; capturedAt: string; latitude: number; longitude: number;
  accuracyM: number | null; headingDeg: number | null; camera: string;
  image: ScenarioAsset & { width: number; height: number };
  thumb: ScenarioAsset & { width: number; height: number };
};
export type PreparedPhotoPoint = { id: string; hazardId: string; surveyName: string; photos: PreparedPhoto[] };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const fail = (field: string): never => { throw new Error(`Invalid field photo catalog: ${field}`); };
const finite = (value: unknown, field: string) => typeof value === 'number' && Number.isFinite(value) ? value : fail(field);
const text = (value: unknown, field: string) => typeof value === 'string' && value.trim() ? value : fail(field);

function file(value: unknown, base: string, field: string): PreparedPhoto['image'] {
  if (!isRecord(value)) return fail(field);
  const name = text(value.url, `${field}.url`);
  if (!/^[a-z0-9._-]+\.webp$/.test(name)) fail(`${field}.url`);
  const byteLength = finite(value.byteLength, `${field}.byteLength`), sha256 = text(value.sha256, `${field}.sha256`);
  if (!Number.isSafeInteger(byteLength) || byteLength <= 0 || !/^[0-9a-f]{64}$/.test(sha256)) fail(field);
  return { url: base + name, byteLength, sha256, width: finite(value.width, `${field}.width`), height: finite(value.height, `${field}.height`) };
}

export function validatePhotoCatalog(value: unknown, catalogUrl: string): PreparedPhotoPoint[] {
  const base = catalogUrl.slice(0, catalogUrl.lastIndexOf('/') + 1);
  if (!isRecord(value) || !Array.isArray(value.points)) return fail('points');
  return value.points.map((point, index) => {
    if (!isRecord(point) || !Array.isArray(point.photos) || !point.photos.length) return fail(`points.${index}`);
    return { id: text(point.id, `points.${index}.id`), hazardId: text(point.hazardId, `points.${index}.hazardId`), surveyName: text(point.surveyName, `points.${index}.surveyName`),
      photos: point.photos.map((photo, p): PreparedPhoto => {
        const field = `points.${index}.photos.${p}`;
        if (!isRecord(photo)) return fail(field);
        const capturedAt = text(photo.capturedAt, `${field}.capturedAt`);
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(capturedAt)) fail(`${field}.capturedAt`);
        const latitude = finite(photo.latitude, `${field}.latitude`), longitude = finite(photo.longitude, `${field}.longitude`);
        if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) fail(`${field}.position`);
        const optional = (key: string) => photo[key] === null ? null : finite(photo[key], `${field}.${key}`);
        return { name: text(photo.name, `${field}.name`), capturedAt, latitude, longitude, accuracyM: optional('accuracyM'), headingDeg: optional('headingDeg'),
          camera: typeof photo.camera === 'string' ? photo.camera : '', image: file(photo.image, base, `${field}.image`), thumb: file(photo.thumb, base, `${field}.thumb`) };
      }) };
  });
}

const objectUrls = new Map<string, Promise<string>>();
/** Checksummed bytes become one object URL per file for the session. */
export function photoUrl(asset: ScenarioAsset): Promise<string> {
  let url = objectUrls.get(asset.sha256);
  if (!url) {
    url = verifiedAssetBytes(asset).then(bytes => URL.createObjectURL(new Blob([bytes], { type: 'image/webp' })));
    url.catch(() => objectUrls.delete(asset.sha256));
    objectUrls.set(asset.sha256, url);
  }
  return url;
}

/** Photo points by incident hazard ID. A missing or invalid catalog leaves the hazards without photos. */
export function usePreparedPhotos(asset: ScenarioAsset | undefined): Map<string, PreparedPhotoPoint> {
  const [points, setPoints] = useState<Map<string, PreparedPhotoPoint>>(() => new Map());
  useEffect(() => {
    setPoints(new Map());
    if (!asset) return;
    const run = new AbortController();
    verifiedAssetBytes(asset, run.signal)
      .then(bytes => validatePhotoCatalog(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), asset.url))
      .then(list => setPoints(new Map(list.map(point => [point.hazardId, point]))), () => undefined);
    return () => run.abort();
  }, [asset?.url, asset?.sha256]);
  return points;
}

const compass = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'], compassEn = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const headingLabel = (degrees: number, locale: 'vi' | 'en') =>
  `${degrees}° ${(locale === 'en' ? compassEn : compass)[Math.round(degrees / 45) % 8]}`;
