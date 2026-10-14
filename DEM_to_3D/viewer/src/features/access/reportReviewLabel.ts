import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import { accessMessages } from './locales';
import { submissionOf } from './submissions';

export function reportReviewLabel(
  record: GeometryRecord,
  locale: Locale
): string {
  const review = submissionOf(record)?.review;
  const m = accessMessages[locale];
  if (!review) return locale === 'vi' ? 'Chưa xác minh' : 'Unverified';
  return review.status === 'checked'
    ? m.reviewed
    : review.status === 'needs-info'
      ? m.moreInformationNeeded
      : review.status === 'rejected'
        ? m.notUsed
        : m.awaitingReview;
}
