import React from 'react';
import type { Locale } from '../../types/dear';

type Props = {
  locale: Locale;
  layers: Record<string, boolean>;
  onToggleLayer: (layerId: string) => void;
  onClose: () => void;
};

export const LayersDialog: React.FC<Props> = ({
  locale,
  layers,
  onToggleLayer,
  onClose
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  const groups = [
    {
      name: t('Ảnh nền & Địa hình', 'Imagery & Terrain'),
      items: [
        { id: 'imagery', label: t('Ảnh vệ tinh Sentinel-2', 'Sentinel-2 Satellite Texture') },
        { id: 'hillshade', label: t('Bóng địa hình (Hillshade)', 'Terrain Shading') }
      ]
    },
    {
      name: t('Thiên tai', 'Hazards'),
      items: [
        { id: 'landslide', label: t('Vết sạt lở (Landslides)', 'Landslides') },
        { id: 'flood', label: t('Vùng nghi ngập lũ quét', 'Flash Flood Extents') }
      ]
    },
    {
      name: t('Giao thông', 'Roads'),
      items: [
        { id: 'roads', label: t('Mạng đường bộ', 'Road Network') },
        { id: 'status', label: t('Màu cảnh báo tình trạng đường', 'Road Status Styling') }
      ]
    },
    {
      name: t('Dân cư & Ứng phó', 'Communities & Response'),
      items: [
        { id: 'communities', label: t('Thôn, bản theo dõi', 'Villages & Settlements') },
        { id: 'staging', label: t('Sở chỉ huy tiền phương (FOB)', 'FOB Staging Point') },
        { id: 'route', label: t('Tuyến đường đang chọn', 'Selected Route Line') }
      ]
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{t('Lớp bản đồ chuyên đề', 'Map Layers')}</h2>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="layer-groups">
            {groups.map((group, idx) => (
              <fieldset key={idx}>
                <legend>{group.name}</legend>
                {group.items.map((item) => (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      checked={Boolean(layers[item.id])}
                      onChange={() => onToggleLayer(item.id)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
