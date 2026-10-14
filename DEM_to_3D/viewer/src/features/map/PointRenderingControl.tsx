import type { Locale } from '../../types/dear';
import type { PointRenderingMode } from './pointRendering';
import { usePointRendering } from './usePointRendering';
import { pointRenderingVi } from './locales/pointRendering.vi';
import { pointRenderingEn } from './locales/pointRendering.en';
import './point-clusters.css';

export function PointRenderingControl({
  locale,
  disabled = false
}: {
  locale: Locale;
  disabled?: boolean;
}): JSX.Element {
  const messages = locale === 'vi' ? pointRenderingVi : pointRenderingEn;
  const { mode, setMode } = usePointRendering();
  return (
    <label className="point-rendering-control">
      <span>{messages.label}</span>
      <select
        aria-label={messages.label}
        value={mode}
        disabled={disabled}
        onChange={(event) => setMode(event.target.value as PointRenderingMode)}
      >
        <option value="group">{messages.grouped}</option>
        <option value="individual">{messages.individual}</option>
      </select>
    </label>
  );
}
