import { observationCode } from '../observations/recordIdentity';
import { reportPhotoContext } from '../observations/photoSummary';
import { reportReviewLabel } from './reportReviewLabel';
import { ReportReviewForm } from './ReportReviewForm';
import { accessMessages } from './locales';
import { useState } from 'react';
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
  const [recordId, setRecordId] = useState<string | null>(null);
  const reports = session.records
    .filter((r) => submissionOf(r))
    .sort(
      (a, b) =>
        Date.parse(submissionOf(b)!.submittedAt) -
        Date.parse(submissionOf(a)!.submittedAt)
    );
  const record = reports.find((r) => r.id === recordId),
    submission = record && submissionOf(record),
    observation = record && observationOf(record);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="modal-dialog report-inbox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-inbox-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="user-guide-heading">
          <h2 id="report-inbox-title">
            {m.incomingReports}
            {reports.length ? ` (${reports.length})` : ''}
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
            <nav aria-label={m.reportList}>
              {reports.map((item) => {
                const report = submissionOf(item)!;
                const photo = observationOf(item)?.photos[0];
                const code = observationCode(item.id);
                const name = item.name.endsWith(' ' + code)
                  ? item.name.slice(0, -code.length).trimEnd()
                  : item.name;
                return (
                  <button
                    key={item.id}
                    aria-pressed={recordId === item.id}
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
                      <strong title={item.name}>{name}</strong>
                      <small className="inbox-item-code">{code}</small>
                      <small>{report.authorName}</small>
                      <small>
                        {new Date(report.submittedAt).toLocaleString(
                          locale === 'vi' ? 'vi-VN' : 'en-GB',
                          { dateStyle: 'short', timeStyle: 'short' }
                        )}
                      </small>
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
            <article>
              {record && submission ? (
                <>
                  <h3>{record.name}</h3>
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
                      {m.showOnMap}
                    </button>
                    <button
                      className="button"
                      onClick={() => onEdit(record.id)}
                    >
                      {m.openRecordAndDelineate}
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
