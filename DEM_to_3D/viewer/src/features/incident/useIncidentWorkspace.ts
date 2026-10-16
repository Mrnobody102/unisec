import type { ScenarioEdit } from '../access/scenarioEdits';
import { useMemo } from 'react';
import type { IncidentPacket } from '../../data/incidentPacket';
import { deriveIncidentWorkspace } from './deriveIncidentWorkspace';

export function useIncidentWorkspace(packet: IncidentPacket, updated: boolean, edits?: ScenarioEdit[], reportAt: string | null = null) {
  return useMemo(() => deriveIncidentWorkspace(packet, updated, edits, reportAt), [packet, updated, edits, reportAt]);
}
