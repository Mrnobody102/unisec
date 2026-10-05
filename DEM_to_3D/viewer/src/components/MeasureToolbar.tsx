import type { SurfaceProfile } from '../terrain/profile';

type Props = {
  measuring: boolean;
  hasProfile: boolean;
  profile: SurfaceProfile | null;
  onToggle: () => void;
  onClear: () => void;
};

export function MeasureToolbar({ measuring, hasProfile, profile, onToggle, onClear }: Props): JSX.Element {
  return (
    <div className="measure-toolbar" role="toolbar" aria-label="Profile measurement tools">
      <button type="button" className={measuring ? 'active' : ''} onClick={onToggle}>
        {measuring ? 'Cancel measure' : 'Measure profile'}
      </button>
      {hasProfile && <button type="button" onClick={onClear}>Clear</button>}
      {profile && <span className="measure-summary">{profile.length.toFixed(1)} m · azimuth {profile.azimuth.toFixed(1)}°</span>}
      {measuring && <span className="measure-help">Click two terrain points</span>}
    </div>
  );
}
