import React from 'react';
import type {
  Community,
  DetailTab,
  Hazard,
  Locale,
  ScenarioRoute
} from '../../types/dear';
import { UiIcon } from './UiIcon';
import { StatusText } from '../../shared/ui/StatusText';
import { RouteOption } from '../../features/routes/RouteOption';
import type { ResponseAssessment } from '../../features/incident/responseAssessment';
import { communityAccessText } from '../../features/routes/accessAssessment';

type Props = {
  community: Community;
  assessment: ResponseAssessment;
  terrainCovered: boolean | null;
  hazards: Hazard[];
  locale: Locale;
  detailTab: DetailTab;
  onChangeDetailTab: (tab: DetailTab) => void;
  onBack: () => void;
  candidateRoute: ScenarioRoute | null;
  directRoute: ScenarioRoute | null;
  selectedRouteType: 'candidate' | 'direct';
  onChangeRouteType: (type: 'candidate' | 'direct') => void;
  hasTerrainProfile: boolean;
  onToggleProfile: () => void;
  onOpenSources: () => void;
  onSelectObject: (obj: string) => void;
  onExport: () => void;
};

export const CommunityDetailView: React.FC<Props> = ({
  community,
  assessment,
  terrainCovered,
  hazards,
  locale,
  detailTab,
  onChangeDetailTab,
  onBack,
  candidateRoute,
  directRoute,
  selectedRouteType,
  onChangeRouteType,
  hasTerrainProfile,
  onToggleProfile,
  onOpenSources,
  onSelectObject,
  onExport
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);
  const hazardName = (id: string) => {
    const hazard = hazards.find(item => item.id === id);
    return hazard ? t(hazard.name[0], hazard.name[1]) : id;
  };

  const effectiveRouteType = selectedRouteType === 'direct' && directRoute ? 'direct' : 'candidate';
  const activeRoute = effectiveRouteType === 'direct' ? directRoute : candidateRoute;
  const isBlocked = activeRoute?.status === 'blocked';
  const bothRoutesBlocked = directRoute?.status === 'blocked' && candidateRoute?.status === 'blocked';
  const accessIssues = [...new Map(
    [directRoute, candidateRoute].flatMap(route => route?.segs ?? [])
      .filter(segment => segment.status !== 'open')
      .map(segment => [segment.id, segment] as const)
  ).values()];

  const routeStateText = t(...communityAccessText({ direct: directRoute, candidate: candidateRoute }));

  const warningText = bothRoutesBlocked
    ? t('Cả hai tuyến đã biết đều có đoạn bị chặn. Cần tìm phương án khác.', 'Both mapped routes contain blocked sections. Find another access option.')
    : isBlocked
    ? directRoute && effectiveRouteType === 'direct'
      ? t('Tuyến này có đoạn bị chặn. Chọn tuyến khác để so sánh.', 'This route contains a blocked section. Select another route to compare.')
      : t('Tuyến có đoạn bị chặn. Cần xác minh phương án khác.', 'Route contains a blocked section. Verify another access option.')
    : activeRoute?.segs.some((s) => s.cls === 'track')
    ? t('Đường mòn, chưa xác minh khả năng xe đi qua.', 'Mountain track. Vehicle access unverified.')
    : activeRoute?.segs.some(s => hazards.find(h => h.id === s.hz)?.kind === 'crossing')
    ? t('Điểm vượt khe chưa rõ tình trạng. Cần kiểm tra trước khi sử dụng tuyến.', 'Gully crossing condition unknown. Verify before using this route.')
    : activeRoute?.segs.some(s => hazards.find(h => h.id === s.hz)?.kind === 'bridge')
    ? t('Có tin báo ngập cầu. Chưa xác minh khả năng đi qua.', 'Bridge reported flooded. Passability unverified.')
    : t('Chưa có xác minh khả năng đi qua toàn tuyến.', 'Full route passability is unverified.');

  return (
    <>
      <div className="sidebar-top">
        <div className="detail-title">
          <h1 id="place-title">{community.name}</h1>
          <button className="icon-button panel-close" onClick={onBack} aria-label={t('Đóng chi tiết địa bàn', 'Close community details')} title={t('Đóng chi tiết địa bàn', 'Close community details')}><UiIcon name="close" /></button>
        </div>
        <div className="detail-priority">
          <StatusText tone={community.prio === 1 ? 'critical' : 'neutral'} icon={community.prio === 1 ? 'priority' : undefined}>
            {community.prio === 1 ? t('Ưu tiên cao', 'High priority') : t('Theo dõi', 'Monitor')}
          </StatusText>
        </div>

        {detailTab === 'decision' && assessment.access !== 'unmapped' && <p className="sidebar-intro">{t(...assessment.reason)}</p>}

        <div className="decision-tabs" role="group">
          <button
            aria-pressed={detailTab === 'decision'}
            onClick={() => onChangeDetailTab('decision')}
          >
            {t('Tiếp cận', 'Access')}
          </button>
          <button
            aria-pressed={detailTab === 'route'}
            onClick={() => onChangeDetailTab('route')}
          >
            {t('Tuyến', 'Route')}
          </button>
          <button
            aria-pressed={detailTab === 'evidence'}
            onClick={() => onChangeDetailTab('evidence')}
          >
            {t('Căn cứ', 'Evidence')}
          </button>
        </div>
      </div>

      <div className="sidebar-scroll">
        {detailTab === 'decision' && (
          <div>
            <div className="decision-overview">
              <div>
                <small>{t('Các tuyến đã biết', 'Mapped access routes')}</small>
                <strong>{routeStateText}</strong>
              </div>
            </div>

            {activeRoute ? <div className="decision-route">
              <div className="section-line">
                <h3>
                  {t('Tuyến đang xem', 'Selected route')}
                </h3>
                <StatusText tone={isBlocked ? 'critical' : 'warning'} icon={isBlocked ? 'blocked' : 'uncertain'}>
                  {isBlocked ? t('Bị chặn', 'Blocked') : t('Cần xác minh', 'Verify access')}
                </StatusText>
              </div>

              <strong>{t(activeRoute.name[0], activeRoute.name[1])}</strong>
              <p className="route-summary-distance">{activeRoute.lengthKm} km {t('từ điểm tập kết Nậm Kha', 'from Nậm Kha staging point')}</p>
              {activeRoute.eta && <p className="route-travel-estimate">{activeRoute.eta.minMinutes} {t('đến', 'to')} {activeRoute.eta.maxMinutes} {t('phút', 'min')}<small>{t('Giả định thông tuyến', 'Assuming passage')}</small></p>}
            </div> : null}

            <p className="assessment-action"><strong>{t('Việc cần xử lý', 'Next action')}</strong><span>{t(...assessment.nextAction)}</span></p>
            <div className="decision-actions"><button
              className="button primary"
              onClick={() => onChangeDetailTab(activeRoute ? 'route' : 'evidence')}
            >
              {activeRoute ? t('Xem các tuyến', 'Review routes') : t('Xem thông tin địa bàn', 'Review community findings')}
            </button>
            <button className="button decision-save" onClick={onExport}><UiIcon name="download"/>{t('Lưu đánh giá', 'Save assessment')}</button></div>

            {accessIssues.length > 0 && <section className="access-issues" aria-label={t('Đoạn ảnh hưởng tiếp cận', 'Access constraints')}>
              <h3>{t('Đoạn đường cần lưu ý', 'Road sections to review')}</h3>
              {accessIssues.map(segment => {
                const hazard = hazards.find(item => item.id === segment.hz);
                return <button key={segment.id} className="object-row impact-row" onClick={() => onSelectObject(`road:${segment.id}`)}>
                  <span>
                    <strong>{t(segment.name[0], segment.name[1])}</strong>
                    {hazard && <small><time>{hazard.detected.split(' ')[0]}</time></small>}
                  </span>
                  <StatusText tone={segment.status === 'blocked' ? 'critical' : 'warning'} icon={segment.status === 'blocked' ? 'blocked' : 'uncertain'}>
                    {segment.status === 'blocked' ? t('Bị chặn', 'Blocked') : t('Chưa rõ', 'Uncertain')}
                  </StatusText>
                </button>;
              })}
            </section>}

          </div>
        )}

        {detailTab === 'route' && !activeRoute && (
          <section className="workflow-section route-empty">
            <h3>{t('Chưa có tuyến để đánh giá', 'No mapped access route')}</h3>
            <p>{t(...assessment.nextAction)}</p>
            <button className="text-button" onClick={() => onChangeDetailTab('evidence')}>{t('Xem thông tin địa bàn', 'Review community findings')}</button>
          </section>
        )}

        {detailTab === 'route' && candidateRoute && activeRoute && (
          <div>
            <div className="route-origin">
              {t('Xuất phát từ điểm tập kết Nậm Kha', 'Starting from Nậm Kha staging point')}
            </div>

            <div className="route-options" role="group" aria-label={t('Chọn tuyến tiếp cận', 'Select access route')}>
              <RouteOption route={candidateRoute} selected={effectiveRouteType === 'candidate'} locale={locale} onSelect={() => onChangeRouteType('candidate')} />
              {directRoute && <RouteOption route={directRoute} selected={effectiveRouteType === 'direct'} locale={locale} onSelect={() => onChangeRouteType('direct')} />}
            </div>

            <p className={`route-caution ${isBlocked ? 'is-blocked' : ''}`}>
              {warningText}
            </p>
            {activeRoute.eta && <p className="route-estimate-basis">{activeRoute.eta.mode === 'foot' ? t('Ước tính đi bộ, 3 đến 5 km/h.', 'Walking estimate, 3 to 5 km/h.') : t('Ước tính xe bán tải 4x4 theo tốc độ giả định của bộ dữ liệu.', '4WD pickup estimate using dataset speed assumptions.')} {t('Chưa tính thời gian dừng kiểm tra.', 'Inspection stops are not included.')}</p>}

            <div className="route-tools">
              <button
                className="button soft"
                style={{ flex: 1 }}
                onClick={onToggleProfile}
                disabled={!hasTerrainProfile}
                title={!hasTerrainProfile ? t('Chưa có dữ liệu độ cao cho mặt cắt này', 'Elevation data is unavailable for this section') : undefined}
              >
                <UiIcon name="profile" size={18}/>
                <span>{t('Mặt cắt địa hình', 'Terrain section')}</span>
              </button>
              <button className="button decision-save" onClick={onExport} aria-label={t('Lưu đánh giá', 'Save assessment')} title={t('Lưu đánh giá', 'Save assessment')}><UiIcon name="download"/></button>
            </div>

            <section className="workflow-section" style={{ marginTop: '16px' }}>
              <h3>{t('Các đoạn trên tuyến', 'Route segments')}</h3>
              {activeRoute.segs.map((seg) => (
                <button
                  key={seg.id}
                  className="object-row impact-row"
                  onClick={() => onSelectObject(`road:${seg.id}`)}
                >
                  <span>
                    <strong>{t(seg.name[0], seg.name[1])}</strong>
                    <small>
                      {seg.len} km
                    </small>
                  </span>
                  <StatusText tone={seg.status === 'blocked' ? 'critical' : seg.status === 'uncertain' ? 'warning' : 'neutral'} icon={seg.status === 'blocked' ? 'blocked' : seg.status === 'uncertain' ? 'uncertain' : undefined}>
                    {seg.status === 'blocked'
                      ? t('Bị chặn', 'Blocked')
                      : seg.status === 'uncertain'
                      ? t('Chưa rõ', 'Uncertain')
                      : t('Chưa ghi nhận chặn', 'No blockage reported')}
                  </StatusText>
                </button>
              ))}
            </section>
          </div>
        )}

        {detailTab === 'evidence' && (
          <div>
            <section className="assessment-basis">
              <h3>{t('Căn cứ đánh giá', 'Assessment basis')}</h3>
              <dl className="community-reference">
                <div><dt>{assessment.priority === 1 ? t('Lý do ưu tiên', 'Priority basis') : t('Lý do theo dõi', 'Monitoring basis')}</dt><dd>{t(...assessment.reason)}</dd></div>
              </dl>
              <button className="text-button" onClick={onOpenSources}>{t('Phương pháp và nguồn dữ liệu', 'Method and data sources')}</button>
            </section>
            <dl className="community-reference">
              <div><dt>{t('Dân số tham chiếu', 'Baseline population')}</dt><dd>{community.pop} {t('người', 'residents')}, {community.hh} {t('hộ', 'households')}</dd></div>
              <div><dt>{t('Địa hình tại địa bàn', 'Local terrain')}</dt><dd>{terrainCovered === false ? t('Ngoài phạm vi DEM', 'Outside DEM coverage') : terrainCovered === true ? t('Có dữ liệu độ cao', 'Elevation data available') : t('Chưa đánh giá', 'Not assessed')}</dd></div>
            </dl>
            <section className="workflow-section" style={{ borderTop: 0 }}>
              <div className="section-line">
                <h3>{t('Thông tin tại địa bàn', 'Community findings')}</h3>
              </div>
              {community.facts.map((f, i) => (
                <div key={i} className="fact">
                  <div>{t(f[0], f[1])}</div>
                  <small style={{ color: 'var(--ws-muted)' }}>{t(f[2], f[3])}</small>
                </div>
              ))}
            </section>

            {accessIssues.length > 0 && <section className="workflow-section">
              <h3>{t('Báo cáo ảnh hưởng tiếp cận', 'Access impact reports')}</h3>
              {accessIssues
                .filter((s) => s.hz)
                .map((seg) => (
                  <button
                    key={seg.id}
                    className="object-row"
                    onClick={() => onSelectObject(`road:${seg.id}`)}
                  >
                    <span>
                      <strong>{hazardName(seg.hz!)}</strong>
                      <small>{t(seg.name[0], seg.name[1])}</small>
                    </span>
                    <StatusText tone={seg.status === 'blocked' ? 'critical' : 'warning'} icon={seg.status === 'blocked' ? 'blocked' : 'uncertain'}>
                      {seg.status === 'blocked' ? t('Bị chặn', 'Blocked') : t('Cần xác minh', 'Uncertain')}
                    </StatusText>
                  </button>
                ))}
            </section>}
          </div>
        )}
      </div>
    </>
  );
};
