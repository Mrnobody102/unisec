import React from 'react';
import type { Locale } from '../../types/dear';

type Props = {
  locale: Locale;
  updated: boolean;
  onClose: () => void;
  onPrint: () => void;
};

export const DataDialog: React.FC<Props> = ({
  locale,
  updated,
  onClose,
  onPrint
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{t('Dữ liệu sự kiện & Mô hình 3D', 'Event Data & 3D Model')}</h2>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <span className="demo-badge">{t('Hợp đồng dữ liệu v1', 'Asset Contract v1')}</span>

          <dl className="incident-facts" style={{ marginTop: '16px' }}>
            <div>
              <dt>{t('Khu vực phân tích', 'Analysis Area')}</dt>
              <dd style={{ fontSize: '14px' }}>{t('Xã Chế Tạo, Lào Cai', 'Chế Tạo, Lào Cai')}</dd>
            </div>
            <div>
              <dt>{t('Thời điểm cập nhật', 'Snapshot time')}</dt>
              <dd style={{ fontSize: '14px' }}>
                {updated ? '09:45' : '09:31'}, 29/09/2026 (UTC+7)
              </dd>
            </div>
            <div>
              <dt>{t('Hệ tọa độ (CRS)', 'Coordinate Reference')}</dt>
              <dd style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>EPSG:32648 (UTM 48N)</dd>
            </div>
            <div>
              <dt>{t('Mô hình số độ cao (DEM)', 'Elevation Model')}</dt>
              <dd style={{ fontSize: '13px' }}>SRTM 30m / AW3D30 (Float32 Grid)</dd>
            </div>
          </dl>

          <p style={{ marginTop: '12px' }}>
            {t(
              'Mô hình 3D được tái tạo từ DEM thực tế kết hợp ảnh vệ tinh Sentinel-2 RGB. Toàn bộ cao độ trích xuất dọc tuyến và tính toán độ dốc được tính trực tiếp từ tệp lưới độ cao nguyên bản.',
              'The 3D model is generated from real DEM raster fused with Sentinel-2 RGB satellite imagery. Route elevations and slopes are calculated directly from the raw grid.'
            )}
          </p>

          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            <button className="button primary" onClick={onPrint}>
              {t('In / Lưu tài liệu PDF', 'Print / Save PDF')}
            </button>
            <button className="button" onClick={onClose}>
              {t('Đóng', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
