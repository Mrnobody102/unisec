import { describe, expect, it } from 'vitest';
import manifestJson from '../../../public/scenarios/che-tao/v0.2/manifest.json';
import packetJson from '../../../public/scenarios/che-tao/v0.2/incident.json';
import { validateScenarioManifest } from '../../data/scenarioManifest';
import { validateIncidentPacket } from '../../data/incidentPacket';
import { validateWorkspaceManifest } from './loadWorkspaceDataset';

describe('workspace dataset consistency', () => {
  it('accepts the matching packet', () => {
    expect(() => validateWorkspaceManifest(validateScenarioManifest(manifestJson), validateIncidentPacket(packetJson))).not.toThrow();
  });
  it.each(['incidentId', 'snapshotAt', 'crs', 'datasetVersion', 'dataKind', 'reviewStatus'] as const)('rejects a different %s', field => {
    const manifest = validateScenarioManifest(manifestJson);
    Object.assign(manifest, { [field]: 'mismatch' });
    expect(() => validateWorkspaceManifest(manifest, validateIncidentPacket(packetJson))).toThrow('does not match');
  });
  it.each(['roads', 'communities', 'hazards'] as const)('rejects a different %s count', field => {
    const manifest = validateScenarioManifest(manifestJson);
    manifest.counts[field]++;
    expect(() => validateWorkspaceManifest(manifest, validateIncidentPacket(packetJson))).toThrow('does not match');
  });
});
