import { useMemo, useState } from 'react';
import type { RoadSegment } from '../../types/dear';
import {
  nearestRoadAnchor,
  roadGeographic,
  roadProjected,
  selectedRoadJourney,
  type RoadAnchor
} from './selectedRoadJourney';

/** Anywhere in the scenario can be an endpoint; the route joins the network at the nearest road. */
export const JOURNEY_ACCESS_LIMIT_M = 5_000;

export type JourneyEndpoint = RoadAnchor & {
  /** The location the user chose, before snapping to the road network. */
  origin: { x: number; y: number };
  /** Preset key (`site:…`, `community:…`, `gis:…`) or `map` for a clicked location. */
  source: string;
  label?: string;
};

export function useRoadJourney(roads: RoadSegment[]) {
  const [open, setOpen] = useState(false),
    [picking, setPicking] = useState<'start' | 'end' | null>(null),
    [start, setStart] = useState<JourneyEndpoint | null>(null),
    [end, setEnd] = useState<JourneyEndpoint | null>(null),
    [avoidBlocked, setAvoidBlocked] = useState(false),
    [error, setError] = useState(false);
  const setPoint = (
    side: 'start' | 'end',
    point: { x: number; y: number },
    source = 'map',
    label?: string
  ) => {
    const anchor = nearestRoadAnchor(roads, point, JOURNEY_ACCESS_LIMIT_M);
    if (!anchor) {
      setError(true);
      return;
    }
    setError(false);
    const endpoint = { ...anchor, origin: point, source, label };
    if (side === 'start') setStart(endpoint);
    else setEnd(endpoint);
    setPicking(null);
  };
  const pick = (latitude: number, longitude: number) => {
    if (picking) setPoint(picking, roadProjected(latitude, longitude));
  };
  const route = useMemo(
    () => (start && end ? selectedRoadJourney(roads, start, end, avoidBlocked) : null),
    [roads, start, end, avoidBlocked]
  );
  return {
    open,
    setOpen,
    picking,
    setPicking,
    start,
    end,
    setPoint,
    pick,
    swap: () => {
      setStart(end);
      setEnd(start);
    },
    clear: (side: 'start' | 'end') => (side === 'start' ? setStart(null) : setEnd(null)),
    avoidBlocked,
    setAvoidBlocked,
    error,
    route,
    close: () => {
      setOpen(false);
      setPicking(null);
    }
  };
}

/** A/B markers at the chosen locations, each with the point where it joins the road. */
export function journeyMarkers(journey: ReturnType<typeof useRoadJourney>) {
  if (!journey.open) return [];
  return [journey.start, journey.end].flatMap((endpoint, index) =>
    endpoint
      ? [
          {
            ...roadGeographic(endpoint.origin),
            label: index === 0 ? 'A' : 'B',
            road: endpoint.distance > 1 ? roadGeographic(endpoint.point) : undefined
          }
        ]
      : []
  );
}
