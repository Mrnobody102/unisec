/** WGS84 decimal degrees. Plain pairs follow the familiar latitude, longitude order.
 * WKT POINT uses the GIS x y convention (longitude latitude). */
export type CoordinatePair = { latitude: number; longitude: number };

const decimal = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
const pairPattern = new RegExp(`^\\s*(${decimal})\\s*[,;\\s]\\s*(${decimal})\\s*$`);
const wktPattern = new RegExp(`^\\s*POINT\\s*\\(\\s*(${decimal})\\s+(${decimal})\\s*\\)\\s*$`, 'i');

export function parseCoordinatePair(text: string): CoordinatePair | null {
  const normalized = text.trim().replace(/°/g, '');
  const wkt = wktPattern.exec(normalized);
  const pair = wkt ? null : pairPattern.exec(normalized);
  if (!wkt && !pair) return null;
  const latitude = Number(wkt ? wkt[2] : pair![1]);
  const longitude = Number(wkt ? wkt[1] : pair![2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    Math.abs(latitude) > 85.05112878 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}
