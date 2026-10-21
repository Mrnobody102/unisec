import area from '@turf/area';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale, RoadSegment } from '../../types/dear';
import type { KeyFact } from '../../components/dear/DetailFacts';
import { roadStatusLabels } from '../routes/roadStatus';
import { formatArea } from '../geodata/geometryPresentation';
import { areaLabel } from './areaLabels';
import { landslideAreaOf } from './landslideAreas';

/** Title-block content for a mapped landslide area: its kind, review state and measured figures. */
export function landslideAreaHead(record: GeometryRecord, locale: Locale) {
  const value = landslideAreaOf(record);
  if (!value) return null;
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const facts: KeyFact[] = [{ label: t('Diện tích ước tính', 'Estimated area'), value: formatArea(Math.round(area(record.feature)/10)*10, locale) }];
  if (value.part !== 'undifferentiated') facts.push({ label: t('Phần khoanh', 'Mapped part'), value: areaLabel(value.part, locale) });
  return { kind: value.part==='deposit'?t('Vật liệu sạt lở','Landslide material'):areaLabel(value.state, locale), review: value.review==='unreviewed'?t('Ranh giới chưa xác minh','Boundary not verified'):areaLabel(value.review, locale), unreviewed: value.review === 'unreviewed', facts };
}

/** Body of a mapped landslide area: mapping evidence, then the road sections it touches. */
export function LandslideAreaSummary({ record, roads = [], locale, onRoad }: { record: GeometryRecord; roads?: RoadSegment[]; locale: Locale; onRoad?: (id: string) => void }): JSX.Element | null {
  const value = landslideAreaOf(record);
  if (!value) return null;
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const missing=[!value.observedAt && t('ngày tư liệu','evidence date'),!value.boundaryAccuracyM && t('sai số ranh giới','boundary accuracy')].filter(Boolean).join(t(' và ',' and '));
  return <div className="landslide-area-summary">
    <section className="workflow-section landslide-evidence">
      <h3>{t('Phạm vi khoanh vùng', 'Mapped extent')}</h3>
      {value.part!=='undifferentiated' && <p className="field-note">{value.part==='deposit'?t('Phần vật liệu trượt xuống và tích tụ trên sườn.','Material displaced downslope and deposited on the slope.'):value.part==='source'?t('Phần sườn nơi khối trượt phát sinh.','Slope area where the slide originated.'):t('Phần đường đi của vật liệu trượt xuống.','Downslope path of displaced material.')}</p>}
      {value.basis && !/^Khoanh vẽ trong .+Ngày khảo sát và sai số/.test(value.basis) && <p className="field-note">{value.basis}</p>}
      <dl className="fact-rows">
        <div><dt>{t('Nguồn', 'Sources')}</dt><dd>{record.source.name}</dd></div>
        {value.observedAt && <div><dt>{t('Ngày tư liệu', 'Evidence date')}</dt><dd>{new Date(value.observedAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB')}</dd></div>}
        {value.imageReference && <div><dt>{t('Ảnh sử dụng', 'Imagery')}</dt><dd>{value.imageReference}{value.imageResolutionM ? ` (${value.imageResolutionM} m)` : ''}</dd></div>}
        {value.boundaryAccuracyM && <div><dt>{t('Sai số ranh giới', 'Boundary accuracy')}</dt><dd>±{value.boundaryAccuracyM} m</dd></div>}
        {value.reviewer && <div><dt>{t('Người rà soát', 'Reviewer')}</dt><dd>{value.reviewer}</dd></div>}
      </dl>
      {missing && <p className="area-source-note">{t(`Nguồn chưa ghi ${missing}.`,`Source does not provide ${missing}.`)}</p>}
    </section>
    {value.roadLinks.length > 0 && <section className="workflow-section landslide-road-links"><h3>{t('Đoạn đường liên quan', 'Linked road sections')}</h3>{value.roadLinks.map(link => {
      const road = roads.find(r => r.id === link.roadId);
      const meta = [link.relation === 'threatens' ? t('Có thể ảnh hưởng', 'Potentially exposed') : t('Đã có ảnh hưởng', 'Impact recorded'),
        link.fromM !== undefined ? `${link.fromM}–${link.toM} m` : '',
        road ? roadStatusLabels[road.status][locale === 'vi' ? 0 : 1] : t('Ngoài mạng đường hiện tại', 'Outside the current road network')].filter(Boolean).join(', ');
      const content = <><strong>{road ? road.name[locale === 'vi' ? 0 : 1] : link.roadId}</strong><small>{meta}</small></>;
      return road && onRoad
        ? <button key={link.roadId} className="landslide-road-link" onClick={() => onRoad(road.id)}>{content}</button>
        : <div key={link.roadId} className="landslide-road-link">{content}</div>;
    })}</section>}
  </div>;
}
