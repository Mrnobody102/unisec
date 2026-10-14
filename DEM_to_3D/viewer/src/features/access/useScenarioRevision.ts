import { useEffect, useState } from 'react';
export type ScenarioRevision = { applied: boolean; at: string | null };
const initial: ScenarioRevision = { applied: false, at: null };
export function useScenarioRevision(datasetVersion: string) {
  const key = 'dear.scenario-revision.v1:' + datasetVersion;
  const [revision, setRevision] = useState(initial);
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (
        typeof value?.applied === 'boolean' &&
        (value.at === null ||
          (typeof value.at === 'string' &&
            Number.isFinite(Date.parse(value.at))))
      ) {
        setRevision(value);
        return;
      }
    } catch {
      /* Default prepared revision. */
    }
    setRevision(initial);
  }, [key]);
  const change = (applied: boolean) => {
    const next = {
      applied,
      at: applied ? (revision.at ?? new Date().toISOString()) : null
    };
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* The current demo session remains usable. */
    }
    setRevision(next);
  };
  return { revision, change };
}
