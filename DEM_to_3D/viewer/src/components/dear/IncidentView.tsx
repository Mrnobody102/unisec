import type { Community, IncidentModel, Locale } from '../../types/dear';
import { localClock } from '../../features/incident/sourceTime';
import { MapSymbol } from '../../shared/ui/MapSymbol';
import { StatusText } from '../../shared/ui/StatusText';

type Props = {
  incident: IncidentModel; locale: Locale; updated: boolean;
  communities: Community[];
  blockedRoadCount: number; uncertainRoadCount: number;
  onSelectCommunity: (id: string) => void;
  onOpenTimeline: () => void; onOpenData: () => void;
  onOpenCommunities: () => void; onOpenRoads: () => void;
  onOpenArea: () => void;
};

export function IncidentView({ incident, locale, updated, communities, blockedRoadCount, uncertainRoadCount, onSelectCommunity, onOpenTimeline, onOpenData, onOpenCommunities, onOpenRoads, onOpenArea }: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  const asOf = updated ? incident.asOfUpdated : incident.asOf;
  const priorityCommunities = communities.filter(community => community.prio === 1);
  return <>
    <div className="sidebar-top">
      <h1>{t('Sạt lở, nguy cơ lũ quét', 'Landslide and flash-flood risk')}</h1>
      <div className="incident-status">
        <StatusText tone="selected">{t('Đang đánh giá ứng phó', 'Response assessment')}</StatusText>
        <button className="text-button incident-area-link" onClick={onOpenArea}>{t('Vùng đánh giá Nậm Kha', 'Nậm Kha assessment area')}</button>
      </div>
    </div>
    <div className="sidebar-scroll">
      <section className="workflow-section">
        <dl className="incident-facts">
          <div><dt>{t('Địa bàn ưu tiên', 'Priority communities')}</dt><dd>{priorityCommunities.length} <small>{t('thôn, bản', 'villages')}</small></dd></div>
          <div><dt>{t('Đường bị chặn', 'Blocked roads')}</dt><dd>{blockedRoadCount} <small>{t('đoạn', 'segments')}</small></dd></div>
          <div><dt>{t('Đường cần xác minh', 'Roads to verify')}</dt><dd>{uncertainRoadCount} <small>{t('đoạn', 'segments')}</small></dd></div>
        </dl>
        <button className="text-button" onClick={onOpenRoads}>{t('Xem tình trạng đường', 'Review road conditions')}</button>
      </section>
      <section className="workflow-section">
        <div className="section-line"><h3>{t('Địa bàn cần ưu tiên', 'Communities needing attention')}</h3></div>
        <div className="incident-priority-list">
          {priorityCommunities.map(community => {
            return <button className="incident-priority-row" key={community.id} onClick={() => onSelectCommunity(community.id)}>
              <span className="priority-community-symbol"><MapSymbol name="community" /></span>
              <span><strong>{community.name}</strong><small>{t(...community.desc)}</small></span>
            </button>;
          })}
        </div>
        <button className="text-button incident-all-communities" onClick={onOpenCommunities}>{t('Danh sách địa bàn', 'Community list')} ({communities.length})</button>
      </section>
      <section className="workflow-section incident-data-summary">
        <dl>
          <div><dt>{t('Kích hoạt', 'Triggered')}</dt><dd><time dateTime={incident.triggeredAt}>{localClock(incident.triggeredAt)}</time></dd></div>
          <div><dt>{t('Dữ liệu đến', 'Data as of')}</dt><dd><time dateTime={asOf}>{localClock(asOf)}</time> <small>UTC+7</small></dd></div>
        </dl>
        <div className="incident-detail-actions">
          <button className="text-button" onClick={onOpenTimeline}>{t('Diễn biến phân tích', 'Analysis timeline')}</button>
          <button className="text-button" onClick={onOpenData}>{t('Nguồn dữ liệu', 'Data sources')}</button>
        </div>
      </section>
    </div>
  </>;
}
