import type { IncidentEvidence, Locale } from '../../types/dear';
import { evidencePresentation } from './evidencePresentation';
import { localClock, observationTime } from './sourceTime';

type Props = {
  evidence: IncidentEvidence; locale: Locale; className?: string;
  showSource?: boolean; showObserved?: boolean; showReceived?: boolean;
};

export function EvidenceMetadata({ evidence, locale, className = 'evidence-metadata', showSource = true, showObserved = true, showReceived = true }: Props): JSX.Element {
  const labels = evidencePresentation(evidence.type, locale);
  return <dl className={className}>
    {showSource && <div><dt>{labels.source}</dt><dd>{evidence.source[locale === 'vi' ? 0 : 1]}</dd></div>}
    {showObserved && <div><dt>{labels.observed}</dt><dd><time dateTime={evidence.observedAt}>{observationTime(evidence.observedAt, locale)}</time></dd></div>}
    {showReceived && <div><dt>{labels.received}</dt><dd><time dateTime={evidence.receivedAt}>{observationTime(evidence.receivedAt, locale)}</time></dd></div>}
  </dl>;
}

const localDay = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date(iso));

/** Observed and received times on one line; the receipt is named only when it differs,
 *  and repeats the date only when it falls on another day. */
export function SourceTimes({ observedAt, receivedAt, labels, locale }: {
  observedAt?: string; receivedAt?: string; labels: { observed: string; received: string }; locale: Locale;
}): JSX.Element | null {
  const received = receivedAt && receivedAt !== observedAt ? receivedAt : undefined;
  if (!observedAt && !received) return null;
  const receivedText = received && (observedAt && localDay(observedAt) === localDay(received) ? localClock(received) : observationTime(received, locale));
  return <span className="source-times">
    {observedAt && <>{labels.observed} <time dateTime={observedAt}>{observationTime(observedAt, locale)}</time></>}
    {observedAt && received && ', '}
    {received && <>{observedAt ? labels.received.toLocaleLowerCase(locale === 'vi' ? 'vi-VN' : 'en-GB') : labels.received} <time dateTime={received}>{receivedText}</time></>}
  </span>;
}
