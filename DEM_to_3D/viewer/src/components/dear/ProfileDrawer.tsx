import React, { useState } from 'react';
import type { Locale, ScenarioRoute } from '../../types/dear';
import { ProfileChart } from '../ProfileChart';
import type { ExtremaPoint } from '../../terrain/extrema';
import type { SurfaceProfile } from '../../terrain/profile';
import type { SegmentSlope } from '../../terrain/slope';
import type { VertexProfilePoint } from '../../terrain/vertex';

type Props = {
  locale: Locale;
  route: ScenarioRoute;
  profile: SurfaceProfile | null;
  vertices: VertexProfilePoint[];
  extrema: ExtremaPoint[];
  smoothed: Array<number | undefined>;
  segmentSlopes: SegmentSlope[];
  onHoverDistance: (distance: number | null) => void;
  onClose: () => void;
};

export const ProfileDrawer: React.FC<Props> = ({
  locale,
  route,
  profile,
  vertices,
  extrema,
  smoothed,
  segmentSlopes,
  onHoverDistance,
  onClose
}) => {
  const [sliderDist, setSliderDist] = useState(0);

  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  if (!profile) return null;

  const currentSample = profile.samples.reduce((nearest, cand) => {
    return Math.abs(cand.distance - sliderDist) < Math.abs(nearest.distance - sliderDist) ? cand : nearest;
  }, profile.samples[0]);

  return (
    <div className="profile-panel">
      <div className="profile-heading">
        <div>
          <strong style={{ fontSize: '13.5px' }}>
            {t('Mặt cắt địa hình trích xuất từ DEM', 'Terrain profile extracted from DEM')}
          </strong>
          <span className="small" style={{ marginLeft: '10px' }}>
            {t(route.name[0], route.name[1])} · {route.lengthKm} km
          </span>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={t('Đóng mặt cắt', 'Close profile')}
          style={{ width: '28px', height: '28px' }}
        >
          ×
        </button>
      </div>

      <div className="profile-body">
        <div className="profile-chart-container">
          <ProfileChart
            profile={profile}
            vertices={vertices}
            extrema={extrema}
            smoothed={smoothed}
            onHoverDistance={onHoverDistance}
          />
        </div>

        <div className="profile-controls">
          <div>
            <label htmlFor="profile-dist-slider" style={{ fontWeight: 600, color: 'var(--ws-muted)' }}>
              {t('Vị trí dọc tuyến', 'Position along route')}
            </label>
            <input
              id="profile-dist-slider"
              type="range"
              min={0}
              max={profile.length}
              step={20}
              value={sliderDist}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSliderDist(val);
                onHoverDistance(val);
              }}
              style={{ width: '100%', marginTop: '4px' }}
            />
            <div style={{ marginTop: '4px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {(sliderDist / 1000).toFixed(2)} km ·{' '}
              {currentSample?.elevation !== undefined ? `${Math.round(currentSample.elevation)} m` : 'N/A'}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--ws-line)', paddingTop: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--ws-muted)', display: 'block', marginBottom: '4px' }}>
              {t('Độ dốc dọc tuyến', 'Notable slopes')}
            </span>
            <div style={{ maxHeight: '85px', overflowY: 'auto', fontSize: '11px', scrollbarWidth: 'thin' }}>
              {segmentSlopes.slice(0, 4).map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '2px 0',
                    color: Math.abs(s.percent) > 12 ? 'var(--critical-ink)' : 'inherit'
                  }}
                >
                  <span>Mẫu {s.fromIndex}–{s.toIndex}</span>
                  <strong>{s.percent > 0 ? `+${s.percent.toFixed(1)}%` : `${s.percent.toFixed(1)}%`}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
