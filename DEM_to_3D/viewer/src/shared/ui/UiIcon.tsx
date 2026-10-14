import { createElement } from 'react';
import {
  carbonIcons,
  type CarbonIcon,
  type CarbonIconSize
} from './carbonIconData';

/** Official IBM Carbon artwork; license and release provenance: vendor/carbon/. */
export type UiIconName = keyof typeof carbonIcons;

export function UiIcon({
  name,
  size = 20
}: {
  name: UiIconName;
  size?: number;
}): JSX.Element {
  if (name === 'route') return <RouteIcon size={size} />;
  const artworkSize: CarbonIconSize =
    size <= 16 ? 16 : size <= 20 ? 20 : size <= 24 ? 24 : 32;
  const icon: CarbonIcon = carbonIcons[name][artworkSize];
  return (
    <svg
      className="ui-icon"
      data-icon-family="carbon"
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      focusable="false"
    >
      {icon.content.map((node, key) =>
        createElement(node.elem, { ...node.attrs, key })
      )}
    </svg>
  );
}

/** Two stops joined by a winding path: the journey glyph (Carbon has no equivalent). */
function RouteIcon({ size }: { size: number }): JSX.Element {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="6" cy="5" r="2.2" />
      <circle cx="18" cy="19" r="2.2" />
      <path d="M8.2 5H16a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h7.8" />
    </svg>
  );
}
