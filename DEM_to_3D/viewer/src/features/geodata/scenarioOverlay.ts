import {poiGeometry} from '../map/poiGeometry';
import { createScreenMarkers } from '../../terrain/screenMarkers';
import { SELECTED_PIN, selectedPinSvg } from '../../terrain/poiFrame';
import * as L from 'leaflet';
import type {
  Community,
  Hazard,
  Locale,
  ResponseSite,
  RoadSegment
} from '../../types/dear';
import { roadGeographic } from '../routes/selectedRoadJourney';
import { roadColors, roadStroke } from '../../terrain/roadStyle';
import type { ScenarioTargetType } from '../access/scenarioEdits';

/** Incident-scenario features drawn under GIS data. Managers can select, move and restatus them. */
export type ScenarioOverlay = {
  datasetVersion?: string;
  communities: Community[];
  responseSites: ResponseSite[];
  hazards: Hazard[];
  roads: RoadSegment[];
};
export type ScenarioTarget = { type: ScenarioTargetType; id: string };
export const targetKey = (target: ScenarioTarget | null) =>
  target ? `${target.type}:${target.id}` : '';

const geo = (point: { x: number; y: number }) => {
  const { latitude, longitude } = roadGeographic(point);
  return L.latLng(latitude, longitude);
};

export const scenarioKindLabel = {
  community: ['Thôn, bản', 'Community'],
  staging: ['Điểm tập kết', 'Staging point'],
  hlz: ['Bãi đáp đề xuất', 'Proposed landing site'],
  hazard: ['Điểm sự cố', 'Hazard'],
  road: ['Đoạn đường', 'Road section']
} as const;

export function scenarioOverlayLayer(
  scenario: ScenarioOverlay,
  options: {
    map: L.Map;
    imagery: boolean;
    pane: string;
    locale: Locale;
    selected?: ScenarioTarget | null;
    /** The selected point becomes draggable. */
    moving?: boolean;
    /** Unsaved position of the selected point while it is being moved. */
    pendingAt?: L.LatLng | null;
    onSelect?: (target: ScenarioTarget) => void;
    onMoved?: (target: ScenarioTarget, position: L.LatLng) => void;
  }
): L.LayerGroup {
  const t = (pair: readonly [string, string]) =>
    options.locale === 'vi' ? pair[0] : pair[1];
  const group = L.layerGroup();
  const selectedKey = targetKey(options.selected ?? null);
  const interactive = !!options.onSelect;
  const tooltip = (
    layer: L.Layer & { bindTooltip: L.Layer['bindTooltip'] },
    name: string,
    kind: readonly [string, string],
    permanent = false
  ) => {
    const label = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = name;
    const small = document.createElement('small');
    small.textContent = t(kind);
    label.append(strong, small);
    if (layer instanceof L.Marker) {
      layer.getElement()?.setAttribute('aria-label', name);
    }
    layer.bindTooltip(label, {
      direction: 'top',
      permanent,
      className: 'scenario-overlay-label' + (permanent ? ' is-permanent' : '')
    });
  };
  const select = (layer: L.Layer, target: ScenarioTarget) => {
    if (!interactive) return;
    layer.on('click', (event: L.LeafletMouseEvent) => {
      if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
      options.onSelect?.(target);
    });
  };
  for (const road of scenario.roads) {
    const target = { type: 'road' as const, id: road.id };
    const selected = targetKey(target) === selectedKey;
    const line = L.polyline(road.points.map(geo), {
      pane: options.pane,
      interactive,
      color:
        road.status === 'open' ? roadColors[options.imagery ? 'networkImagery' : 'networkTerrain'] : roadColors[road.status],
      weight: selected ? roadStroke.emphasis : roadStroke.normal,
      opacity: 0.9,
      dashArray: road.status === 'uncertain' ? '6 5' : undefined
    }).addTo(group);
    if (selected)
      L.polyline(road.points.map(geo), {
        pane: options.pane,
        interactive: false,
        color: '#fff',
        weight: roadStroke.emphasis + roadStroke.inspectedCasing,
        opacity: 0.35
      })
        .addTo(group)
        .bringToBack();
    tooltip(
      line,
      options.locale === 'vi' ? road.name[0] : road.name[1],
      scenarioKindLabel.road
    );
    select(line, target);
    // A wide transparent stroke makes thin roads easy to click.
    if (interactive)
      select(
        L.polyline(road.points.map(geo), {
          pane: options.pane,
          weight: 14,
          opacity: 0
        }).addTo(group),
        target
      );
  }
  const point = (
    target: ScenarioTarget,
    latlng: L.LatLng,
    className: string
  ) => {
    const selected = targetKey(target) === selectedKey;
    const draggable = selected && !!options.moving;
    const marker = L.marker(
      selected && options.pendingAt ? options.pendingAt : latlng,
      {
        pane: options.pane,
        keyboard: interactive,
        interactive,
        draggable,
        zIndexOffset: selected ? 1000 : 0,
        icon: L.divIcon({
          className:
            'scenario-drag-pin ' + className + (draggable ? ' is-moving' : ''),
          html: selectedPinSvg(),
          iconSize: [SELECTED_PIN.width, SELECTED_PIN.height],
          iconAnchor: [SELECTED_PIN.width / 2, SELECTED_PIN.tipY]
        })
      }
    ).addTo(group);
    select(marker, target);
    if (draggable)
      marker.on('dragend', () => options.onMoved?.(target, marker.getLatLng()));
    return marker;
  };
  // One screen-marker renderer across GIS and response, including overlap picking.
  const excludes = (type: ScenarioTargetType, id: string) =>
    options.moving && selectedKey === `${type}:${id}`;
  let markers: ReturnType<typeof createScreenMarkers> | null = null;
  const update = () =>
    markers?.update((position) =>
      options.map.latLngToContainerPoint(geo(position))
    );
  group.on('add', () => {
    markers = createScreenMarkers(options.map.getContainer(), {
      communities: scenario.communities.filter(
        (item) => !excludes('community', item.id)
      ),
      hazards: scenario.hazards.filter((item) => !excludes('hazard', item.id)),
      responseSites: scenario.responseSites.filter(
        (item) => !excludes('site', item.id)
      ),
      locale: options.locale,
      interactive: interactive && !options.moving,
      layers: {
        communities: true,
        landslide: true,
        flood: true,
        status: true,
        staging: true,
        hlz: true,
        imagery: options.imagery
      },
      selectedCommunityId:
        options.selected?.type === 'community' ? options.selected.id : null,
      selectedObjectId:
        options.selected?.type === 'hazard'
          ? `hazard:${options.selected.id}`
          : options.selected?.type === 'site'
            ? `poi:${options.selected.id}`
            : null,
      onPreviewFocus:point=>{const dock=options.map.getContainer().closest('.geodata-map')?.querySelector('.scenario-card')?.getBoundingClientRect();options.map.panInside(geo(point),{paddingTopLeft:[48,72],paddingBottomRight:[dock?dock.width+32:48,72],animate:false});},
      onSelect: (hit) =>
        options.onSelect?.({
          type: hit.type === 'poi' ? 'site' : hit.type,
          id: hit.id
        } as ScenarioTarget),
      onExpandGroup: (points) =>
        options.map.fitBounds(L.latLngBounds(points.map(geo)), {
          padding: [64, 64],
          maxZoom: 17
        })
    });
    options.map.on('move zoom resize', update);
    update();
  });
  group.on('remove', () => {
    options.map.off('move zoom resize', update);
    markers?.dispose();
    markers = null;
  });
  // An explicit move uses a draggable Leaflet point, while ordinary points stay fixed.
  if (options.moving && options.selected) {
    const target = options.selected;
    const item =
      target.type === 'community'
        ? scenario.communities.find((item) => item.id === target.id)
        : target.type === 'site'
          ? scenario.responseSites.find((item) => item.id === target.id)
          : target.type === 'hazard'
            ? scenario.hazards.find((item) => item.id === target.id)
            : null;
    if (item) {
      const symbol =
        target.type === 'community'
          ? 'community'
          : 'kind' in item
            ? item.kind
            : 'landslide';
      const marker = point(
        target,
        geo(item.projected),
        `is-${symbol}`
      );
      tooltip(
        marker,
        typeof item.name === 'string' ? item.name : t(item.name),
        scenarioKindLabel[target.type === 'site' ? 'staging' : target.type]
      );
    }
  }
  return group;
}
