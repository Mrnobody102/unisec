import type { Locale, RoadSegment } from '../../types/dear';

/** One wording for road status across the app. `open` means no reported blockage in this
 * snapshot, not verified passage. */
export const roadStatusLabels: Record<RoadSegment['status'], [vi: string, en: string]> = {
  blocked: ['Bị chặn', 'Blocked'],
  uncertain: ['Cần xác minh', 'To verify'],
  open: ['Chưa ghi nhận chặn', 'No blockage reported']
};
/** Kept for status switches; identical to `roadStatusLabels` so every screen reads the same. */
export const roadStatusShortLabels = roadStatusLabels;
export const roadStatusTone = (status: RoadSegment['status']) =>
  status === 'blocked' ? 'critical' as const : status === 'uncertain' ? 'warning' as const : 'neutral' as const;
export const roadStatusIcon = (status: RoadSegment['status']) =>
  status === 'blocked' ? 'blocked' as const : status === 'uncertain' ? 'uncertain' as const : undefined;

export const formatRoadLength = (kilometres: number, locale: Locale): string =>
  new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {maximumFractionDigits:2}).format(kilometres);
