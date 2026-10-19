import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import { landslideAreaOf } from '../landslides/landslideAreas';
import { UiIcon } from '../../shared/ui/UiIcon';

export function CitizenAreaCard({ record, locale, onClose }: {record: GeometryRecord; locale: Locale; onClose: () => void}) {
  const area = landslideAreaOf(record);
  if (!area) return null;
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  return <aside className="citizen-area-info" aria-label={t('Thông tin vùng sạt lở', 'Landslide area details')}>
    <header><h2>{record.name}</h2><button className="icon-button" onClick={onClose} aria-label={t('Đóng vùng sạt lở', 'Close landslide area')}><UiIcon name="close"/></button></header>
    <p>{area.state === 'potential' ? t('Vùng có nguy cơ sạt lở', 'Potential landslide area') : t('Vùng đã ghi nhận sạt lở', 'Observed landslide area')}</p>
    <p className="small">{area.review === 'unreviewed' ? t('Ranh giới chưa xác minh', 'Boundary awaiting verification') : area.review === 'field-checked' ? t('Ranh giới đã kiểm tra thực địa', 'Boundary checked in the field') : t('Ranh giới đã được xem xét', 'Boundary reviewed')}</p>
    {area.basis && <details><summary>{t('Căn cứ khoanh vùng', 'Mapping evidence')}</summary><p>{area.basis}</p></details>}
  </aside>;
}
