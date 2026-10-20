import { describe, expect, it, vi } from 'vitest';
import { GEOMETRY_LIMITS as limits, textBytes } from '../../geo/vector/limits';
import { validateGeometryBudget } from '../../geo/vector/geometryBudget';
import { type VectorGeometry } from '../../geo/vector/types';
import { parseSpatialInput } from './parseSpatialInput';
import { addGeometryRecords, createGeometryRecords, restoreGeometryRecords } from './geometrySession';
import { importGeometryFiles } from './importGeometryFiles';

const points = (count: number) => Array.from({ length: count }, () => 'POINT(104 21)').join('\n');
const records = (count: number) => createGeometryRecords(parseSpatialInput(points(count)), 'survey.wkt', 'reference');

describe('GIS import budgets and persistence', () => {
  it('imports and restores 1,000 records with names, geometry and reference roles intact', () => {
    const imported = records(limits.features);
    const merged = addGeometryRecords([], imported);
    expect(restoreGeometryRecords(JSON.parse(JSON.stringify(merged)))).toEqual(imported);
    expect(merged.every(record => record.role === 'reference')).toBe(true);
    expect(() => addGeometryRecords(merged, records(1))).toThrow('feature-limit');
    expect(merged).toHaveLength(limits.features);
  });
  it('counts flattened GeoJSON features across nested collections', () => {
    const geometry = { type: 'Point', coordinates: [104, 21] };
    const collection = { type: 'GeometryCollection', geometries: Array(501).fill(geometry) };
    expect(() => parseSpatialInput(JSON.stringify({ type: 'GeometryCollection', geometries: [collection, collection] }))).toThrow('feature-limit');
  });
  it('checks total vertices before topology and retains a per-feature bound', () => {
    const line: VectorGeometry = { type: 'LineString', coordinates: Array.from({ length: limits.verticesPerFeature }, (_, i) => [104 + i / 100_000, 21]) };
    const count=Math.floor(limits.verticesPerWorkspace/limits.verticesPerFeature);
    expect(() => validateGeometryBudget(Array(count).fill(line))).not.toThrow();
    expect(() => validateGeometryBudget(Array(count+1).fill(line))).toThrow('vertex-limit');
    expect(() => validateGeometryBudget([{ ...line, coordinates: [...line.coordinates, [105, 21]] }])).toThrow('vertex-limit');
  });
  it('measures UTF-8 bytes and rejects oversized saved attributes without changing previous records', () => {
    expect(textBytes('đất')).toBe(6);
    const before = records(1), addition = records(1);
    addition[0].feature.properties.note = 'x'.repeat(limits.storageBytes);
    expect(() => addGeometryRecords(before, addition)).toThrow('workspace-limit');
    expect(before).toHaveLength(1);
    expect(() => parseSpatialInput('đ'.repeat(limits.inputBytes / 2 + 1))).toThrow('file-limit');
  });
  it('rejects repeated large metadata before constructing an oversized workspace snapshot', () => {
    const batch = records(limits.features);
    const note = 'survey description '.repeat(10_000);
    batch.forEach(record => { record.feature.properties.description = note; });
    expect(() => addGeometryRecords([], batch)).toThrow('workspace-limit');
  });
  it('rejects malformed stored geometry with a controlled error', () => {
    for (const geometry of [null, { type: 'Polygon', coordinates: null }, { type: 'Unknown' }]) {
      expect(() => restoreGeometryRecords([{ ...records(1)[0], feature: { geometry, properties: {} } }])).toThrow();
    }
  });
});

describe('Batch file import', () => {
  it('reads files above the old 2 MB threshold and preserves the source name', async () => {
    const input = JSON.stringify({ type: 'Feature', properties: { note: 'x'.repeat(2_000_000) }, geometry: { type: 'Point', coordinates: [104, 21] } });
    const imported = await importGeometryFiles([new File([input], 'survey.geojson')], 'auto');
    expect(imported).toHaveLength(1);
    expect(imported[0].source.name).toBe('survey.geojson');
    expect(imported[0].role).toBe('reference');
  });
  it('rejects oversized batches before reading any file', async () => {
    const read = vi.fn();
    const fake = (size: number): File => ({ size, name: 'large.kml', arrayBuffer: read }) as unknown as File;
    await expect(importGeometryFiles(Array(limits.filesPerBatch + 1).fill(fake(1)), 'auto')).rejects.toMatchObject({ code: 'batch-files' });
    await expect(importGeometryFiles(Array(5).fill(fake(limits.inputBytes)), 'auto')).rejects.toMatchObject({ code: 'batch-bytes' });
    await expect(importGeometryFiles([fake(limits.inputBytes + 1)], 'auto')).rejects.toMatchObject({ code: 'file-limit', detail: 'large.kml' });
    expect(read).not.toHaveBeenCalled();
  });
  it('rejects malformed UTF-8 and identifies the file', async () => {
    await expect(importGeometryFiles([new File([new Uint8Array([0xc3, 0x28])], 'bad.wkt')], 'auto')).rejects.toMatchObject({ code: 'file', detail: 'bad.wkt' });
  });
  it('rejects a failing batch and aggregate feature overflow before returning additions', async () => {
    const good = new File(['POINT(104 21)'], 'good.wkt');
    await expect(importGeometryFiles([good, new File(['invalid'], 'bad.wkt')], 'auto')).rejects.toMatchObject({ code: 'wkt', detail: 'bad.wkt' });
    await expect(importGeometryFiles([new File([points(600)], 'first.wkt'), new File([points(401)], 'second.wkt')], 'auto')).rejects.toMatchObject({ code: 'feature-limit', detail: 'second.wkt' });
  });
});

describe('Pasted survey coordinates', () => {
  it('reads the three DMS points from the reported survey, preserving longitude first', () => {
    const input = `21°45'26.80"N 104°02'48.44"E
21°45'48.01"N 104°02'43.99"E
21°47'01.34"N 104°02'39.83"E`;
    const parsed = parseSpatialInput(input);
    expect(parsed.format).toBe('coordinate');
    expect(parsed.features).toHaveLength(3);
    const point = parsed.features[0].geometry;
    expect(point.type).toBe('Point');
    if (point.type !== 'Point') throw new Error('Expected point');
    expect(point.coordinates[0]).toBeCloseTo(104 + 2 / 60 + 48.44 / 3600, 10);
    expect(point.coordinates[1]).toBeCloseTo(21 + 45 / 60 + 26.80 / 3600, 10);
  });
  it('supports prime marks, decimal minutes and either axis order', () => {
    expect(parseSpatialInput('104°02′48.44″E 21°45′26.80″S').features).toHaveLength(1);
    expect(parseSpatialInput("21°45.5'N 104°02.5'E").features).toHaveLength(1);
  });
  it('rejects an invalid line instead of partially importing the coordinate batch', () => {
    for (const input of ['21 N 22 N', '-21 N 104 E', '21°60\'00"N 104 E', '21.5°45\'N 104 E', '21 N 104 E garbage', '21 N 104 E\ninvalid']) {
      expect(() => parseSpatialInput(input)).toThrow();
    }
  });
});
