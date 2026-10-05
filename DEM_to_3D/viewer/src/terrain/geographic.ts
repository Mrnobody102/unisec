import type { LoadedModel, TerrainMetadata } from '../types/terrain';
import { TerrainAssetError } from './validation';

export type GeographicPlacement = {
  position: { x: number; y: number; z: number };
  scaleY: number;
};

const metreUnits = new Set(['m', 'metre', 'meter', 'metres', 'meters']);

function requireMetadata(model: Pick<LoadedModel, 'name' | 'metadata'>): TerrainMetadata {
  if (!model.metadata) {
    throw new TerrainAssetError(`Model ${model.name} is missing .terrain.json metadata for geographic merge`);
  }
  return model.metadata;
}

function validateReferenceMetadata(metadata: TerrainMetadata, modelName: string): void {
  if (!metadata.analysis_supported) {
    throw new TerrainAssetError(`Model ${modelName} is visual-only; geographic merge requires projected CRS metadata`);
  }
  if (!metreUnits.has(metadata.crs.linear_unit.toLowerCase())) {
    throw new TerrainAssetError(`Model ${modelName} must use metre CRS units for geographic merge`);
  }
  if (metadata.scene_axes.x !== 'east' || metadata.scene_axes.y !== 'up' || metadata.scene_axes.z !== 'negative_north') {
    throw new TerrainAssetError(`Model ${modelName} has unsupported scene axes for geographic merge`);
  }
}

function assertSameCrs(reference: TerrainMetadata, candidate: TerrainMetadata, modelName: string): void {
  const referenceAuthority = reference.crs.authority.toUpperCase();
  const candidateAuthority = candidate.crs.authority.toUpperCase();
  if (referenceAuthority !== candidateAuthority || reference.crs.code !== candidate.crs.code) {
    throw new TerrainAssetError(`Model ${modelName} CRS ${candidate.crs.authority}:${candidate.crs.code} does not match reference CRS ${reference.crs.authority}:${reference.crs.code}`);
  }
}

/** Convert exporter-local GLB coordinates into the first model's local scene. */
export function createGeographicPlacements(models: readonly Pick<LoadedModel, 'name' | 'metadata'>[], referenceIndex = 0): GeographicPlacement[] {
  if (models.length === 0) return [];
  if (!Number.isInteger(referenceIndex) || referenceIndex < 0 || referenceIndex >= models.length) {
    throw new TerrainAssetError(`Geographic merge reference index ${referenceIndex} is invalid`);
  }

  const reference = requireMetadata(models[referenceIndex]);
  validateReferenceMetadata(reference, models[referenceIndex].name);

  return models.map((model) => {
    const metadata = requireMetadata(model);
    validateReferenceMetadata(metadata, model.name);
    assertSameCrs(reference, metadata, model.name);
    return {
      position: {
        x: metadata.world_origin.x - reference.world_origin.x,
        y: (metadata.elevation.base_elevation - reference.elevation.base_elevation) * reference.elevation.exaggeration,
        z: reference.world_origin.y - metadata.world_origin.y,
      },
      scaleY: reference.elevation.exaggeration / metadata.elevation.exaggeration,
    };
  });
}
