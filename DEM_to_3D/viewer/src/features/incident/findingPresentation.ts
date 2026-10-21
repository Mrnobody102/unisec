import { roadHazardIds } from './roadHazards';
import type { Hazard, IncidentEvidence, Locale, RoadSegment, CommunityFinding } from '../../types/dear';

/** Keep extra detail, but do not repeat a finding that only restates the title
 * (same words, at most two added, e.g. "gần Khau Mang" vs "gần đường vào Khau Mang"). */
export function findingAddsDetail(title: string, finding: string): boolean {
  const words = (text: string) => text.normalize('NFC').toLocaleLowerCase().replace(/[.,;:!?()]/g, ' ').split(/\s+/).filter(Boolean);
  const titleWords = words(title), findingWords = words(finding);
  const covered = titleWords.every(word => findingWords.includes(word));
  return !(covered && findingWords.length - titleWords.length <= 2);
}

/** Collapse only the known, identical contact statement. Additional findings or
 * conflicting/unknown header status remain fully visible; provenance stays available.
 */
export function contactAlreadySummarized(finding: CommunityFinding, communication?: 'lost' | 'available' | 'unknown'): boolean {
  return communication === 'lost'
    && finding.kind === 'report' && Boolean(finding.source)
    && finding.label[0] === 'Liên lạc' && finding.label[1] === 'Communications'
    && finding.value[0] === 'Mất liên lạc với bản.'
    && finding.value[1] === 'Contact with the village lost.';
}

/** A linked road's blockage never confirms a suspected landslide. */
export function hazardObservationText(hazard: Hazard, locale: Locale, checked = false): string {
  const text = hazard.observation === 'reported'
    ? hazard.kind === 'landslide' ? ['Có báo cáo sạt lở', 'Landslide reported from field']
      : ['Có báo cáo hiện trường', 'Field observation reported']
    : checked ? ['Đã kiểm tra, chưa xác nhận', 'Checked, not confirmed']
      : ['Chưa kiểm chứng thực địa', 'Not field verified'];
  return text[locale === 'vi' ? 0 : 1];
}

/** Field evidence first, latest observation within its kind; never rely on file order. */
export function roadEvidence(road: RoadSegment, evidence: IncidentEvidence[]): IncidentEvidence[] {
  const ids = roadHazardIds(road);
  return evidence.filter(record => ids.includes(record.hazardId)).sort((a,b) =>
    Number(b.type === 'field-report') - Number(a.type === 'field-report') ||
    Date.parse(b.observedAt) - Date.parse(a.observedAt) || a.id.localeCompare(b.id));
}

/** Keep a measured area once when the finding already states the same hectares. */
export function findingStatesArea(finding:string,hectares:number):boolean {
  return [...finding.matchAll(/(?:^|[^\d.,])(\d+(?:[.,]\d+)?)\s*ha\b/gi)]
    .some(match=>Math.abs(Number(match[1].replace(',','.'))-hectares)<1e-9);
}
