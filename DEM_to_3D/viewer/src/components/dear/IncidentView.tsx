import type { Community, IncidentModel, Locale } from '../../types/dear';
import { communityAccessText } from '../../features/routes/accessAssessment';
import { StatusText } from '../../shared/ui/StatusText';
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
  incident,
  locale,
  areaName,
  tasks,
  entries,
  reportPending,
  pendingReport,
  onApplyReport,
  historical,
  onOpenWork,
  onOpenReport,
  communities,
  routes,
  assessments,
  blockedRoadCount,
  uncertainRoadCount,
  onSelectCommunity,
  onOpenTimeline,
  onOpenData,
  onOpenCommunities,
  onOpenRoads,
  onOpenArea
}: Props): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);
  const priorityCommunities = communities.filter(
    (community) => community.prio === 1
  );
  const open = tasks.filter(
    (task) => workState(task, entries).status !== 'done'
  );
  return (
    <>
      <div className="sidebar-top incident-head">
        <h1>
          {incident.title ? t(...incident.title) : t('Sự kiện', 'Incident')}
        </h1>
        <button
          className="text-button incident-area-link"
          title={t(...areaName)}
          onClick={onOpenArea}
        >
          {t('Xem phạm vi trên bản đồ', 'Show response area')}
        </button>
        {historical ? (
          <p className="incident-context-note">
            {t('Đang xem bản dữ liệu cũ', 'Viewing an older revision')}
          </p>
        ) : (
          reportPending && (
            // Says what came in; the action is one click.
            <div className="incident-pending-report" role="status">
              <UiIcon name="uncertain" size={16} />
              <div>
                <strong>
                  {t('Báo cáo mới từ hiện trường', 'New field report')}
                  {pendingReport && `: ${t(...pendingReport)}`}
                </strong>
                <span className="incident-pending-actions">
                  {onApplyReport && (
                    <button className="button primary" onClick={onApplyReport}>
                      {t('Cập nhật bản đồ', 'Update map')}
                    </button>
                  )}
                  <button className="text-button" onClick={onOpenReport}>
                    {t('Xem báo cáo', 'View report')}
                  </button>
                </span>
              </div>
            </div>
          )
        )}
      </div>
      <div className="sidebar-scroll incident-body">
        <section
          className="incident-section incident-road-summary"
          aria-labelledby="incident-road-heading"
        >
          <div className="incident-section-heading">
            <h3 id="incident-road-heading">
              {t('Tình trạng đường', 'Road conditions')}
            </h3>
          </div>
          <button
            className="road-count-row"
            onClick={() => onOpenRoads('blocked')}
          >
            <StatusText tone="critical" icon="blocked">
              {t('Bị chặn', 'Blocked')}
            </StatusText>
            <span>
              {blockedRoadCount}{' '}
              {t('đoạn', blockedRoadCount === 1 ? 'section' : 'sections')}
            </span>
          </button>
          <button
            className="road-count-row"
            onClick={() => onOpenRoads('uncertain')}
          >
            <StatusText tone="warning" icon="uncertain">
              {t('Cần xác minh', 'To verify')}
            </StatusText>
            <span>
              {uncertainRoadCount}{' '}
              {t('đoạn', uncertainRoadCount === 1 ? 'section' : 'sections')}
            </span>
          </button>
        </section>
        <section
          className="incident-section"
          aria-labelledby="incident-priority-heading"
        >
          <div className="incident-section-heading">
            <h3 id="incident-priority-heading">
              {t('Địa bàn ưu tiên', 'Priority communities')}
            </h3>
            <button
              className="text-button incident-all-communities"
              onClick={onOpenCommunities}
              aria-label={`${t('Tất cả địa bàn', 'All communities')} (${communities.length})`}
            >
              {t('Tất cả', 'All')} ({communities.length})
            </button>
          </div>
          <div className="incident-priority-list">
            {priorityCommunities.map((community) => {
              const assessment = assessments.get(community.id);
              return (
                <button
                  data-map-preview={"community:"+community.id}
                  className="incident-priority-row"
                  key={community.id}
                  onClick={() => onSelectCommunity(community.id)}
                >
                  <span>
                    <strong>{community.name}</strong>
                    <small className="priority-next-action">
                      {t(
                        ...(assessment?.reason ??
                          communityAccessText(routes.get(community.id)))
                      )}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <section
          className="incident-section incident-work"
          aria-labelledby="incident-work-heading"
        >
          <div className="incident-section-heading">
            <h3 id="incident-work-heading">
              {t('Theo dõi xác minh', 'Verification tracking')}
            </h3>
          </div>
          <button className="road-count-row" onClick={() => onOpenWork()}>
            <span>{t('Chưa hoàn tất', 'Open')}</span>
            <span>{open.length}</span>
          </button>
        </section>
        <nav
          className="incident-detail-actions"
          aria-label={t('Tham khảo', 'Reference')}
        >
          <button className="incident-link" onClick={onOpenTimeline}>
            <UiIcon name="history" size={18} />
            <span>{t('Nhật ký sự kiện', 'Incident journal')}</span>
          </button>
          <button className="incident-link" onClick={onOpenData}>
            <UiIcon name="info" size={18} />
            <span>{t('Nguồn dữ liệu', 'Data sources')}</span>
          </button>
        </nav>
      </div>
    </>
  );
}
