import type { AdministrativeMetadata, AdministrativeUnit } from '../types/terrain';

const textKeys = ['commune_code', 'commune_name', 'province_code', 'province_name', 'headquarters', 'type'] as const;
const numberKeys = ['area_km2', 'population', 'density_per_km2'] as const;
const unitKeys = new Set<string>([...textKeys, ...numberKeys]);

export function validAdministrativeMetadata(value: unknown): value is AdministrativeMetadata {
  const unit = (raw: unknown, root = false): raw is AdministrativeUnit => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const record = raw as Record<string, unknown>;
    return Object.keys(record).every(key => unitKeys.has(key) || (root && (key === 'source' || key === 'units')))
      && textKeys.every(key => record[key] === undefined || typeof record[key] === 'string')
      && numberKeys.every(key => record[key] === undefined || (typeof record[key] === 'number' && Number.isFinite(record[key]) && record[key] >= 0));
  };
  if (!unit(value, true)) return false;
  const record = value as AdministrativeMetadata;
  return (record.source === undefined || typeof record.source === 'string')
    && (record.units === undefined || (Array.isArray(record.units) && record.units.length > 0 && record.units.every(item => unit(item))));
}
