import { useState } from 'react';
import type { Locale } from '../../types/dear';
import type { ScenarioChange, ScenarioTargetType } from '../access/scenarioEdits';
import type { ScenarioProperties } from '../access/scenarioProperties';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
export function ScenarioPropertiesEditor({ value, type, locale, onSave, landingSite }: {
  value: ScenarioProperties; type: ScenarioTargetType; locale: Locale; landingSite?: boolean;
  onSave: (change: ScenarioChange, note: string) => boolean;
}) {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [draft, setDraft] = useState(value), [note, setNote] = useState(''), [review, setReview] = useState(false), [error, setError] = useState('');
  const changed = JSON.stringify(draft) !== JSON.stringify(value);
  return <div className="scenario-card-block scenario-properties">
    <label className="scenario-card-field">{t('Nhãn trên bản đồ', 'Map label')}
      <select aria-label={t('Nhãn trên bản đồ', 'Map label')} value={draft.labelMode} onChange={e => setDraft({ ...draft, labelMode: e.target.value as ScenarioProperties['labelMode'] })}>
        <option value="auto">{t('Tự động theo tỷ lệ bản đồ', 'Automatic by map scale')}</option>
        <option value="show">{t('Hiện tên khi đủ chỗ', 'Show name when space allows')}</option>
        <option value="hide">{t('Ẩn tên', 'Hide name')}</option>
      </select>
    </label>
    {type === 'hazard' && <label className="scenario-card-field">{t('Loại sự cố và ký hiệu', 'Hazard type and symbol')}
      <select aria-label={t('Loại sự cố và ký hiệu', 'Hazard type and symbol')} value={draft.hazardKind} onChange={e => setDraft({ ...draft, hazardKind: e.target.value as ScenarioProperties['hazardKind'] })}>
        <option value="landslide">{t('Sạt lở', 'Landslide')}</option><option value="flood">{t('Ngập', 'Flood')}</option>
        <option value="bridge">{t('Sự cố cầu', 'Bridge hazard')}</option><option value="crossing">{t('Điểm vượt khe', 'Gully crossing')}</option>
      </select>
    </label>}
    {type === 'site' && landingSite && <label className="scenario-card-field">{t('Tình trạng khảo sát', 'Site assessment')}
      <select aria-label={t('Tình trạng khảo sát', 'Site assessment')} value={draft.siteAssessment} onChange={e => setDraft({ ...draft, siteAssessment: e.target.value as ScenarioProperties['siteAssessment'] })}>
        <option value="candidate">{t('Đề xuất, chưa khảo sát', 'Candidate, not surveyed')}</option>
        <option value="assessed">{t('Đã ghi nhận khảo sát', 'Survey recorded')}</option>
        <option value="unavailable">{t('Không sử dụng', 'Unavailable')}</option>
      </select>
    </label>}
    {changed && <>
      <label className="scenario-card-field">{type === 'site' ? t('Nguồn và kết quả khảo sát', 'Survey source and findings') : t('Lý do thay đổi', 'Reason for change')}
        <textarea value={note} rows={2} maxLength={2000} onChange={e => setNote(e.target.value)} />
      </label>
      <div className="scenario-card-actions"><button className="button primary" onClick={() => {
        if (!note.trim()) { setError(t('Ghi lý do hoặc nguồn kiểm tra trước khi lưu.', 'Add a reason or verification source before saving.')); return; }
        setError(''); setReview(true);
      }}>{t('Lưu thay đổi', 'Save changes')}</button><button className="button" onClick={() => {setDraft(value);setNote('');setError('');}}>{t('Hủy', 'Cancel')}</button></div>
    </>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {review && <ConfirmDialog title={t('Cập nhật đối tượng?', 'Update this feature?')} locale={locale} confirmLabel={t('Cập nhật', 'Update')}
      onCancel={() => setReview(false)} error={error} onConfirm={() => {
        if (onSave({kind:'properties',from:value,to:draft},note.trim())) {setReview(false);setNote('');setError('');}
        else setError(t('Không lưu được. Bản đồ chưa thay đổi.', 'Could not save. The map is unchanged.'));
      }}>
      <p>{value.names[locale === 'vi' ? 0 : 1]}</p><p>{note.trim()}</p>
      {draft.hazardKind !== value.hazardKind && <p>{t('Ký hiệu và nhóm sự cố trên bản đồ sẽ theo loại đã chọn.', 'The map symbol and hazard category will follow the selected type.')}</p>}
      {draft.siteAssessment !== value.siteAssessment && <p>{t('Đây là ghi nhận khảo sát; không phải phê duyệt hạ cánh.', 'This records a survey; it is not a landing clearance.')}</p>}
    </ConfirmDialog>}
  </div>;
}
