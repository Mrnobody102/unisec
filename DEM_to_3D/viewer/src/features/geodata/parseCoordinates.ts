import { GEOMETRY_LIMITS } from '../../geo/vector/limits';
import { GeometryError, type VectorFeature } from '../../geo/vector/types';

// Direction letters make axis order explicit; bare number pairs remain deliberately unsupported.
const axis =
  /([+-]?(?:\d+\.?\d*|\.\d+))\s*[°º]?\s*(?:(\d+(?:\.\d+)?)\s*['′’]\s*(?:(\d+(?:\.\d+)?)\s*["″”]\s*)?)?([NSEW])/gi;
export function parseCoordinates(text: string): VectorFeature[] | null {
  if (!/^[+\-\d.]/.test(text) || !/[NSEW]/i.test(text)) return null;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > GEOMETRY_LIMITS.features) throw new GeometryError('feature-limit');
  return lines.map((line, index) => {
    const parts = [...line.matchAll(axis)];
    if (
      parts.length !== 2 ||
      line.slice(0, parts[0].index).trim() ||
      !/^[\s,;]*$/.test(line.slice(parts[0].index! + parts[0][0].length, parts[1].index)) ||
      line.slice(parts[1].index! + parts[1][0].length).trim()
    )
      throw new GeometryError('coordinates', `Dòng ${index + 1}`);
    const values = new Map<string, number>();
    for (const part of parts) {
      const degrees = Number(part[1]),
        minutes = Number(part[2] ?? 0),
        seconds = Number(part[3] ?? 0);
      if (degrees < 0 || minutes >= 60 || seconds >= 60 || (part[2] && !Number.isInteger(degrees)))
        throw new GeometryError('coordinates', `Dòng ${index + 1}`);
      const direction = part[4].toUpperCase();
      const key = /[NS]/.test(direction) ? 'lat' : 'lon';
      if (values.has(key)) throw new GeometryError('coordinates', `Dòng ${index + 1}`);
      values.set(
        key,
        (degrees + minutes / 60 + seconds / 3600) * (/[SW]/.test(direction) ? -1 : 1),
      );
    }
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [values.get('lon')!, values.get('lat')!] },
      properties: {},
    };
  });
}
