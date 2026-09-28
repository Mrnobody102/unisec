import type { HoverInfo } from '../types/terrain';

export function HoverInfoPanel({ info }: { info: HoverInfo | null }): JSX.Element {
  if (!info) return <aside className="hover-info muted">Move the pointer over the terrain</aside>;
  return (
    <aside className="hover-info" aria-live="polite">
      <div className="hover-title">Surface point</div>
      <dl>
        <dt>Projected X</dt><dd>{info.projected.x.toFixed(2)} m</dd>
        <dt>Projected Y</dt><dd>{info.projected.y.toFixed(2)} m</dd>
        {info.longitude !== undefined && <><dt>Longitude</dt><dd>{info.longitude.toFixed(6)}°</dd></>}
        {info.latitude !== undefined && <><dt>Latitude</dt><dd>{info.latitude.toFixed(6)}°</dd></>}
        <dt>Elevation</dt><dd>{info.elevation.toFixed(2)} m</dd>
        <dt>Pixel</dt><dd>row {info.row}, col {info.column}</dd>
        <dt>Sampling</dt><dd>{info.interpolated ? 'bilinear grid' : 'nearest / mesh fallback'}</dd>
      </dl>
    </aside>
  );
}
