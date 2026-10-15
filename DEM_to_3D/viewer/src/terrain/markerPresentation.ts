type Member = { symbol: string; selected: boolean; priority?: number };
export type MarkerPresentation = 'single' | 'feature-overlap' | 'cluster';

/** Keep the anchor identifiable; counts may only combine one feature category. */
export function markerPresentation(members: Member[], allowCounts: boolean): MarkerPresentation {
  if (members.length < 2) return 'single';
  const anchor = members[0];
  const sameCategory = members.every(member => member.symbol === anchor.symbol);
  if (!anchor.selected && allowCounts && sameCategory) return 'cluster';
  return 'feature-overlap';
}
