import { useMemo } from 'react';
import type { LoadedModel, TerrainData } from '../../types/terrain';
import type { ScenarioRoute } from '../../types/dear';
import { selectAnalysisTerrain } from '../../terrain/analysisTerrain';
import { createRouteProfile } from '../../terrain/profile';
import { projectedToScene } from '../../terrain/coordinate';

export function useRouteTerrainAnalysis(
  models: Array<LoadedModel | TerrainData>,
  activeRoute: Pick<ScenarioRoute, 'id' | 'points'> | null,
  focusDistance: number | null
) {
  const analysisTerrain = useMemo(() => selectAnalysisTerrain(models), [models]);

  const routeProfile = useMemo(() => {
    if (!analysisTerrain || !activeRoute || activeRoute.points.length < 2) return null;
    const gridOrTiles = analysisTerrain.tiles.length > 1 ? analysisTerrain.tiles : analysisTerrain.grid;
    const affine = analysisTerrain.metadata.grid_transform;
    const sampleInterval = Math.max(Math.hypot(affine.a, affine.d), Math.hypot(affine.b, affine.e));
    return createRouteProfile(
      gridOrTiles,
      analysisTerrain.metadata,
      activeRoute.points,
      sampleInterval
    );
  }, [analysisTerrain, activeRoute]);
  const focusPoint = useMemo(() => {
    if (!routeProfile?.samples.length || focusDistance === null || !analysisTerrain) return null;
    const sample = routeProfile.samples.reduce((nearest, candidate) =>
      Math.abs(candidate.distance - focusDistance) < Math.abs(nearest.distance - focusDistance)
        ? candidate : nearest
    );
    if (sample.elevation === undefined) return null;
    return projectedToScene(analysisTerrain.metadata, sample.projected, sample.elevation);
  }, [analysisTerrain, focusDistance, routeProfile]);

  return { analysisTerrain, routeProfile, focusPoint };
}
