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
  survey?: {areas: number; points: number};
  onShowSurvey?: () => void;
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
  hazards, onInspectObject, survey, onShowSurvey, reportPending, pendingReport,
  onOpenReport, historical, onOpenRoads, onOpenCommunities
}: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  const priorityCommunities = communities.filter(community => community.prio === 1);
  const openTasks = tasks.filter(task => task.kind !== 'report' && workState(task, entries).status !== 'done');
  const activeTasks = openTasks.filter(task => workState(task, entries).status === 'active');
  return <>
    <div className="sidebar-top incident-overview-heading">
      <h1>{incident.title ? t(...incident.title) : t('Sạt lở và tiếp cận', 'Landslides and access')}</h1>
      <button className="icon-button" aria-label={t('Xem phạm vi trên bản đồ', 'Show response area')} title={t(...areaName)} onClick={onOpenArea}><UiIcon name="fit" size={18}/></button>
    </div>
    <div className="sidebar-scroll incident-overview">
      <dl className="incident-overview-counts">
        <div><dt>{t('Đường bị chặn', 'Blocked roads')}</dt><dd><button className="incident-count-link" onClick={() => onOpenRoads('blocked')}>{blockedRoadCount} {t('đoạn', 'sections')}<UiIcon name="next" size={14}/></button></dd></div>
        <div><dt>{t('Địa bàn ưu tiên', 'Priority communities')}</dt><dd><button className="incident-count-link" aria-label={t('Xem địa bàn ưu tiên', 'View priority communities')} onClick={onOpenCommunities}>{priorityCommunities.length}<UiIcon name="next" size={14}/></button></dd></div>
      </dl>
      {!historical && reportPending && <button className="incident-report-review" onClick={onOpenReport}>
        <UiIcon name="info" size={18}/><span><strong>{t('Báo cáo chờ kiểm tra', 'Report awaiting review')}</strong>
        {pendingReport && <small>{t(...pendingReport)}</small>}</span><UiIcon name="next" size={16}/>
      </button>}
      <section className="incident-priorities"><h2>{t('Địa bàn cần chú ý', 'Communities to review')}</h2>
        {priorityCommunities.map(community => <button className="incident-overview-item incident-priority-row" data-map-preview={'community:' + community.id} key={community.id} onClick={() => onSelectCommunity(community.id)}>
          <strong>{community.name}</strong><span>{t(...assessments.get(community.id)!.reason)}</span><UiIcon name="next" size={16}/>
        </button>)}
      </section>
      <section className="incident-overview-work incident-work">
        <h2>{t('Xác minh và cứu trợ', 'Verification and relief')}</h2>
        <button className="incident-overview-item incident-work-row" onClick={() => onOpenWork()}>
          <strong>{historical ? t('Xem công việc', 'View work records') : `${openTasks.length} ${t('việc chưa hoàn tất', 'open tasks')}`}</strong>
          {!historical && activeTasks.length > 0 && <span>{activeTasks.length} {t('đang xử lý', 'in progress')}</span>}
          <UiIcon name="next" size={16}/>
        </button>
      </section>
      <section className="incident-reference">
        <h2>{t('Dữ liệu tham chiếu', 'Reference data')}</h2>
        {survey && survey.areas + survey.points > 0 && <button className="incident-overview-item incident-survey-row" onClick={onShowSurvey}>
          <strong>{t('Khảo sát Chế Tạo – Lao Chải', 'Che Tao – Lao Chai survey')}</strong>
          <span>{survey.areas} {t('vùng khoanh', 'mapped areas')} · {survey.points} {t('điểm khảo sát', 'survey points')}</span><UiIcon name="next" size={16}/>
        </button>}
        <details className="incident-observations"><summary>{t('Ghi nhận sạt lở', 'Landslide observations')}<span>{hazards.filter(hazard => hazard.kind === 'landslide').length}</span></summary>
          {hazards.filter(hazard => hazard.kind === 'landslide').map(hazard => <button className="incident-overview-item incident-overview-hazard" data-map-preview={'hazard:' + hazard.id} key={hazard.id} onClick={() => onInspectObject('hazard:' + hazard.id)}>
            <strong>{t(...hazard.name)}</strong><UiIcon name="next" size={16}/>
          </button>)}
        </details>
      </section>
    </div>
  </>;
}
