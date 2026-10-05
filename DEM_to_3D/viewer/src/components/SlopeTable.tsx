import type { ExtremaPoint } from '../terrain/extrema';
import type { SegmentSlope } from '../terrain/slope';

export function SlopeTable({ slopes, extrema }: { slopes: SegmentSlope[]; extrema: ExtremaPoint[] }): JSX.Element {
  return (
    <section className="analysis-card" aria-label="Terrain slope analysis">
      <div className="profile-heading"><div><span className="eyebrow">Analysis</span><h2>Slope & extrema</h2></div><span className="profile-axis-label">{slopes.length} segments</span></div>
      {extrema.length === 0 ? <p className="muted">No extrema passed the prominence and distance thresholds.</p> : <div className="extrema-list">{extrema.map((item) => <div className="extrema-row" key={`${item.kind}-${item.index}`}><strong>{item.kind === 'peak' ? 'Peak' : 'Valley'}</strong><span>{item.distance.toFixed(1)} m</span><span>{item.elevation.toFixed(1)} m</span><small>in {item.approachSlope ? `${item.approachSlope.percent.toFixed(1)}%` : '—'} · out {item.departureSlope ? `${item.departureSlope.percent.toFixed(1)}%` : '—'}</small></div>)}</div>}
      <div className="slope-list">{slopes.slice(0, 12).map((slope) => <div className="slope-row" key={`${slope.fromIndex}-${slope.toIndex}`}><span>{slope.distance.toFixed(1)} m</span><span className={slope.percent >= 0 ? 'positive' : 'negative'}>{slope.percent.toFixed(1)}% ({slope.angle.toFixed(1)}°)</span></div>)}</div>
    </section>
  );
}
