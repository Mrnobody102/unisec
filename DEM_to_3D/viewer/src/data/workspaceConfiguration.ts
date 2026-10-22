import { readResponse } from '../shared/http/readResponse';

/** Compatibility default for older launchers that only supplied dataSource. */
export const defaultManifestUrl = '/scenarios/che-tao/v0.3/manifest.json';
export type WorkspaceConfiguration = { dataSource: 'prepared' | 'api'; offline: boolean; manifestUrl: string; localMap?:string };

export function validateWorkspaceConfiguration(value: unknown): WorkspaceConfiguration {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('dataSource' in value) ||
      (value.dataSource !== 'prepared' && value.dataSource !== 'api')) throw new Error('Invalid workspace configuration');
  const manifestUrl = 'manifestUrl' in value ? value.manifestUrl : defaultManifestUrl;
  if (typeof manifestUrl !== 'string' || !/^\/scenarios\/[a-zA-Z0-9._/-]+\/manifest\.json$/.test(manifestUrl) ||
      manifestUrl.includes('..') || manifestUrl.includes('//')) throw new Error('Invalid workspace manifest URL');
  if ('offline' in value && typeof value.offline !== 'boolean') throw new Error('Invalid workspace offline setting');
  if ('localMap' in value && (typeof value.localMap!=='string'||!/^\/offline-map\/[a-zA-Z0-9._/-]+\.json$/.test(value.localMap)||value.localMap.includes('..')||value.localMap.includes('//')))throw new Error('Invalid local map URL');
  return { dataSource: value.dataSource, manifestUrl, offline: 'offline' in value && value.offline === true,...('localMap' in value?{localMap:value.localMap as string}:{}) };
}

export async function workspaceConfiguration(signal?: AbortSignal): Promise<WorkspaceConfiguration> {
  return validateWorkspaceConfiguration(await (await readResponse('/workspace-config.json', signal)).json());
}
