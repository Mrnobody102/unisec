import type { ScenarioTarget } from './scenarioOverlay';

/** Exactly one detail surface can own the GIS workspace at a time. */
export type GeometryMapDetail =
  | { kind: 'group'; ids: string[] }
  | {
      kind: 'scenario';
      target: ScenarioTarget;
      moving: boolean;
      pending: { x: number; y: number } | null;
    };

export type GeometryDetail =
  | { kind: 'feature' }
  | { kind: 'scene'; id: string }
  | GeometryMapDetail
  | null;
