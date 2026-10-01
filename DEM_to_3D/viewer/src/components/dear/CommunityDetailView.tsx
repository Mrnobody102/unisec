import React from 'react';
import type {
  Community,
  DetailTab,
  Locale,
  ScenarioRoute
} from '../../types/dear';

type Props = {
  community: Community;
  locale: Locale;
  detailTab: DetailTab;
  onChangeDetailTab: (tab: DetailTab) => void;
  onBack: () => void;
  candidateRoute: ScenarioRoute;
  directRoute: ScenarioRoute | null;
  selectedRouteType: 'candidate' | 'direct';
  onChangeRouteType: (type: 'candidate' | 'direct') => void;
  onToggleProfile: () => void;
  onOpenSources: () => void;
  onSelectObject: (obj: string) => void;
};

export const CommunityDetailView: React.FC<Props> = ({
  community,
  locale,
  detailTab,
  onChangeDetailTab,
  onBack,
  candidateRoute,
  directRoute,
  selectedRouteType,
  onChangeRouteType,
  onToggleProfile,
  onOpenSources,
  onSelectObject
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  const activeRoute = selectedRouteType === 'direct' && directRoute ? directRoute : candidateRoute;
  const isBlocked = activeRoute.status === 'blocked';
  const isUncertain = activeRoute.status === 'uncertain';

  const routeStateText = isBlocked
    ? t('Có đoạn bị chặn', 'Contains a blocked section')
    : isUncertain
    ? t('Cần xác minh', 'Verification needed')
    : t('Chưa xác minh toàn tuyến', 'Full route unverified');

  const warningText = isBlocked
    ? directRoute && selectedRouteType === 'direct'
      ? t('Tuyến trực tiếp có điểm chặn sạt lở. Đang xem phương án tránh qua sườn núi.', 'Direct road is blocked by landslide. Review ridge route option.')
      : t('Tất cả phương án hiện tại đều bị chặn. Cần đánh giá mở tuyến mới với hiện trường.', 'All current options are blocked. Coordinate alternative access with field teams.')
    : activeRoute.segs.some((s) => s.cls === 'track')
    ? t('Tuyến đi qua đường mòn đồi núi. Cần xác minh khả năng phương tiện cơ giới đi qua.', 'Route includes mountain tracks. Verify 4WD vehicle clearance.')
    : t('Xác minh các đoạn chưa rõ hoặc ngập tràn trước khi điều động phương tiện.', 'Verify uncertain crossings or bridge flood levels prior to vehicle dispatch.');

  return (
    <>
      <div className="sidebar-top">
        <button className="text-button back" onClick={onBack}>
          ← {t('Địa bàn cần chú ý', 'Communities')}
        </button>

        <div className="detail-title">
          <h1 id="place-title">{community.name}</h1>
          <span className={`tag ${community.prio === 1 ? 'danger' : 'warn'}`}>
            {community.prio === 1 ? t('Ưu tiên cao', 'High priority') : t('Theo dõi', 'Monitor')}
          </span>
        </div>

        <p className="sidebar-intro">{t(community.desc[0], community.desc[1])}</p>

        <div className="decision-tabs" role="group">
          <button
            aria-pressed={detailTab === 'decision'}
            onClick={() => onChangeDetailTab('decision')}
          >
            {t('Tổng hợp', 'Summary')}
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
            {t('Nguồn', 'Sources')}
          </button>
        </div>
      </div>

      <div className="sidebar-scroll">
        {detailTab === 'decision' && (
          <div>
            <div className="decision-overview">
              <div>
                <small>{t('Tiếp cận', 'Access')}</small>
                <strong>{routeStateText}</strong>
              </div>
              <div>
                <small>{t('Dân số tham chiếu', 'Baseline population')}</small>
                <strong>
                  {community.pop} {t('người', 'residents')} / {community.hh} {t('hộ', 'households')}
                </strong>
              </div>
            </div>

            <div className="decision-route">
              <div className="section-line">
                <h3>
                  {isBlocked
                    ? t('Tuyến cần đánh giá lại', 'Route requires reassessment')
                    : selectedRouteType === 'candidate'
                    ? t('Tuyến đề xuất kiểm tra', 'Suggested route to verify')
                    : t('Tuyến đang xem', 'Selected route')}
                </h3>
                <span className={`tag ${isBlocked ? 'danger' : 'warn'}`}>
                  {isBlocked ? t('Bị chặn', 'Blocked') : t('Có điều kiện', 'Conditional')}
                </span>
              </div>

              <strong>{t('Từ điểm tập kết FOB Nậm Kha', 'From Nậm Kha FOB staging point')}</strong>

              <dl className="route-numbers">
                <div>
                  <dt>{t('Khoảng cách', 'Distance')}</dt>
                  <dd>{activeRoute.lengthKm} km</dd>
                </div>
                <div>
                  <dt>ETA</dt>
                  <dd>{t('Chưa xác định', 'Unknown')}</dd>
                </div>
              </dl>
            </div>

            <div className="decision-action">
              <strong>{t('Việc cần làm tiếp theo', 'Next action')}</strong>
              <p>
                {isBlocked
                  ? t(
                      'Đánh giá phương án khác với đầu mối hiện trường; không thể dùng tuyến này để điều phối.',
                      'Coordinate alternative routes with field focal points; cannot dispatch on this route.'
                    )
                  : t(
                      'Liên hệ đầu mối địa phương xác minh khả năng vượt khe và nhu cầu y tế khẩn cấp.',
                      'Contact commune focal point to verify crossing passability and urgent medical needs.'
                    )}
              </p>
            </div>

            <button
              className="button primary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => onChangeDetailTab('route')}
            >
              {t('Kiểm tra tuyến', 'Review route')} →
            </button>
          </div>
        )}

        {detailTab === 'route' && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--ws-muted)', marginBottom: '8px' }}>
              {t('Xuất phát từ điểm tập kết FOB Nậm Kha', 'Starting from Nậm Kha FOB staging point')}
            </div>

            <div className="route-options">
              <button
                className="route-card"
                aria-pressed={selectedRouteType === 'candidate'}
                onClick={() => onChangeRouteType('candidate')}
              >
                <strong>
                  {candidateRoute.status === 'blocked'
                    ? t('Tuyến sườn núi (Đã bị chặn)', 'Ridge Route (Now Blocked)')
                    : t('Tuyến đề xuất kiểm tra (PR-7)', 'Suggested Route (PR-7)')}
                </strong>
                <span className={`tag ${candidateRoute.status === 'blocked' ? 'danger' : 'warn'}`}>
                  {candidateRoute.status === 'blocked'
                    ? t('Bị chặn', 'Blocked')
                    : t('Có điều kiện', 'Conditional')}
                </span>
                <div className="route-bottom">
                  <span>{candidateRoute.lengthKm} km</span>
                  <span>{t('Đường đồi núi', 'Mountain road')}</span>
                </div>
              </button>

              {directRoute && (
                <button
                  className="route-card"
                  aria-pressed={selectedRouteType === 'direct'}
                  onClick={() => onChangeRouteType('direct')}
                >
                  <strong>{t('Đường chính NR-18 (Trực tiếp)', 'Direct Highway NR-18')}</strong>
                  <span className="tag danger">{t('Bị chặn tại LS-02', 'Blocked at LS-02')}</span>
                  <div className="route-bottom">
                    <span>{directRoute.lengthKm} km</span>
                    <span>{t('Đường nhựa', 'Paved road')}</span>
                  </div>
                </button>
              )}
            </div>

            <div
              className="notice"
              style={{
                background: isBlocked ? 'var(--critical-soft)' : 'var(--warning-soft)',
                color: isBlocked ? 'var(--critical-ink)' : 'var(--warning-ink)'
              }}
            >
              {warningText}
            </div>

            <div className="route-tools">
              <button
                className="button soft"
                style={{ flex: 1 }}
                onClick={onToggleProfile}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 20h18M5 16l4-8 5 6 5-10" />
                </svg>
                <span>{t('Mặt cắt địa hình 3D', '3D Terrain Profile')}</span>
              </button>
            </div>

            <section className="workflow-section" style={{ marginTop: '16px' }}>
              <h3>{t('Các đoạn cần lưu ý', 'Segments to review')}</h3>
              {activeRoute.segs.map((seg) => (
                <button
                  key={seg.id}
                  className="object-row"
                  onClick={() => onSelectObject(`road:${seg.id}`)}
                >
                  <span>
                    <strong>{t(seg.ref[0], seg.ref[1])}</strong>
                    <small>
                      {seg.id} · {seg.len} km {seg.hz ? `· ${seg.hz}` : ''}
                    </small>
                  </span>
                  <span
                    className={`tag ${
                      seg.status === 'blocked' ? 'danger' : seg.status === 'uncertain' ? 'warn' : ''
                    }`}
                  >
                    {seg.status === 'blocked'
                      ? t('Bị chặn', 'Blocked')
                      : seg.status === 'uncertain'
                      ? t('Chưa rõ', 'Uncertain')
                      : t('Thông', 'Open')}
                  </span>
                </button>
              ))}
            </section>
          </div>
        )}

        {detailTab === 'evidence' && (
          <div>
            <section className="workflow-section" style={{ borderTop: 0 }}>
              <h3>{t('Thông tin tại địa bàn', 'Community findings')}</h3>
              {community.facts.map((f, i) => (
                <div key={i} className="fact">
                  <div>{t(f[0], f[1])}</div>
                  <small style={{ color: 'var(--ws-muted)' }}>{t(f[2], f[3])}</small>
                </div>
              ))}
            </section>

            <section className="workflow-section">
              <div className="section-line">
                <h3>{t('Căn cứ tuyến tiếp cận', 'Route evidence')}</h3>
                <button className="text-button" onClick={onOpenSources}>
                  {t('Tất cả nguồn', 'All sources')}
                </button>
              </div>

              {activeRoute.segs
                .filter((s) => s.hz)
                .map((seg) => (
                  <button
                    key={seg.id}
                    className="object-row"
                    onClick={() => onSelectObject(`road:${seg.id}`)}
                  >
                    <span>
                      <strong>{seg.hz}</strong>
                      <small>{t(seg.ref[0], seg.ref[1])}</small>
                    </span>
                    <span className={`tag ${seg.status === 'blocked' ? 'danger' : 'warn'}`}>
                      {seg.status === 'blocked' ? t('Bị chặn', 'Blocked') : t('Cần xác minh', 'Uncertain')}
                    </span>
                    <span style={{ color: 'var(--ws-muted)' }}>↗</span>
                  </button>
                ))}
            </section>
          </div>
        )}
      </div>
    </>
  );
};
