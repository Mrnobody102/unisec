import type { ScenarioTargetType } from './scenarioEdits';
import { useEffect, useMemo, useState } from 'react';
import type { IncidentPacket } from '../../data/incidentPacket';
export type ScenarioLabels = {
  communities: Record<string, string>;
  roads: Record<string, [string, string]>;
};
export function useScenarioLabels(packet: IncidentPacket | null) {
  const key = `dear.scenario-labels.v1:${packet?.datasetVersion ?? ''}`;
  const [labels, setLabels] = useState<ScenarioLabels>({
    communities: {},
    roads: {}
  });
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (raw?.communities && raw?.roads) {
        setLabels(raw);
        return;
      }
    } catch {
      /* Use original names. */
    }
    setLabels({ communities: {}, roads: {} });
  }, [key]);
  const edited = useMemo(
    () =>
      packet
        ? {
            ...packet,
            communities: packet.communities.map((c) => ({
              ...c,
              name:
                typeof labels.communities[c.id] === 'string'
                  ? labels.communities[c.id].slice(0, 160)
                  : c.name
            })),
            roads: packet.roads.map((r) => ({
              ...r,
              name:
                Array.isArray(labels.roads[r.id]) &&
                labels.roads[r.id].length === 2 &&
                labels.roads[r.id].every((s) => typeof s === 'string')
                  ? labels.roads[r.id]
                  : r.name
            }))
          }
        : null,
    [packet, labels]
  );
  const rename = (
    type: 'community' | 'road',
    id: string,
    names: [string, string]
  ) => {
    if (!packet || !names.every((n) => n.trim() && n.length <= 160))
      return false;
    const exists = (
      type === 'community' ? packet.communities : packet.roads
    ).some((x) => x.id === id);
    if (!exists) return false;
    const next =
      type === 'community'
        ? { ...labels, communities: { ...labels.communities, [id]: names[0] } }
        : { ...labels, roads: { ...labels.roads, [id]: names } };
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setLabels(next);
      return true;
    } catch {
      return false;
    }
  };
  return { packet: edited, rename };
}

export type RenameScenario = (
  type: ScenarioTargetType,
  id: string,
  names: [string, string]
) => boolean;
