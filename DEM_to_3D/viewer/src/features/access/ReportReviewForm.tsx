import { useState } from 'react';
import type { Locale } from '../../types/dear';
import type { Submission } from './submissions';
import { accessMessages } from './locales';

/** Own the review draft for one report. The inbox only owns which report is selected. */
export function ReportReviewForm({
  submission,
  reviewer,
  locale,
  onSave
}: {
  submission: Submission;
  reviewer: string;
  locale: Locale;
  onSave: (review: Submission['review']) => boolean;
}): JSX.Element {
  const m = accessMessages[locale];
  const t=(vi:string,en:string)=>locale==='vi'?vi:en;
  const [status, setStatus] = useState<Submission['review']['status']>(
    submission.review.status === 'pending'
      ? 'checked'
      : submission.review.status
  );
  const [note, setNote] = useState(submission.review.note);
  const [message, setMessage] = useState('');
  const needsNote = status === 'needs-info' || status === 'rejected';
  const noteLabel=status==='needs-info' ? t('Thông tin cần bổ sung','Information needed')
    : status==='rejected' ? t('Lý do không sử dụng','Reason for not using') : m.reviewFindings;
  return (
    <form
      className="inbox-review"
      onSubmit={(event) => {
        event.preventDefault();
        if (needsNote && !note.trim()) {
          setMessage(m.recordYourFindingsOrTheInformationNeeded);
          return;
        }
        setMessage(
          onSave({
            status,
            note: note.trim(),
            reviewer,
            reviewedAt: new Date().toISOString()
          })
            ? m.reviewSaved
            : m.couldNotSaveTheReview
        );
      }}
    >
      <h3>{m.reviewReport}</h3>
      <label className="geodata-field">
        {m.result}
        <select
          aria-label={m.result}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as Submission['review']['status']);
            setMessage('');
          }}
        >
          <option value="checked">{m.reviewed}</option>
          <option value="needs-info">{m.needsInformation}</option>
          <option value="rejected">{m.notUsed}</option>
        </select>
      </label>
      <label className="geodata-field">
        {noteLabel}{!needsNote && ` (${t('không bắt buộc','optional')})`}
        <textarea
          aria-label={noteLabel}
          required={needsNote}
          maxLength={2000}
          rows={3}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setMessage('');
          }}
        />
      </label>
      <button className="button primary" type="submit">
        {locale === 'vi' ? 'Lưu kết quả' : 'Save review'}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
