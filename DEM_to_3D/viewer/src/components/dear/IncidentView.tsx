import type { Community, Hazard, IncidentModel, Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import type { ResponseAssessment } from '../../features/incident/responseAssessment';
import type { ScenarioRoutePair } from '../../types/dear';
import '../../features/incident/incident-panel.css';
import {
  workState,
  type ResponseWork,
  type WorkEntry
} from '../../features/incident/responseWork';

type Props = {
  incident: IncidentModel;
  hazards: Hazard[];
  onInspectObject: (id: string) => void;
  locale: Locale;
  areaName: [vi: string, en: string];
  tasks: ResponseWork[];
  entries: WorkEntry[];
  reportPending: boolean;
  pendingReport?: [vi: string, en: string];
  onApplyReport?: () => void;
  historical: boolean;
  onOpenWork: (id?: string) => void;
  onOpenReport: () => void;
  communities: Community[];
  routes: Map<string, ScenarioRoutePair>;
  assessments: Map<string, ResponseAssessment>;
  blockedRoadCount: number;
  uncertainRoadCount: number;
  onSelectCommunity: (id: string) => void;
  onOpenTimeline: () => void;
  onOpenData: () => void;
  onOpenCommunities: () => void;
  onOpenRoads: (filter: 'blocked' | 'uncertain') => void;
  onOpenArea: () => void;
};

export function IncidentView({
  incident, locale, areaName, tasks, entries, communities, assessments,
  blockedRoadCount, onSelectCommunity, onOpenWork, onOpenArea,
  hazards, onInspectObject
}: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  const priorityCommunities = communities.filter(community => community.prio === 1);
  const openTasks = tasks.filter(task => workState(task, entries).status !== 'done');
  return <>
    <div className="sidebar-top incident-overview-heading">
      <h1>{incident.title ? t(...incident.title) : t('Sạt lở và tiếp cận', 'Landslides and access')}</h1>
      <button className="icon-button" aria-label={t('Xem phạm vi trên bản đồ', 'Show response area')} title={t(...areaName)} onClick={onOpenArea}><UiIcon name="fit" size={18}/></button>
    </div>
    <div className="sidebar-scroll incident-overview">
      <dl className="incident-overview-counts">
        <div><dt>{t('Đường bị chặn', 'Blocked roads')}</dt><dd>{blockedRoadCount} {t('đoạn', 'sections')}</dd></div>
        <div><dt>{t('Địa bàn ưu tiên', 'Priority communities')}</dt><dd>{priorityCommunities.length}</dd></div>
      </dl>
      <section><h2>{t('Địa bàn cần chú ý', 'Communities to review')}</h2>
        {priorityCommunities.map(community => <button className="incident-overview-item incident-priority-row" data-map-preview={'community:' + community.id} key={community.id} onClick={() => onSelectCommunity(community.id)}>
          <strong>{community.name}</strong><span>{t(...assessments.get(community.id)!.reason)}</span><UiIcon name="next" size={16}/>
        </button>)}
      </section>
      <section><h2>{t('Điểm sạt lở', 'Landslide observations')}</h2>
        {hazards.filter(hazard => hazard.kind === 'landslide').map(hazard => <button className="incident-overview-item incident-overview-hazard" data-map-preview={'hazard:' + hazard.id} key={hazard.id} onClick={() => onInspectObject('hazard:' + hazard.id)}>
          <strong>{t(...hazard.name)}</strong><UiIcon name="next" size={16}/>
        </button>)}
      </section>
      <details className="incident-overview-work incident-work"><summary>{t('Xác minh và cứu trợ', 'Verification and relief')}</summary>
        <button className="text-button" onClick={() => onOpenWork()}>{openTasks.length} {t('việc chưa hoàn tất', 'open tasks')}<UiIcon name="next" size={16}/></button>
      </details>
    </div>
  </>;
}
