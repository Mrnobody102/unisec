import { mapSymbolArtwork, type MapSymbolName } from "../../terrain/mapSymbols";
export function MapSymbol({
  name,
  size = 18,
}: {
  name: MapSymbolName;
  size?: number;
}): JSX.Element {
  const artwork = mapSymbolArtwork(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox={artwork.viewBox}
      fill={artwork.filled ? "currentColor" : "none"}
      stroke={artwork.filled ? "none" : "currentColor"}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={artwork.path} />
    </svg>
  );
}
