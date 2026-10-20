import type { GeometryRecord, VectorFeature } from '../../geo/vector/types';
import type { ScenarioAsset } from '../../data/scenarioManifest';
import { verifiedAssetBytes } from '../../data/ScenarioRepository';
import { parseKml } from '../geodata/parseKml';
import { restoreGeometryRecords } from '../geodata/geometrySession';
import { landslideAreaKey, newLandslideArea } from './landslideAreas';

export type FieldDataset = import('../geodata/publishedGis').PreparedGeometrySource;

/** Preserve survey geometry/Z and source names. Import time never becomes observation time. */
export function fieldRecords(features: VectorFeature[], id: string, sourceName: string, networkVersion: string, importedAt: string): GeometryRecord[] {
  let polygon = 0;
  return restoreGeometryRecords(features.map((feature, index) => {
    const originalName = String(feature.properties.name ?? '').trim();
    const properties = { ...feature.properties, sourceName: originalName, sourceDatasetId: id, sourceFeatureIndex: index + 1 };
    let name = originalName || `Điểm thực địa ${index + 1}`;
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      polygon++;
      if (!originalName || /^(Đa giác không có tiêu đề|Untitled polygon)$/i.test(originalName)) name = `Vết sạt ${String(polygon).padStart(2, '0')}`;
      const area = newLandslideArea('occurred', networkVersion);
      area.mappedAt = area.updatedAt = importedAt;
      area.sources = ['field'];
      area.basis = `Khoanh vẽ trong ${sourceName}. Ngày khảo sát và sai số ranh giới chưa được khai báo.`;
      // Talus is mapped accumulation; named scars identify a source/scar. Other parts remain unspecified.
      area.part = /^talus\b/i.test(originalName) ? 'deposit' : /^scar\b|^scar\d/i.test(originalName) ? 'source' : 'undifferentiated';
      Object.assign(properties, {[landslideAreaKey]: area});
    }
    return {id: `field:${id.slice(0, 16)}:${index + 1}`, name, role: 'reference', visible: true,
      source: {name: sourceName, format: 'KML', importedAt}, feature: {...feature, properties}};
  }));
}

export async function loadFieldDataset(asset: ScenarioAsset, networkVersion: string, signal: AbortSignal): Promise<FieldDataset> {
  const bytes = await verifiedAssetBytes(asset, signal);
  signal.throwIfAborted();
  const name = asset.url.split('/').at(-1)!;
  const xml = new DOMParser().parseFromString(new TextDecoder('utf-8', {fatal: true}).decode(bytes), 'application/xml');
  // Google Earth exports private tile-pyramid references with a transparent 1 px GIF.
  // These are not the raster bytes. Keep the original file; import only its actual vector data.
  for (const overlay of [...xml.getElementsByTagNameNS('*', 'GroundOverlay')]) {
    if (overlay.getElementsByTagNameNS('*', 'MapTilePyramid').length &&
        overlay.getElementsByTagNameNS('*', 'href')[0]?.textContent?.startsWith('data:image/gif;')) overlay.remove();
  }
  return {id: asset.sha256, records: fieldRecords(parseKml(new XMLSerializer().serializeToString(xml)), asset.sha256, name, networkVersion, new Date().toISOString())};
}
