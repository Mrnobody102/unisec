import { useEffect, useRef, useState } from 'react';
import type { SurfaceProfile } from '../terrain/profile';
import { nearestProfileSample, profileMetrics } from '../terrain/profileMetrics';

type Props = { profile: SurfaceProfile; locale: 'vi' | 'en'; distance: number; onSelect?: (distance: number | null) => void };

/** Axis labels retain screen size on narrow panels. Missing DEM stays blank. */
export function ElevationChart({ profile, locale, distance, onSelect }: Props): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(240, entries[0].contentRect.width)));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const metrics = profileMetrics(profile);
  const height = 190, left = 48, right = width - 18, top = 20, bottom = height - 30;
  const range = Math.max(20, (metrics.max ?? 0) - (metrics.min ?? 0));
  const padding = range * .08;
  const low = (metrics.min ?? 0) - padding;
  const high = Math.max(low + range, (metrics.max ?? 0) + padding);
  const magnitude = 10 ** Math.floor(Math.log10((high - low) / 4));
  const step = ([1, 2, 5, 10].find(factor => factor * magnitude >= (high - low) / 4) ?? 10) * magnitude;
  const elevationTicks: number[] = [];
  for (let elevation = Math.ceil(low / step) * step; elevation <= high; elevation += step) elevationTicks.push(elevation);
  const x = (d: number) => left + (profile.length ? d / profile.length : 0) * (right - left);
  const y = (e: number) => bottom - (e - low) / (high - low) * (bottom - top);
  const paths = profile.segments.filter(segment => segment.length >= 2).map(segment => {
    const line = segment.map((i, j) => `${j ? 'L' : 'M'}${x(profile.samples[i].distance)},${y(profile.samples[i].elevation!)}`).join(' ');
    const first = profile.samples[segment[0]], last = profile.samples[segment[segment.length - 1]];
    return { line, fill: `${line} L${x(last.distance)},${bottom} L${x(first.distance)},${bottom} Z` };
  });
  const current = nearestProfileSample(profile, distance);
  const tickCount = width < 400 ? 2 : 4;
  return <div ref={host} className="elevation-chart">
    <svg className="profile-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={locale === 'vi' ? 'Độ cao theo khoảng cách dọc tuyến' : 'Elevation by distance along route'}
      onPointerMove={event => {
        const matrix = event.currentTarget.getScreenCTM();
        if (!matrix) return;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) onSelect?.((point.x - left) / (right - left) * profile.length);
      }}>
      <text x={left - 10} y={12} textAnchor="end" className="chart-tick">m</text>
      {elevationTicks.map(elevation => <g key={elevation}><line x1={left} y1={y(elevation)} x2={right} y2={y(elevation)} className="chart-grid" /><text x={left - 8} y={y(elevation) + 4} textAnchor="end" className="chart-tick">{Math.round(elevation)}</text></g>)}
      {Array.from({ length: tickCount + 1 }, (_, i) => {
        const d = profile.length * i / tickCount;
        return <g key={i}><line x1={x(d)} y1={top} x2={x(d)} y2={bottom} className="chart-grid" /><text x={x(d)} y={height - 10} textAnchor={i === tickCount ? 'end' : i === 0 ? 'start' : 'middle'} className="chart-tick">{(d / 1000).toFixed(1)}{i === tickCount ? ' km' : ''}</text></g>;
      })}
      {paths.map((path, i) => <g key={i}><path d={path.fill} className="profile-area" /><path d={path.line} className="profile-line" fill="none" /></g>)}
      <line x1={x(current.distance)} y1={top} x2={x(current.distance)} y2={bottom} className="profile-crosshair" />
      {current.elevation !== undefined && <circle cx={x(current.distance)} cy={y(current.elevation)} r={4} className="profile-cursor" />}
    </svg>
  </div>;
}
