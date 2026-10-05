import type { CommunityFact, CommunityFinding, IncidentEvidence } from '../../types/dear';

/** Evidence-linked observations follow the active snapshot, not baseline prose. */
export function resolveCommunityFindings(facts: CommunityFact[], evidence: IncidentEvidence[]): CommunityFinding[] {
  return facts.map(fact => {
    const finding: CommunityFinding = Array.isArray(fact)
      ? { kind: 'context', label: ['Ghi nhận', 'Finding'], value: [fact[0], fact[1]], source: [fact[2], fact[3]] }
      : fact;
    const record = evidence.find(item => item.hazardId === finding.hazardId);
    return record ? { ...finding, value: record.finding, source: record.source, observedAt: record.observedAt, receivedAt: record.receivedAt } : finding;
  });
}
