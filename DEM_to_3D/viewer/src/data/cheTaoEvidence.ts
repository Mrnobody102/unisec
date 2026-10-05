import type { IncidentEvidence } from '../types/dear';
import { preparedPacket } from './cheTaoScenario';

export const initialEvidence = preparedPacket.evidence;
export function scenarioEvidence(updated: boolean): IncidentEvidence[] {
  return initialEvidence.map(evidence => updated && evidence.hazardId === preparedPacket.report.evidence.hazardId ? preparedPacket.report.evidence : evidence);
}
