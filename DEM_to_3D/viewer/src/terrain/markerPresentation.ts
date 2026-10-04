type Member = { symbol: string; selected: boolean };
export type MarkerPresentation = 'single' | 'selected-overlap' | 'cluster' | 'overlap';

/** Counts describe a single feature category, never a mixture of map objects. */
export function markerPresentation(members: Member[], allowCounts: boolean): MarkerPresentation {
  if (members.length < 2) return 'single';
  if (members.some(member => member.selected)) return 'selected-overlap';
  if (allowCounts && members.every(member => member.symbol === members[0].symbol)) return 'cluster';
  return 'overlap';
}
