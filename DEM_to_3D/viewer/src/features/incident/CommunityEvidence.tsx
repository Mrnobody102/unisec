import type { Community, IncidentEvidence, Locale } from '../../types/dear';
import type { ResponseAssessment } from './responseAssessment';
import { CommunityFindings } from './CommunityFindings';
import { UiIcon } from '../../shared/ui/UiIcon';

export function CommunityEvidence({ community, assessment, terrainCovered, evidence, locale, communication, onSources, onEvidence }: {
  community: Community; assessment: ResponseAssessment; terrainCovered: boolean | null;
  evidence: IncidentEvidence[]; locale: Locale; communication?: 'lost' | 'available' | 'unknown';
  onSources: () => void; onEvidence: (id: string) => void;
}): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  return <div className="community-evidence">
    <section className="assessment-basis">
      <dl className="fact-rows assessment-facts">
        <div><dt>{assessment.priority === 1 ? t('Lý do ưu tiên', 'Priority basis') : t('Tiếp cận', 'Access assessment')}</dt><dd>{t(...assessment.reason)}</dd></div>
      </dl>
    </section>
    <CommunityFindings facts={community.facts} communityName={community.name} evidence={evidence} locale={locale} communication={communication} onOpenEvidence={onEvidence}/>
    <details className="community-reference-section">
      <summary>{t('Dữ liệu tham chiếu', 'Reference data')}</summary>
      <dl className="fact-rows">
        <div><dt>{t('Địa hình', 'Terrain')}</dt><dd>{terrainCovered === false ? t('Ngoài vùng có dữ liệu độ cao', 'Outside elevation coverage') : terrainCovered === true ? t('Có dữ liệu độ cao', 'Elevation data available') : t('Chưa xác định phạm vi dữ liệu độ cao', 'Elevation coverage not determined')}</dd></div>
      </dl>
    </details>
    <div className="community-evidence-actions"><button className="text-button" onClick={onSources}><UiIcon name="info" size={14}/>{t('Nguồn và cách đánh giá', 'Sources and assessment method')}</button></div>
  </div>;
}
