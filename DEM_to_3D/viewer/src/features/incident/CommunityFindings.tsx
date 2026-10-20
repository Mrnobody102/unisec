import type { CommunityFact, CommunityFinding, IncidentEvidence, Locale } from '../../types/dear';
import { communityNeedTopic, isCommunityNeed } from './communityNeeds';
import { observationTime } from './sourceTime';
import { resolveCommunityFindings } from './resolveCommunityFindings';
import { EvidenceMetadata } from './EvidenceMetadata';
import { evidencePresentation } from './evidencePresentation';

type Props = { facts: CommunityFact[]; communityName?: string; evidence: IncidentEvidence[]; locale: Locale; onOpenEvidence: (hazardId: string) => void };

export function CommunityFindings({ facts, communityName, evidence, locale, onOpenEvidence }: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const findings = resolveCommunityFindings(facts, evidence);
  const groups: { id: string; title: string; items: CommunityFinding[] }[] = [
    { id: 'needs', title: t('Nhu cầu hỗ trợ', 'Assistance needs'), items: findings.filter(isCommunityNeed) },
    { id: 'report', title: t('Báo cáo và phân tích', 'Reports and analysis'), items: findings.filter(f => f.kind === 'report' && !isCommunityNeed(f)) },
    { id: 'gap', title: t('Dữ liệu cần bổ sung', 'Data gaps'), items: findings.filter(f => f.kind === 'gap' && !isCommunityNeed(f)) },
    { id: 'context', title: t('Thông tin địa bàn', 'Community information'), items: findings.filter(f => f.kind === 'context' && !isCommunityNeed(f)) }
  ];
  return <>{groups.map(({id, title, items}) => {
    if (!items.length) return id === 'needs' ? <section className="workflow-section community-needs" key={id}><h3>{title}</h3><p>{t('Chưa có báo cáo nhu cầu hỗ trợ.', 'No assistance needs have been reported.')}</p></section> : null;
    return <section className={'workflow-section community-findings' + (id === 'needs' ? ' community-needs' : '')} key={id}>
      <h3>{title}</h3>
      {items.map((finding, index) => {
        const record = evidence.find(item => item.hazardId === finding.hazardId);
        return <article className="community-finding" key={index}>
          {!(id === 'needs' && communityNeedTopic(finding) === 'assistance' && items.length === 1) && <h4>{finding.kind === 'gap' && finding.label[0] === `Đường vào ${communityName}` ? t('Đường tiếp cận', 'Access roads') : t(...finding.label)}</h4>}<p>{t(...finding.value)}</p>
          {(record || finding.source) && <details className="finding-provenance"><summary>{t('Nguồn và thời gian', 'Source and times')}</summary>
          {record ? <EvidenceMetadata evidence={record} locale={locale} className="finding-source"/> : finding.source && <dl className="finding-source">
            <div><dt>{t('Nguồn', 'Source')}</dt><dd>{t(...finding.source)}</dd></div>
            {finding.observedAt && <div><dt>{t('Ghi nhận', 'Observed')}</dt><dd><time dateTime={finding.observedAt}>{observationTime(finding.observedAt, locale)}</time></dd></div>}
            {finding.receivedAt && <div><dt>{t('Tiếp nhận', 'Received')}</dt><dd><time dateTime={finding.receivedAt}>{observationTime(finding.receivedAt, locale)}</time></dd></div>}
          </dl>}
          </details>}
          {record && <button className="text-button" onClick={() => onOpenEvidence(record.hazardId)}>{evidencePresentation(record.type, locale).action}</button>}
        </article>;
      })}
    </section>;
  })}</>;
}
