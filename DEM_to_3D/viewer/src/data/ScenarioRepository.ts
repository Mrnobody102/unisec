import { validateIncidentPacket, type IncidentPacket } from './incidentPacket';
import type { ScenarioAsset } from './scenarioManifest';

export interface ScenarioRepository { load(signal?: AbortSignal): Promise<IncidentPacket> }

export async function workspaceDataSource(): Promise<'prepared' | 'api'> {
  return (await workspaceConfiguration()).dataSource;
}

export async function workspaceConfiguration(): Promise<{ dataSource: 'prepared' | 'api'; offline: boolean }> {
  const value: unknown = await (await request('/workspace-config.json')).json();
  if (!value || typeof value !== 'object' || !('dataSource' in value) || (value.dataSource !== 'prepared' && value.dataSource !== 'api')) {
    throw new Error('Invalid workspace configuration');
  }
  return { dataSource: value.dataSource, offline: 'offline' in value && value.offline === true };
}

async function request(url: string, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController(), abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timeout = setTimeout(() => controller.abort(new Error('Dataset request timed out')), 10000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Dataset request failed (${response.status})`);
    // Read within the timeout; returning an unread response could hang on its body.
    return new Response(await response.arrayBuffer(), { status: response.status, headers: response.headers });
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}

export function preparedRepository(asset: ScenarioAsset): ScenarioRepository {
  return { async load(signal) {
    const bytes = await (await request(asset.url, signal)).arrayBuffer();
    if (bytes.byteLength !== asset.byteLength) throw new Error('Incident packet size mismatch');
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (digest !== asset.sha256) throw new Error('Incident packet checksum mismatch');
    return validateIncidentPacket(JSON.parse(new TextDecoder().decode(bytes)));
  } };
}

/** API mode is explicit. Errors never silently substitute simulated data. */
export function apiRepository(baseUrl: string, incidentId: string): ScenarioRepository {
  return { async load(signal) {
    return validateIncidentPacket(await (await request(`${baseUrl.replace(/\/$/, '')}/api/v1/incidents/${encodeURIComponent(incidentId)}/workspace`, signal)).json());
  } };
}
