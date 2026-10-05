type Member = { symbol: string; selected: boolean; priority?: number };
export type MarkerPresentation = 'single' | 'feature-overlap' | 'cluster' | 'overlap';

/** Counts describe a single feature category, never a mixture of map objects. */
export function markerPresentation(members: Member[], allowCounts: boolean): MarkerPresentation {
  if (members.length < 2) return 'single';
  // The first member is the actual anchor, which may differ from a selected
  // member hidden behind a control. Never label that anchor as another feature.
  const anchor = members[0];
  const sameCategory = members.every(member => member.symbol === anchor.symbol);
  if (anchor.selected || ((!allowCounts || !sameCategory) && anchor.symbol === 'community' && (anchor.priority ?? 0) >= 50)) return 'feature-overlap';
  if (allowCounts && sameCategory) return 'cluster';
  return 'overlap';
}
