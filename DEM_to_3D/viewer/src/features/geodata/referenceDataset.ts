import type { ScenarioAsset } from '../../data/scenarioManifest';
import { verifiedAssetBytes } from '../../data/ScenarioRepository';
import { parseSpatialInput } from './parseSpatialInput';
import { restoreGeometryRecords } from './geometrySession';
import type { VectorFeature } from '../../geo/vector/types';
import type { PreparedGeometrySource } from './publishedGis';

/** Reference polygons are imagery footprints, never automatically landslide extents.
 * Source road geometry is deliberately kept outside the simulated incident graph.
 */
export function referenceRecords(features: VectorFeature[], id: string, importedAt: string) {
  return restoreGeometryRecords(features.map((feature, index) => ({
    id:`reference:${id.slice(0,16)}:${feature.id ?? index+1}`,
    name:String(feature.properties.name ?? feature.id ?? index+1),
    role:feature.properties.referenceKind === 'imagery-aoi' ? 'footprint' : 'reference',
    // Off by default: the corridor is the scenario road geometry, places duplicate communities,
    // and the imagery request is answered by the prepared scenes. All stay listed in GIS.
    visible:false,
    source:{name:String(feature.properties.sourceName ?? 'Reference data'),format:'GeoJSON',importedAt},
    feature:{...feature,properties:{...feature.properties,sourceDatasetId:id}}
  })));
}

export async function loadReferenceDataset(asset: ScenarioAsset, signal: AbortSignal): Promise<PreparedGeometrySource> {
  const bytes = await verifiedAssetBytes(asset,signal);
  signal.throwIfAborted();
  const parsed = parseSpatialInput(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  return {id:asset.sha256,records:referenceRecords(parsed.features,asset.sha256,new Date().toISOString())};
}
