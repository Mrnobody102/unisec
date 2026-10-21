import {roadsForHazard} from './roadHazards';
import type { IncidentPacket } from '../../data/incidentPacket';
import { localClock } from './sourceTime';
import { workStatusText, type WorkEntry } from './responseWork';
import type { ScenarioEdit } from '../access/scenarioEdits';
import { roadStatusShortLabels } from '../routes/roadStatus';
type Record = {
  id: string;
  at: string;
  kind: 'analysis' | 'report' | 'work' | 'revision';
  title: [string, string];
  description: [string, string];
  objectId?: string;
  entry?: WorkEntry;
  record?: IncidentPacket['evidence'][number];
  pending?: boolean;
};
export function journalRecords(
  packet: IncidentPacket,
  entries: WorkEntry[],
  appliedAt: string | null,
  edits: ScenarioEdit[] = []
): Record[] {
  const { incident } = packet;
  const offset = incident.triggeredAt.match(/(Z|[+-]\d{2}:\d{2})$/)?.[0] ?? 'Z';
  const analysis: Record[] = incident.timeline.map(
    ([time, vi, en, description, english], index) => ({
      id: `analysis:${index}`,
      at: `${incident.triggeredAt.slice(0, 10)}T${time}:00${offset}`,
      kind: 'analysis',
      title: [vi, en],
      description: [description, english]
    })
  );
  const reports: Record[] = [...packet.evidence, packet.report.evidence].map((record) => ({
    id: record.id,
    at: record.receivedAt,
    kind: 'report',
    title: record.source,
    description: record.finding,
    record,
    pending: record.id === packet.report.evidence.id,
    objectId: roadsForHazard(packet.roads,record.hazardId).length === 1
      ? `road:${roadsForHazard(packet.roads,record.hazardId)[0].id}`
      : `hazard:${record.hazardId}`
  }));
  const work: Record[] = entries.map((entry) => ({
    id: entry.id,
    at: entry.at,
    kind: 'work',
    title: entry.title,
    description: [workStatusText[entry.status][0], workStatusText[entry.status][1]],
    objectId: entry.objectId,
    entry
  }));
  const revision: Record[] = appliedAt
    ? [
        {
          id: 'revision:report',
          at: appliedAt,
          kind: 'revision',
          title: ['Cập nhật bản đồ từ báo cáo', 'Map updated from report'],
          description: [
            `Bản dữ liệu ${localClock(incident.asOfUpdated)}. Báo cáo ${packet.report.id}.`,
            `Data revision ${localClock(incident.asOfUpdated)}. Report ${packet.report.id}.`
          ]
        }
      ]
    : [];
  // Manual map changes are decisions too; they belong in the same trail as reports and work.
  const changes: Record[] = edits.map((edit) => {
    const c = edit.change;
    const undo: [string, string] = edit.reverts ? [' (hoàn tác)', ' (undo)'] : ['', ''];
    return {
      id: `edit:${edit.id}`,
      at: edit.at,
      kind: 'revision',
      title: c.kind === 'status'
        ? [`${edit.target.name}: từ ${roadStatusShortLabels[c.from][0].toLocaleLowerCase('vi-VN')} sang ${roadStatusShortLabels[c.to][0].toLocaleLowerCase('vi-VN')}`,
          `${edit.target.name}: ${roadStatusShortLabels[c.from][1].toLocaleLowerCase('en-GB')} to ${roadStatusShortLabels[c.to][1].toLocaleLowerCase('en-GB')}`]
        : c.kind === 'properties' && c.to.observation === 'reported' && c.from.observation !== 'reported'
          ? [`${edit.target.name}: xác nhận tại hiện trường`, `${edit.target.name}: confirmed on site`]
          : [`Sửa dữ liệu: ${edit.target.name}`, `Data edit: ${edit.target.name}`],
      description: [`${edit.author.name}${undo[0]}${edit.note ? `. ${edit.note}` : ''}`,
        `${edit.author.name}${undo[1]}${edit.note ? `. ${edit.note}` : ''}`],
      objectId: edit.target.type === 'community' ? undefined : `${edit.target.type === 'site' ? 'poi' : edit.target.type}:${edit.target.id}`
    };
  });
  return [...analysis, ...reports, ...work, ...revision, ...changes].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id)
  );
}
