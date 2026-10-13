export type PointRenderingMode = 'group' | 'individual';
export const pointRenderingKey = 'dear.map.point-rendering.v1';

export function pointRenderingMode(value: unknown): PointRenderingMode {
  return value === 'individual' ? 'individual' : 'group';
}
