import {poiGeometry} from '../map/poiGeometry';
import * as L from "leaflet";
import type { GeometryRecord } from "../../geo/vector/types";
import { poiFrameSvg } from "../../terrain/poiFrame";
import type { FieldObservation } from "./model";
import "./observations.css";
/** Evidence remains a source point, never an automatically confirmed incident. */
export function observationMarker(
  position: L.LatLng,
  record: GeometryRecord,
  observation: FieldObservation,
  options: { pane: string; selected: boolean; interactive: boolean },
): L.Marker {
  const icon = document.createElement("span"),
    glyph = document.createElement("b");
  glyph.textContent = observation.kind === "survey" ? "i" : "!";
  icon.setAttribute("aria-hidden", "true");
  icon.dataset.fieldId = record.id;
  icon.innerHTML = poiFrameSvg(options.selected);
  icon.append(glyph);
  return L.marker(position, {
    pane: options.pane,
    keyboard: options.interactive,
    interactive: options.interactive,
    zIndexOffset: options.selected ? 1000 : 0,
    icon: L.divIcon({
      html: icon,
      className:
        "field-map-marker" +
        (observation.kind === "survey" ? " is-survey" : "") +
        (options.selected ? " is-selected map-selected-reference" : ""),
      ...poiGeometry(options.selected),
      tooltipAnchor: [0, -30],
    }),
  });
}
