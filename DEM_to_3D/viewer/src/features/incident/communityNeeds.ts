import type { CommunityFinding } from '../../types/dear';

/** Explicit labels in existing incident packets, before a structured needs register.
 * Population and road impacts never imply an affected-person count or a relief need.
 */
export function communityNeedTopic(finding: CommunityFinding): 'assistance' | 'households' | null {
  if (finding.label[1] === 'Assistance needs' || finding.label[0] === 'Nhu cầu hỗ trợ') return 'assistance';
  if (finding.label[1] === 'Affected households' || finding.label[0] === 'Hộ bị ảnh hưởng') return 'households';
  return null;
}

export const isCommunityNeed = (finding: CommunityFinding): boolean => communityNeedTopic(finding) !== null;
