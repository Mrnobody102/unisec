import {communitiesForHazard,roadHazardIds,roadsForHazard} from '../../features/incident/roadHazards';
import type { GeometryRecord } from '../../geo/vector/types';
import { landslideAreaOf } from '../../features/landslides/landslideAreas';
import { areaLabel } from '../../features/landslides/areaLabels';
import { editsFor, type ScenarioEdit } from '../../features/access/scenarioEdits';
import { EditableTitle } from '../../shared/ui/EditableTitle';
import React, { useId, useRef, useState } from 'react';
import { ChoiceGroup } from '../../shared/ui/ChoiceGroup';
import type {
  RoadStatus,
  Community,
  AnalysisArea,
  Hazard,
  IncidentEvidence,
  Locale,
  RoadSegment,
  ScenarioRoutePair,
  ResponseSite
} from '../../types/dear';
import { UiIcon } from './UiIcon';
import { StatusText } from '../../shared/ui/StatusText';
import { areaM2, withinArea } from '../../terrain/areaGeometry';
import { EvidenceMetadata } from '../../features/incident/EvidenceMetadata';
import { evidencePresentation } from '../../features/incident/evidencePresentation';
import { roadStatusIcon, roadStatusLabels, roadStatusShortLabels, roadStatusTone } from '../../features/routes/roadStatus';
import { nearestRoadAnchor } from '../../features/routes/selectedRoadJourney';
import { observationTime } from '../../features/incident/sourceTime';
import { CommunityImpactRow, KeyFacts, peopleText } from './DetailFacts';
import { workStatusText, type WorkStatus } from '../../features/incident/responseWork';
import { findingAddsDetail } from '../../features/incident/findingPresentation';
import '../../features/geodata/scenario-card.css';

type Props = {
  objectId: string;
  aoi: AnalysisArea;
  parentName?: string;
  locale: Locale;
  roads: RoadSegment[];
  hazards: Hazard[];
  evidence: IncidentEvidence[];
  communities: Community[];
  responseSites: ResponseSite[];
  routes: Map<string, ScenarioRoutePair>;
  hasTerrainProfile: boolean;
  profileOpen: boolean;
  onToggleProfile: () => void;
  onBack: () => void;
  onSelectCommunity: (id: string, routeType?: 'candidate' | 'direct', sectionId?: string) => void;
  onOpenEvidence: (id: string) => void;
  onSelectObject: (id: string) => void;
  onOpenPriority: () => void;

  onRenameRoad?: (id: string, names: [string, string]) => boolean;
  /** Present when the viewer may change road status here; returns false when not saved. */
  onSetRoadStatus?: (road: RoadSegment, status: RoadStatus, note: string) => boolean;
  onRevertEdit?: (editId: string) => boolean;
  /** The road's open verification task, if any. */
  verification?: { taskId: string; status: WorkStatus; owner: string };
  onOpenWork?: (taskId: string) => void;
  /** Manual scenario edits, to show who last changed a road's status. */
  scenarioEdits?: ScenarioEdit[];
  mappedAreas?: GeometryRecord[];
  onOpenMappedArea?: (id: string) => void;
};

const distanceText = (meters: number) => meters < 1000 ? `${Math.max(10, Math.round(meters / 10) * 10)} m` : `${(meters / 1000).toFixed(1)} km`;

export const ObjectDetailView: React.FC<Props> = ({
  onRenameRoad,
  onSetRoadStatus,
  onRevertEdit,
  verification,
  onOpenWork,
  scenarioEdits = [],
  objectId,
  aoi,
  parentName,
  locale,
  roads,
  hazards,
  evidence,
  communities,
  responseSites,
  routes,
  hasTerrainProfile,
  profileOpen,
  onToggleProfile,
  onBack,
  onSelectCommunity,
  onOpenEvidence,
  onSelectObject,
  onOpenPriority
  , mappedAreas = [], onOpenMappedArea
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);
  // A status change is a decision: it needs a reason, like the same change in GIS.
  // Keyed by object so a half-entered change never carries over to another selection.
  const statusRef = useRef<HTMLDivElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const reasonErrorId = useId();
  const restoreStatusFocus = () => requestAnimationFrame(() => statusRef.current?.querySelector<HTMLButtonElement>('[data-road-status-edit]')?.focus());
  const [change, setChange] = useState<{ objectId: string; status: RoadStatus; note: string; error?: string } | null>(null);
  const pending = change?.objectId === objectId ? change : null;
  const [failedFor, setFailedFor] = useState<string | null>(null);

  const [kind, id] = objectId.split(':');

  const road = kind === 'road' ? roads.find((r) => r.id === id) : undefined;
  const hazard = kind === 'hazard' ? hazards.find((h) => h.id === id) : undefined;
  const linkedHazards = road ? hazards.filter(item=>roadHazardIds(road).includes(item.id)) : [];
  const relatedHazard=linkedHazards[0];
  const roadRecord = road ? evidence.find(item=>roadHazardIds(road).includes(item.hazardId)) : undefined;
  const hazardRecord = hazard ? evidence.find(item => item.hazardId === hazard.id) : undefined;
  const affectedRoads = hazard ? roadsForHazard(roads,hazard.id) : [];
  // Communities named in the hazard's findings, or reached through a road it affects.
  const hazardCommunities = hazard ? communitiesForHazard(communities, routes, hazard.id) : [];
  const nearestAnchor = hazard && !affectedRoads.length ? nearestRoadAnchor(roads, hazard.projected, 2000) : null;
  const nearestRoad = nearestAnchor && { road: roads.find(item => item.id === nearestAnchor.roadId)!, distance: nearestAnchor.distance };
  const site = kind === 'poi' ? responseSites.find(item => item.id === id) : undefined;
  const affectedCommunities = road ? communities.filter(community => {
    const pair = routes.get(community.id);
    return [pair?.candidate, pair?.direct].some(route => route?.segs.some(segment => segment.id === road.id));
  }) : [];
  const observation = roadRecord ? t(...roadRecord.finding) : road?.note ? t(...road.note).replace(/^(Tin|Report at) \d{2}:\d{2}:\s*/i, '') : null;
  const roadObservation = observation ? observation[0].toLocaleUpperCase() + observation.slice(1) : null;
  const statusEdit = road ? editsFor(scenarioEdits, 'road', road.id).find(item => item.change.kind === 'status') : undefined;

  let title = id;
  if (kind === 'road' && road) title = t(road.name[0], road.name[1]);
  else if (kind === 'hazard' && hazard) title = t(hazard.name[0], hazard.name[1]);
  else if (site) title = t(site.name[0], site.name[1]);
  else if (kind === 'aoi' && id === aoi.id) title = t(...aoi.name);

  return (
    <>
      <div className="sidebar-top">
        {parentName && <button className="text-button back panel-parent" onClick={onBack}>
          <UiIcon name="back" size={16} /> {parentName}
        </button>}
        <div className="detail-title">{road ? <EditableTitle key={objectId} id="object-title" title={title} names={road.name} locale={locale} onRename={onRenameRoad && (names => onRenameRoad(road.id, names))} /> : <h1 id="object-title">{title}</h1>}<button className="icon-button panel-close" onClick={onBack} aria-label={t('Đóng chi tiết đối tượng', 'Close feature details')} title={t('Đóng chi tiết đối tượng', 'Close feature details')}><UiIcon name="close" /></button></div>
        {road && <div className="detail-priority detail-meta"><StatusText tone={road.status === 'blocked' ? 'critical' : road.status === 'uncertain' ? 'warning' : 'neutral'} icon={road.status === 'blocked' ? 'blocked' : road.status === 'uncertain' ? 'uncertain' : undefined}>{t(...roadStatusLabels[road.status])}</StatusText><span>{road.len} km</span></div>}
      </div>

      <div className="sidebar-scroll">
        {kind === 'aoi' && <>
          {(() => {
            const inside = communities.filter(community => withinArea(community.projected, aoi.points));
            const blocked = roads.filter(road => road.status === 'blocked').length, uncertain = roads.filter(road => road.status === 'uncertain').length;
            return <KeyFacts items={[
              { label: t('Diện tích', 'Area'), value: `${(areaM2(aoi.points) / 1000000).toFixed(1)} km²` },
              { label: t('Thôn, bản', 'Communities'), value: inside.length },
              { label: t('Dân cư', 'Residents'), value: t(`${inside.reduce((sum, c) => sum + c.hh, 0)} hộ · ${inside.reduce((sum, c) => sum + c.pop, 0)} người`, `${inside.reduce((sum, c) => sum + c.hh, 0)} households · ${inside.reduce((sum, c) => sum + c.pop, 0)} people`) },
              { label: t('Đoạn bị chặn', 'Blocked sections'), value: blocked, tone: blocked ? 'critical' : undefined },
              { label: t('Cần xác minh', 'To verify'), value: uncertain, tone: uncertain ? 'warning' : undefined }
            ]}/>;
          })()}
          <section className="workflow-section area-action">
            <button className="button primary" onClick={onOpenPriority}>{t('Xem địa bàn trong vùng', 'View communities in area')}</button>
          </section>
          <details className="object-reference"><summary>{t('Nguồn ranh giới', 'Boundary source')}</summary><p>{t(...aoi.source)}</p></details>
        </>}
        {kind === 'road' && road && (
          <>
            {roadObservation && <section className="object-observation">
              {roadRecord && <h3>{evidencePresentation(roadRecord.type, locale).kind}</h3>}
              <p>{roadObservation}</p>
              {roadRecord ? <details className="object-evidence-details"><summary><time dateTime={roadRecord.observedAt}>{evidencePresentation(roadRecord.type, locale).observed} {observationTime(roadRecord.observedAt,locale)}</time></summary><EvidenceMetadata evidence={roadRecord} locale={locale} className="observation-times" showSource={false} showObserved={false}/></details>
                : relatedHazard && <p className="observation-meta metadata-line"><span>{t(...relatedHazard.src)}</span><time>{relatedHazard.detected}</time></p>}
              {roadRecord && <button className="text-button evidence-open" onClick={() => onOpenEvidence(roadRecord.hazardId)}>{evidencePresentation(roadRecord.type, locale).action}<UiIcon name="next" size={14}/></button>}
            </section>}
            {(onSetRoadStatus || verification || statusEdit) && <section ref={statusRef} className="workflow-section detail-next">
              {onSetRoadStatus && pending && <div className="road-status-switch">
                <ChoiceGroup label={t('Tình trạng đường', 'Road status')}
                  options={(['open', 'uncertain', 'blocked'] as const).map(value => ({value, label:t(...roadStatusShortLabels[value])}))}
                  value={pending?.status ?? road.status}
                  onChange={status => setChange({objectId, status, note:pending?.note ?? ''})}/>
              </div>}
              {pending && onSetRoadStatus && <form className="road-status-change" onSubmit={event => {
                event.preventDefault();
                if (!pending.note.trim()) { setChange({ ...pending, error: t('Ghi lý do thay đổi.', 'Add a reason for the change.') }); reasonRef.current?.focus(); return; }
                if (onSetRoadStatus(road, pending.status, pending.note.trim())) { setChange(null); restoreStatusFocus(); }
                else setChange({ ...pending, error: t('Không lưu được thay đổi.', 'Could not save the change.') });
              }}>
                <label>{t('Lý do', 'Reason')}
                  <textarea ref={reasonRef} name="roadStatusReason" rows={2} maxLength={2000} value={pending.note} aria-invalid={!!pending.error} aria-describedby={pending.error ? reasonErrorId : undefined}
                    onChange={event => setChange({ ...pending, note: event.target.value, error: undefined })}/>
                </label>
                {pending.error && <p id={reasonErrorId} className="road-status-error" role="alert">{pending.error}</p>}
                <div className="road-status-actions">
                  <button className="button primary" type="submit" disabled={pending.status === road.status}>{t('Lưu', 'Save')}</button>
                  <button className="button" type="button" onClick={() => { setChange(null); restoreStatusFocus(); }}>{t('Hủy', 'Cancel')}</button>
                </div>
              </form>}
              {verification && !pending && <button className="object-row impact-row verification-row" onClick={() => onOpenWork?.(verification.taskId)}>
                <span><strong>{t('Xác minh khả năng đi qua', 'Verify passage')}</strong><small>{verification.owner || t('Chưa có người phụ trách', 'No owner yet')}</small></span>
                <StatusText tone={verification.status === 'blocked' ? 'critical' : verification.status === 'pending' ? 'warning' : 'neutral'}>{t(...workStatusText[verification.status])}</StatusText>
              </button>}
              {onSetRoadStatus && !pending && <button type="button" className="button road-status-edit-trigger" data-road-status-edit onClick={() => { setChange({objectId,status:road.status,note:''}); requestAnimationFrame(() => statusRef.current?.querySelector<HTMLInputElement>('input:checked')?.focus()); }}><UiIcon name="edit" size={16}/>{t('Cập nhật tình trạng', 'Update road status')}</button>}
              {failedFor === objectId && <p className="road-status-error" role="alert">{t('Không lưu được thay đổi.', 'Could not save the change.')}</p>}
              {!pending && (() => {
                const edit = statusEdit;
                if (edit?.change.kind !== 'status') return null;
                // A later field report can supersede the edit; then it is history, not something to undo.
                const effective = road.status === edit.change.to;
                return (
                  <div className="manual-edit-note">
                    <UiIcon name="edit" size={14} />
                    <span>
                      <strong>{t(...roadStatusShortLabels[edit.change.from])} → {t(...roadStatusShortLabels[edit.change.to])}</strong>
                      <small>{edit.author.name}, {new Date(edit.at).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}{edit.reverts && t(' (hoàn tác)', ' (undo)')}</small>
                      {edit.note && <em>{edit.note}</em>}
                    </span>
                    {onRevertEdit && effective && <button type="button" className="text-button" onClick={() => setFailedFor(onRevertEdit(edit.id) ? null : objectId)}>{t('Hoàn tác', 'Undo')}</button>}
                  </div>
                );
              })()}
            </section>}
            {linkedHazards.length > 0 && <section className="workflow-section">
              <h3>{t('Sự cố liên quan', 'Related incidents')}</h3>
              {linkedHazards.map(hazard => <button key={hazard.id} className="object-row related-incident-row" onClick={() => onSelectObject(`hazard:${hazard.id}`)}><strong>{t(...hazard.name)}</strong><UiIcon name="next" size={16}/></button>)}
            </section>}
            {affectedCommunities.length > 0 && <section className="workflow-section">
              <h3>{t('Thuộc tuyến', 'Related routes')}</h3>
              {affectedCommunities.flatMap(community => {
                const pair = routes.get(community.id);
                return [pair?.candidate, pair?.direct].filter(route => route?.segs.some(segment => segment.id === road.id)).map(route => route && <button key={community.id + route.type} className="object-row linked-row" onClick={() => onSelectCommunity(community.id, route.type, road.id)}>
                  <span><strong>{t(...route.name)}</strong><small>{t('Đến', 'To')} {community.name} · {peopleText(community, locale)}</small></span><UiIcon name="next" size={16}/>
                </button>);
              })}
            </section>}
            {mappedAreas.some(r => landslideAreaOf(r)?.roadLinks.some(l => l.roadId === road.id)) && <section className="workflow-section"><h3>{t('Vùng sạt lở liên quan', 'Linked landslide areas')}</h3>{mappedAreas.filter(r => landslideAreaOf(r)?.roadLinks.some(l => l.roadId === road.id)).map(record => {
              const value=landslideAreaOf(record)!, link=value.roadLinks.find(l=>l.roadId===road.id)!;
              return <button className="object-row" key={record.id} onClick={() => onOpenMappedArea?.(record.id)}><span><strong>{record.name}</strong><small>{areaLabel(value.state,locale)}{link.fromM!==undefined?` · ${link.fromM}–${link.toM} m`:''}</small></span><UiIcon name="next" size={16}/></button>;
            })}</section>}
            <div className="object-profile-tools">
              <button className="button road-profile-action" disabled={!hasTerrainProfile} aria-pressed={profileOpen} onClick={onToggleProfile} title={!hasTerrainProfile ? t('Chưa có dữ liệu độ cao cho đoạn đường này', 'No elevation data for this road section') : undefined}><UiIcon name="profile" size={16}/>{t('Mặt cắt địa hình', 'Elevation profile')}</button>
            </div>
          </>
        )}

        {kind === 'hazard' && hazard && (
          <section className="hazard-detail">
            <div className="detail-meta"><StatusText tone={affectedRoads.some(item => item.status === 'blocked') ? 'critical' : 'warning'} icon={affectedRoads.some(item => item.status === 'blocked') ? 'blocked' : 'uncertain'}>
              {affectedRoads.some(item => item.status === 'blocked') ? t('Có đoạn đường bị chặn', 'Related road section blocked') : hazard.kind === 'landslide'
                ? hazard.observation === 'reported' ? t('Có báo cáo sạt lở', 'Landslide reported from field')
                  : verification?.status === 'done' ? t('Đã kiểm tra, chưa xác nhận sạt lở', 'Checked, landslide not confirmed') : t('Nghi sạt lở, chưa kiểm chứng', 'Suspected landslide, unverified')
                : hazard.kind === 'bridge' ? t('Cầu cần xác minh', 'Bridge to verify')
                : hazard.kind === 'crossing' ? t('Điểm vượt khe cần xác minh', 'Gully crossing to verify')
                : t('Nghi ngập', 'Flood indication')}
            </StatusText></div>
            <KeyFacts items={[
              ...(hazard.area != null && (hazard.kind === 'landslide' || hazard.kind === 'flood') ? [{ label: t('Diện tích ước tính', 'Estimated area'), value: `${hazard.area} ha` }] : []),
              { label: hazardRecord ? evidencePresentation(hazardRecord.type, locale).observed : t('Ghi nhận', 'Observed'),
                value: hazardRecord ? observationTime(hazardRecord.observedAt, locale) : hazard.detected },
              { label: t('Nguồn', 'Source'), value: t(...hazard.src) }
            ]}/>
            {verification && <button className="object-row impact-row verification-row" onClick={() => onOpenWork?.(verification.taskId)}>
              <span><strong>{t('Kiểm chứng tại hiện trường', 'Verify on site')}</strong><small>{verification.owner || t('Chưa có người phụ trách', 'No owner yet')}</small></span>
              <StatusText tone={verification.status === 'blocked' ? 'critical' : verification.status === 'pending' ? 'warning' : 'neutral'}>{t(...workStatusText[verification.status])}</StatusText>
            </button>}
            <section className="workflow-section">
              <h3>{t('Ảnh hưởng', 'Impact')}</h3>
              {affectedRoads.map(item => <button className="object-row impact-row" key={item.id} onClick={() => onSelectObject(`road:${item.id}`)}><span><strong>{t(...item.name)}</strong><small>{item.len} km</small></span><StatusText tone={roadStatusTone(item.status)} icon={roadStatusIcon(item.status)}>{t(...roadStatusLabels[item.status])}</StatusText></button>)}
              {/* Not linked yet: the nearest road and its distance tell where to look first. */}
              {!affectedRoads.length && nearestRoad && <button className="object-row impact-row" onClick={() => onSelectObject(`road:${nearestRoad.road.id}`)}>
                <span><strong>{t(...nearestRoad.road.name)}</strong><small>{t('Đường gần nhất', 'Nearest road')} · {distanceText(nearestRoad.distance)}</small></span>
                <StatusText tone={roadStatusTone(nearestRoad.road.status)} icon={roadStatusIcon(nearestRoad.road.status)}>{t(...roadStatusLabels[nearestRoad.road.status])}</StatusText>
              </button>}
              {!affectedRoads.length && !nearestRoad && <p className="detail-empty">{t('Chưa gắn với đoạn đường nào.', 'Not linked to a road section.')}</p>}
              {hazardCommunities.map(community => <CommunityImpactRow key={community.id} community={community} locale={locale} onSelect={() => onSelectCommunity(community.id)}/>)}
            </section>
            <section className="workflow-section">
              <h3>{t('Căn cứ', 'Evidence')}</h3>
              {hazardRecord && findingAddsDetail(title, t(...hazardRecord.finding)) && <p className="hazard-observation">{t(...hazardRecord.finding)}</p>}
              {hazardRecord && <p className="evidence-limitation"><UiIcon name="uncertain" size={14}/><span>{t(...hazardRecord.limitation)}</span></p>}
              <div className="detail-actions"><button className="button" onClick={() => onOpenEvidence(hazard.id)}><UiIcon name="info" size={16}/>{hazardRecord ? evidencePresentation(hazardRecord.type, locale).action : t('Xem chi tiết', 'View details')}</button></div>
            </section>
          </section>
        )}

        {kind === 'poi' && site && site.kind === 'hlz' && (
          <section className="site-detail">
            <KeyFacts items={[
              { label: t('Đánh giá', 'Assessment'), value: site.assessment === 'assessed' ? t('Đã khảo sát', 'Assessed') : site.assessment === 'unavailable' ? t('Không sử dụng', 'Unavailable') : t('Đề xuất, chưa khảo sát', 'Proposed, not surveyed'),
                tone: site.assessment === 'candidate' ? 'warning' : site.assessment === 'unavailable' ? 'critical' : undefined },
              { label: t('Cập nhật', 'Updated'), value: observationTime(site.observedAt, locale) },
              { label: t('Nguồn', 'Source'), value: t(...site.source) }
            ]}/>
            {/* Straight-line distance is what matters for a helicopter, not the road route. */}
            <section className="workflow-section">
              <h3>{t('Thôn gần nhất', 'Nearest communities')}</h3>
              {[...communities].sort((a, b) => Math.hypot(a.projected.x - site.projected.x, a.projected.y - site.projected.y) - Math.hypot(b.projected.x - site.projected.x, b.projected.y - site.projected.y))
                .slice(0, 3).map(community => <CommunityImpactRow key={community.id} community={community} locale={locale}
                  note={`${distanceText(Math.hypot(community.projected.x - site.projected.x, community.projected.y - site.projected.y))} ${t('đường chim bay', 'straight line')}`}
                  onSelect={() => onSelectCommunity(community.id)}/>)}
            </section>
          </section>
        )}
        {kind === 'poi' && site && site.kind === 'staging' && (() => {
          // Routes are computed from the primary staging point only.
          const primary = responseSites.find(item => item.kind === 'staging')?.id === site.id;
          const reachable = primary ? communities.filter(community => routes.get(community.id)?.candidate || routes.get(community.id)?.direct)
            .map(community => {
              const pair = routes.get(community.id)!, options = [pair.candidate, pair.direct].filter(route => route != null);
              const best = options.find(route => route.status === 'open') ?? options.find(route => route.status === 'uncertain') ?? options[0];
              return { community, route: best };
            }).sort((a, b) => a.community.prio - b.community.prio || a.community.name.localeCompare(b.community.name)) : [];
          const open = reachable.filter(item => item.route.status !== 'blocked').length;
          return <section className="site-detail">
            {primary && <KeyFacts items={[
              { label: t('Thôn có tuyến', 'Communities with a route'), value: reachable.length },
              { label: t('Chưa bị chặn', 'Not blocked'), value: open },
              { label: t('Bị chặn', 'Blocked'), value: reachable.length - open, tone: reachable.length - open ? 'critical' : undefined }
            ]}/>}
            {primary && <section className="workflow-section">
              <h3>{t('Tuyến từ điểm này', 'Routes from here')}</h3>
              {reachable.map(({ community, route }) => <CommunityImpactRow key={community.id} community={community} locale={locale}
                note={`${t(...roadStatusLabels[route.status])}${route.eta ? ` · ${route.eta.minMinutes}–${route.eta.maxMinutes} ${t('phút', 'min')}` : ''}`}
                onSelect={() => onSelectCommunity(community.id, route.type)}/>)}
            </section>}
            {!primary && <p className="detail-empty">{t('Tuyến tiếp cận đang tính từ điểm tập kết chính.', 'Access routes are calculated from the primary staging point.')}</p>}
          </section>;
        })()}

      </div>
    </>
  );
};
