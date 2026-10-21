import { useEffect, useRef } from "react";
import * as L from "leaflet";
import { mapPane } from "./mapLayerOrder";
import type { DeviceLocation } from "../../shared/hooks/useDeviceLocation";
export function DeviceLocationLayer({
  mapRef,
  location,
  request,
  locale,
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
  location: DeviceLocation | null;
  request: number;
  locale: "vi" | "en";
}): null {
  const last = useRef(0);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    const point = L.latLng(location.latitude, location.longitude),
      group = L.layerGroup().addTo(map);
    L.circle(point, {
      pane: mapPane("selection"),
      radius: location.accuracy,
      color: "#246b9a",
      weight: 1,
      fillColor: "#246b9a",
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(group);
    const marker = L.circleMarker(point, {
      pane: mapPane("selection"),
      radius: 5,
      color: "#fff",
      weight: 2,
      fillColor: "#246b9a",
      fillOpacity: 1,
      interactive: false,
    }).addTo(group);
    const tip = document.createElement("span");
    tip.textContent =
      (locale === "vi" ? "Vị trí của bạn" : "Your location") +
      (locale === "vi" ? ", sai số ±" : ", accuracy ±") +
      Math.round(location.accuracy) +
      " m";
    marker.bindTooltip(tip);
    if (request && request !== last.current) {
      last.current = request;
      map.setView(point, Math.min(16, Math.max(14, map.getZoom())), {
        animate: false,
      });
    }
    return () => {
      group.remove();
    };
  }, [mapRef, location, request, locale]);
  return null;
}
