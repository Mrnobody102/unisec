import type { CommunityFact, CommunityFinding, IncidentEvidence, Locale } from '../../types/dear';
import { contactAlreadySummarized } from './findingPresentation';
import { communityNeedTopic, isCommunityNeed } from './communityNeeds';
import { resolveCommunityFindings } from './resolveCommunityFindings';
import { SourceTimes } from './EvidenceMetadata';
import { evidencePresentation } from './evidencePresentation';

type Props = { facts: CommunityFact[]; communityName?: string; evidence: IncidentEvidence[]; locale: Locale; communication?: 'lost' | 'available' | 'unknown'; onOpenEvidence: (hazardId: string) => void };

export function CommunityFindings({ facts, communityName, evidence, locale, communication, onOpenEvidence }: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  // Times follow the source mid-line, so their labels are not capitalised.
  const lower = (labels: { observed: string; received: string }) => ({ observed: labels.observed.toLocaleLowerCase(), received: labels.received.toLocaleLowerCase() });
  const findings = resolveCommunityFindings(facts, evidence);
  const groups: { id: string; title: string; items: CommunityFinding[] }[] = [
    { id: 'needs', title: t('Nhu cầu hỗ trợ', 'Assistance needs'), items: findings.filter(isCommunityNeed) },
    { id: 'report', title: t('Báo cáo và phân tích', 'Reports and analysis'), items: findings.filter(f => f.kind === 'report' && !isCommunityNeed(f)) },
    { id: 'gap', title: t('Dữ liệu cần bổ sung', 'Data gaps'), items: findings.filter(f => f.kind === 'gap' && !isCommunityNeed(f)) },
    { id: 'context', title: t('Thông tin địa bàn', 'Community information'), items: findings.filter(f => f.kind === 'context' && !isCommunityNeed(f)) }
  ];
  return <>{groups.map(({id, title, items}) => {
    if (!items.length) return null;
    return <section className={'workflow-section community-findings' + (id === 'needs' ? ' community-needs' : '')} key={id}>
      <h3>{title}</h3>
      {items.map((finding, index) => {
        const record = evidence.find(item => item.hazardId === finding.hazardId);
        const summarizedContact = contactAlreadySummarized(finding, communication);
        return <article className={'community-finding' + (summarizedContact ? ' is-summarized' : '')} key={index}>
          {!summarizedContact && <>{!(id === 'needs' && communityNeedTopic(finding) === 'assistance' && items.length === 1) && <h4>{finding.kind === 'gap' && finding.label[0] === `Đường vào ${communityName}` ? t('Đường tiếp cận', 'Access roads') : t(...finding.label)}</h4>}<p>{t(...finding.value)}</p></>}
          {(record || finding.source) && <p className="finding-provenance">
            {summarizedContact && t('Liên lạc: ', 'Contact: ')}
            {record ? record.source[locale === 'vi' ? 0 : 1] : finding.source && t(...finding.source)}
            {(record || finding.observedAt || finding.receivedAt) && ', '}
            <SourceTimes observedAt={record?.observedAt ?? finding.observedAt} receivedAt={record?.receivedAt ?? finding.receivedAt} locale={locale}
              labels={record ? lower(evidencePresentation(record.type, locale)) : { observed: t('ghi nhận', 'observed'), received: t('tiếp nhận', 'received') }}/>
          </p>}
          {record && <button className="text-button" onClick={() => onOpenEvidence(record.hazardId)}>{evidencePresentation(record.type, locale).action}</button>}
        </article>;
      })}
    </section>;
  })}</>;
}
