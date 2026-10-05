import type { ExtremaPoint } from '../terrain/extrema';
import type { SurfaceProfile } from '../terrain/profile';
import type { VertexProfilePoint } from '../terrain/vertex';
import { ElevationChart } from './ElevationChart';

type Props = {
  profile: SurfaceProfile;
  vertices?: VertexProfilePoint[];
  extrema?: ExtremaPoint[];
  smoothed?: Array<number | undefined>;
  onHoverDistance?: (distance: number | null) => void;
  compact?: boolean;
  locale?: 'vi' | 'en';
  selectedDistance?: number;
};

export function ProfileChart({ profile, vertices = [], extrema = [], smoothed = [], onHoverDistance, compact = false, locale = 'en', selectedDistance = 0 }: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const valid = profile.samples.filter((sample) => sample.elevation !== undefined);
  if (!valid.length) return <section className="profile-card"><p className="muted">{t('Chưa có dữ liệu độ cao cho mặt cắt này.', 'No elevation data for this section.')}</p></section>;
  if (compact) return <ElevationChart profile={profile} locale={locale} distance={selectedDistance} onSelect={onHoverDistance} />;
  const minElevation = Math.min(...valid.map((sample) => sample.elevation!));
  const maxElevation = Math.max(...valid.map((sample) => sample.elevation!));
  const elevationRange = Math.max(maxElevation - minElevation, 1);
  const width = 760;
  const height = 250;
  const x = (distance: number): number => profile.length === 0 ? 0 : distance / profile.length * width;
  const y = (elevation: number): number => height - (elevation - minElevation) / elevationRange * (height - 24) - 12;
  const path = profile.segments.map((segment) => segment.map((index, pointIndex) => `${pointIndex ? 'L' : 'M'}${x(profile.samples[index].distance).toFixed(2)},${y(profile.samples[index].elevation!).toFixed(2)}`).join(' ')).join(' ');
  // Gap-filled runs (nodata bridged by interpolation) render dashed so the
  // line stays connected while remaining visually distinguishable.
  const gapRuns: Array<Array<typeof profile.samples[number]>> = [];
  let gapRun: Array<typeof profile.samples[number]> = [];
  profile.samples.forEach((sample) => {
    if (sample.gapFilled && sample.elevation !== undefined) {
      gapRun.push(sample);
    } else if (gapRun.length) {
      gapRuns.push(gapRun);
      gapRun = [];
    }
  });
  if (gapRun.length) gapRuns.push(gapRun);
  const gapPaths = gapRuns.map((run) => run.map((sample, i) => `${i ? 'L' : 'M'}${x(sample.distance).toFixed(2)},${y(sample.elevation!).toFixed(2)}`).join(' '));
  const smoothedSegments: string[] = [];
  let smoothPath = '';
  profile.samples.forEach((sample, index) => {
    const value = smoothed[index];
    if (value === undefined) {
      if (smoothPath) smoothedSegments.push(smoothPath);
      smoothPath = '';
      return;
    }
    smoothPath += `${smoothPath ? 'L' : 'M'}${x(sample.distance).toFixed(2)},${y(value).toFixed(2)}`;
  });
  if (smoothPath) smoothedSegments.push(smoothPath);
  return (
    <section className="profile-card" aria-label={t('Mặt cắt địa hình', 'Terrain section')}>
      {!compact && <div className="profile-heading"><div><span className="eyebrow">Profile</span><h2>Surface elevation</h2></div><span className="profile-axis-label">distance (m) · elevation (m)</span></div>}
      <svg className="profile-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('Biểu đồ độ cao', 'Elevation chart')} onMouseLeave={() => onHoverDistance?.(null)}>
        <line x1="0" y1={height - 12} x2={width} y2={height - 12} className="chart-axis" />
        <path d={path} className="profile-line" fill="none" />
        {gapPaths.map((d, index) => <path key={index} d={d} className="profile-line profile-line-gap" fill="none" />)}
        {!compact && smoothedSegments.map((segment, index) => <path key={index} d={segment} className="smoothed-line" fill="none" />)}
        {!compact && vertices.map((vertex) => <circle key={vertex.id} cx={x(vertex.distance)} cy={y(vertex.elevation)} r="4" className="vertex-point" onMouseEnter={() => onHoverDistance?.(vertex.distance)} />)}
        {!compact && extrema.map((item) => <circle key={`${item.kind}-${item.index}`} cx={x(item.distance)} cy={y(item.elevation)} r="5" className={item.kind === 'peak' ? 'peak-point' : 'valley-point'} onMouseEnter={() => onHoverDistance?.(item.distance)} />)}
      </svg>
      {compact ? <div className="profile-chart-caption"><span>{t('Độ cao', 'Elevation')}: {Math.round(minElevation)}–{Math.round(maxElevation)} m</span><span>0–{(profile.length / 1000).toFixed(2)} km</span></div> : <div className="profile-legend"><span><i className="legend-swatch surface" />raw surface</span><span><i className="legend-swatch smoothed" />smoothed</span><span><i className="legend-swatch vertex" />vertices ({vertices.length})</span><span><i className="legend-swatch extrema" />extrema ({extrema.length})</span></div>}
    </section>
  );
}
