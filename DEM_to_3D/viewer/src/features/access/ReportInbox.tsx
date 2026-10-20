import { observationCode } from '../observations/recordIdentity';
import { reportPhotoContext } from '../observations/photoSummary';
import { reportReviewLabel } from './reportReviewLabel';
import { ReportReviewForm } from './ReportReviewForm';
import { accessMessages } from './locales';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Locale } from '../../types/dear';
import type { useGeometrySession } from '../geodata/useGeometrySession';
import type { DemoIdentity } from './demoSession';
import { submissionOf, submissionKey } from './submissions';
import { observationOf } from '../observations/model';
import { VoicePlayback } from '../observations/VoicePlayback';
import { submissionLocationLabel } from './submissions';
import { PhotoGallery } from '../observations/PhotoGallery';
import { observationTimeLabel } from '../observations/captureMetadata';
import { UiIcon } from '../../shared/ui/UiIcon';
import './inbox.css';

function reportTitle(record: { id: string; name: string }): string {
  const code = observationCode(record.id);
  return record.name.endsWith(' ' + code) ? record.name.slice(0, -code.length).trimEnd() : record.name;
}

export function ReportInbox({
  locale,
  identity,
  session,
  onClose,
  onShow,
  onEdit
}: {
  locale: Locale;
  identity: DemoIdentity;
  session: ReturnType<typeof useGeometrySession>;
  onClose: () => void;
  onShow: (id: string) => void;
  onEdit: (id: string) => void;
}): JSX.Element {
  const m = accessMessages[locale];
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [recordId, setRecordId] = useState<string | null>(null);
  const listRef = useRef<HTMLElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const reports = session.records
    .filter((r) => submissionOf(r))
    .sort(
      (a, b) =>
        Date.parse(submissionOf(b)!.submittedAt) -
        Date.parse(submissionOf(a)!.submittedAt)
    );
  const record = reports.find((r) => r.id === recordId) ?? reports.find(r => submissionOf(r)?.review.status === 'pending') ?? reports[0],
    submission = record && submissionOf(record),
    observation = record && observationOf(record);
  useEffect(() => {
    if (record && recordId !== record.id) setRecordId(record.id);
  }, [record?.id, recordId]);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const reveal = () => list.querySelector('[aria-pressed="true"]')?.scrollIntoView({block:'nearest', inline:'nearest'});
    reveal();
    if (articleRef.current) articleRef.current.scrollTop = 0;
    const observer = new ResizeObserver(reveal);
    observer.observe(list);
    return () => observer.disconnect();
  }, [record?.id]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className={'modal-dialog report-inbox' + (reports.length ? '' : ' is-empty')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-inbox-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="user-guide-heading">
          <h2 id="report-inbox-title">
            {m.incomingReports}
            {reports.length > 0 && <span className="inbox-count">({reports.length})</span>}
          </h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={m.closeInbox}
          >
            <UiIcon name="close" />
          </button>
        </header>
        {!reports.length ? (
          <p className="inbox-empty">{m.noReportsSubmittedInThisDemoSession}</p>
        ) : (
          <div className="inbox-body">
            <nav ref={listRef} aria-label={m.reportList}>
              {reports.map((item) => {
                const report = submissionOf(item)!;
                const photo = observationOf(item)?.photos[0];
                const code = observationCode(item.id);
                const name = reportTitle(item);
                return (
                  <button
                    key={item.id}
                    aria-pressed={record?.id === item.id}
                    onClick={() => setRecordId(item.id)}
                  >
                    {photo ? (
                      <img src={photo.preview} alt="" />
                    ) : (
                      <span className="inbox-thumb" aria-hidden="true">
                        <UiIcon name="image" />
                      </span>
                    )}
                    <span className="inbox-item-text">
                      <strong title={`${name} (${code})`}>{name}</strong>
                      <small>{report.authorName}</small>
                      <time dateTime={report.submittedAt}>{new Date(report.submittedAt).toLocaleString(
                        locale === 'vi' ? 'vi-VN' : 'en-GB',
                        { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }
                      )}</time>
                    </span>
                    <span
                      className={'citizen-review is-' + report.review.status}
                    >
                      {reportReviewLabel(item, locale)}
                    </span>
                  </button>
                );
              })}
            </nav>
            <article ref={articleRef} aria-label={t('Chi tiết ghi nhận', 'Report details')}>
              {record && submission ? (
                <>
                  <div className="inbox-record-heading">
                    <div><small className="inbox-record-code">{observationCode(record.id)}</small><h3>{reportTitle(record)}</h3></div>
                    <span className={'citizen-review is-' + submission.review.status}>{reportReviewLabel(record, locale)}</span>
                  </div>
                  <dl className="field-metadata">
                    <div>
                      <dt>{m.submittedBy}</dt>
                      <dd>{submission.authorName}</dd>
                    </div>
                    <div>
                      <dt>{m.observedAt}</dt>
                      <dd>
                        {observation
                          ? observationTimeLabel(observation, locale)
                          : m.notRecorded}
                      </dd>
                    </div>
                    <div>
                      <dt>{m.reportedLocation}</dt>
                      <dd>
                        {record.feature.geometry.type === 'Point'
                          ? `${record.feature.geometry.coordinates[1].toFixed(6)}°, ${record.feature.geometry.coordinates[0].toFixed(6)}°`
                          : record.feature.geometry.type}
                      </dd>
                    </div>
                  </dl>
                  {submissionLocationLabel(record,locale)&&<p className="field-hint">{submissionLocationLabel(record,locale)}</p>}
                  {observation?.note&&<p className="field-note">{observation.note}</p>}
                  <VoicePlayback voice={observation?.voice} locale={locale}/>
                  {observation && (
                    <PhotoGallery
                      photos={observation.photos}
                      locale={locale}
                      reported={reportPhotoContext(record)}
                    />
                  )}
                  <div className="geodata-actions">
                    <button
                      className="button"
                      onClick={() => onShow(record.id)}
                    >
                      <UiIcon name="location" size={16}/>{m.showOnMap}
                    </button>
                    <button
                      className="button"
                      onClick={() => onEdit(record.id)}
                    >
                      <UiIcon name="edit" size={16}/>{t('Mở hồ sơ', 'Open record')}
                    </button>
                  </div>
                  <ReportReviewForm
                    key={record.id}
                    submission={submission}
                    reviewer={identity.name}
                    locale={locale}
                    onSave={(review) =>
                      identity.role === 'manager' &&
                      session.updateProperties(record.id, {
                        [submissionKey]: { ...submission, review }
                      })
                    }
                  />
                </>
              ) : (
                <p className="field-hint">
                  {m.selectAReportToViewPhotosLocation}
                </p>
              )}
            </article>
          </div>
        )}
      </section>
    </div>
  );
}
