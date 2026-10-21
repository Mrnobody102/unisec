import type { Hazard, Locale, RoadSegment } from '../../types/dear';
import type { LandslideArea } from '../landslides/landslideAreas';
import type { PreparedPhotoPoint } from '../fieldPhotos/preparedPhotos';
import { FieldPhotoStrip } from '../fieldPhotos/FieldPhotoStrip';
import { UiIcon } from '../../shared/ui/UiIcon';
import { kmRange } from './routeChainage';

export type PlaceRoad = { road: RoadSegment; km?: [number, number]; origin?: string };

/**
 * A landslide as a resident needs it: what it looks like, which road and where on it,
 * whether anyone has checked it, and a way to report what they see there.
 * No file names, survey codes or coordinator wording.
 */
export function CitizenPlaceCard({ hazard, area, road, photos, locale, onReport, onClose }: {
  hazard?: Hazard;
  area?: LandslideArea;
  road?: PlaceRoad;
  photos?: PreparedPhotoPoint;
  locale: Locale;
  onReport: () => void;
  onClose: () => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);
  const title = hazard ? t(...hazard.name) : area?.state === 'potential' ? t('Vùng có nguy cơ sạt lở', 'Area at risk of landslide') : t('Vùng sạt lở', 'Landslide area');
  const checked = hazard ? hazard.observation === 'reported' : area?.review === 'field-checked';
  const state = checked
    ? t('Đã có người kiểm tra tại chỗ', 'Checked on site')
    : photos ? t('Đã có ảnh chụp tại chỗ, chưa xác nhận đường đi được hay không', 'Photographed on site, passage not confirmed yet')
    : hazard ? t('Thấy trên ảnh vệ tinh, chưa có người kiểm tra tại chỗ', 'Seen on satellite imagery, not checked on site yet')
      : t('Khoanh trên ảnh, chưa có người kiểm tra tại chỗ', 'Outlined on imagery, not checked on site yet');
  const day = hazard?.detected.match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
  const roadState = road && (road.road.status === 'blocked' ? t('Bị chặn', 'Blocked') : road.road.status === 'uncertain' ? t('Cần xác minh', 'To verify') : t('Chưa ghi nhận chặn', 'No blockage reported'));
  return (
    <aside className="citizen-area-info citizen-place" aria-label={title}>
      <header>
        <div>
          <p className="citizen-place-kind">{hazard ? t('Sạt lở', 'Landslide') : t('Vùng sạt lở', 'Landslide area')}</p>
          <h2>{title}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label={t('Đóng', 'Close')}><UiIcon name="close" /></button>
      </header>
      <p className="citizen-place-state" data-checked={checked || undefined}>{state}</p>
      {photos && <FieldPhotoStrip point={photos} locale={locale} />}
      {road && (
        <div className="citizen-place-road" data-status={road.road.status}>
          <span>
            <strong>{t(...road.road.name).replace(/, đoạn \d+$|, section \d+$/i, '')}</strong>
            {road.km && <small>{kmRange(road.km, locale)}{road.origin && t(` tính từ ${road.origin}`, ` from ${road.origin}`)}</small>}
          </span>
          <span className="citizen-place-road-state">{roadState}</span>
        </div>
      )}
      {day && <p className="citizen-place-date">{t(`Phát hiện ngày ${day}`, `Detected ${day}`)}</p>}
      <button type="button" className="button primary citizen-place-report" onClick={onReport}>
        <UiIcon name="camera" size={18} />
        {t('Gửi ghi nhận tại đây', 'Report from here')}
      </button>
    </aside>
  );
}
