import area from '@turf/area';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale, RoadSegment } from '../../types/dear';
import { roadStatusLabels } from '../routes/roadStatus';
import { formatArea } from '../geodata/geometryPresentation';
import { areaLabel } from './areaLabels';
import { landslideAreaOf } from './landslideAreas';
export function LandslideAreaSummary({ record, roads = [], locale, onRoad }: { record: GeometryRecord; roads?: RoadSegment[]; locale: Locale; onRoad?: (id: string) => void }): JSX.Element | null {
  const value = landslideAreaOf(record);
  if (!value) return null;
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  return <div className="landslide-area-summary">
    <p><strong>{areaLabel(value.state, locale)}</strong><br/>{areaLabel(value.review, locale)}</p>
    {value.basis && <p className="field-note">{value.basis}</p>}
    <dl className="field-metadata">
      <div><dt>{t('Phần khoanh', 'Mapped part')}</dt><dd>{areaLabel(value.part, locale)}</dd></div>
      <div><dt>{t('Diện tích', 'Area')}</dt><dd>≈ {formatArea(area(record.feature), locale)}</dd></div>
      <div><dt>{t('Nguồn', 'Sources')}</dt><dd>{value.sources.map(s => areaLabel(s, locale)).join(', ') || t('Chưa bổ sung', 'Not supplied')}</dd></div>
      <div><dt>{t('Thời điểm tư liệu', 'Evidence time')}</dt><dd>{value.observedAt ? new Date(value.observedAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB') : t('Chưa rõ', 'Unknown')}</dd></div>
      {value.imageReference && <div><dt>{t('Ảnh sử dụng', 'Imagery')}</dt><dd>{value.imageReference}{value.imageResolutionM ? ` (${value.imageResolutionM} m)` : ''}</dd></div>}
      <div><dt>{t('Sai số ranh giới', 'Boundary accuracy')}</dt><dd>{value.boundaryAccuracyM ? `±${value.boundaryAccuracyM} m` : t('Chưa đánh giá', 'Not assessed')}</dd></div>
      {value.reviewer && <div><dt>{t('Người rà soát', 'Reviewer')}</dt><dd>{value.reviewer}</dd></div>}
    </dl>
    {value.roadLinks.length > 0 && <section className="landslide-road-links"><h3>{t('Đoạn đường liên quan', 'Linked road sections')}</h3>{value.roadLinks.map(link => {
      const road = roads.find(r => r.id === link.roadId);
      return <div key={link.roadId}><strong>{road ? road.name[locale === 'vi' ? 0 : 1] : link.roadId}</strong>
        <p>{link.relation === 'threatens' ? t('Có thể ảnh hưởng', 'Potentially exposed') : t('Đã có ảnh hưởng', 'Impact recorded')}{link.fromM !== undefined ? ` · ${link.fromM}–${link.toM} m` : ''}</p>
        <p>{road ? t('Tình trạng đoạn đường: ', 'Road status: ') + roadStatusLabels[road.status][locale === 'vi' ? 0 : 1] : t('Liên kết không thuộc mạng đường hiện tại.', 'Link is outside the current road network.')}</p>
        {road && onRoad && <button className="text-button" onClick={() => onRoad(road.id)}>{t('Xem đoạn đường', 'View road section')}</button>}
      </div>;
    })}</section>}
  </div>;
}
