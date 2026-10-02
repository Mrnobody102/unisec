import type { Hazard, IncidentEvidence, Locale, RoadSegment } from '../../types/dear';
import { UiIcon } from './UiIcon';

type Props = {
  evidence?: IncidentEvidence;
  hazard?: Hazard;
  roads: RoadSegment[];
  locale: Locale;
  onClose: () => void;
  onSelectRoad: (id: string) => void;
};

export function EvidenceDialog({ evidence, hazard, roads, locale, onClose, onSelectRoad }: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const time = (value: string) => new Date(value).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const affected = roads.filter(road => road.hz === hazard?.id);
  return <div className="modal-overlay" onClick={onClose}>
    <section className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="evidence-dialog-title" onClick={event => event.stopPropagation()}>
      <div className="modal-head"><h2 id="evidence-dialog-title">{t('Căn cứ đánh giá', 'Assessment evidence')}</h2><button className="icon-button" onClick={onClose} aria-label={t('Đóng', 'Close')}><UiIcon name="close"/></button></div>
      <div className="modal-body">
        <h3 className="evidence-title">{hazard ? t(...hazard.name) : t('Chưa có bản ghi nguồn', 'No source record')}</h3>
        {evidence ? <>
          <p className="evidence-finding">{t(...evidence.finding)}</p>
          <dl className="evidence-metadata">
            <div><dt>{t('Nguồn', 'Source')}</dt><dd>{t(...evidence.source)}</dd></div>
            <div><dt>{t('Quan sát', 'Observed')}</dt><dd><time dateTime={evidence.observedAt}>{time(evidence.observedAt)}</time></dd></div>
            <div><dt>{evidence.type === 'field-report' ? t('Nhận tin', 'Received') : t('Có kết quả', 'Result available')}</dt><dd><time dateTime={evidence.receivedAt}>{time(evidence.receivedAt)}</time></dd></div>
          </dl>
          {affected.length > 0 && <section className="workflow-section"><h3>{t('Ảnh hưởng đến tiếp cận', 'Access impact')}</h3>{affected.map(road => <button className="object-row evidence-road" key={road.id} onClick={() => onSelectRoad(`road:${road.id}`)}><strong>{t(...road.name)}</strong><span>{road.status === 'blocked' ? t('Bị chặn', 'Blocked') : t('Khả năng đi qua chưa xác minh', 'Passability unverified')}</span></button>)}</section>}
          <section className="workflow-section"><h3>{t('Cần xác minh', 'Verification needed')}</h3><p>{t(...evidence.limitation)}</p></section>
        </> : <p>{t('Chưa có bản ghi chi tiết cho nhận định này.', 'No detailed record is available for this finding.')}</p>}
      </div>
    </section>
  </div>;
}
