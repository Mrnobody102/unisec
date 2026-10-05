/** Bottom to top. Road status always takes precedence over route selection. */
export const mapLayerOrder = {
  imagery: 1,
  boundary: 2,
  roads: 3,
  route: 4,
  roadStatus: 5,
  selection: 6,
  tools: 7,
} as const;

export type MapPane = keyof typeof mapLayerOrder;
export const mapPane = (name: MapPane) => `dear-${name}`;
