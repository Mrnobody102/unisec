import React from 'react';
import type { Locale } from '../../types/dear';

type Props = {
  evidenceId: string;
  locale: Locale;
  updated: boolean;
  onClose: () => void;
};

export const EvidenceDialog: React.FC<Props> = ({
  evidenceId,
  locale,
  updated,
  onClose
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  const findings: Record<string, { title: [string, string]; desc: [string, string]; meta: string }> = {
    'LS-02': {
      title: ['NR-18 có điểm chặn tại LS-02', 'NR-18 blocked at LS-02'],
      desc: [
        'Báo cáo hiện trường xác nhận sạt lở taluy dương vùi lấp mặt đường. Xe cơ giới không thể qua.',
        'Field report confirms debris blocking the roadway. Motor vehicles cannot pass.'
      ],
      meta: 'Hiện trường 07:40 · SAR 06:12 · VHR 07:52'
    },
    'U-1': {
      title: updated
        ? ['PR-7 bị chặn tại vị trí khe U-1', 'PR-7 blocked at U-1 gully crossing']
        : ['Chưa rõ khả năng đi qua khe U-1', 'Passability at U-1 gully is unconfirmed'],
      desc: updated
        ? [
            'Tin mới lúc 09:45: Đoạn qua khe bị đất đá tràn lấp hoàn toàn. Tuyến qua U-1 không thể sử dụng.',
            'Update at 09:45: Gully crossing completely blocked by mud and rock. Reassess route.'
          ]
        : [
            'Có tin báo đất đá tại chỗ vượt khe sau mưa lũ; chưa xác nhận xe bán tải gầm cao đi qua được.',
            'Debris reported at the stream crossing; 4WD vehicle passage unconfirmed.'
          ],
      meta: updated ? 'Hiện trường · quan sát 09:40 · nhận 09:45' : 'Tin hiện trường · 08:58'
    },
    'B-2': {
      title: ['Cầu B-2 cần xác minh khả năng lưu thông', 'Bridge B-2 needs passability verification'],
      desc: [
        'Có tin báo ngập mặt cầu 0.6m lúc rạng sáng. Hiện nước đang rút nhưng cần thợ cầu kiểm định kết cấu mố cầu.',
        'Bridge submerged 0.6m at dawn. Water receding but abutment inspection is needed.'
      ],
      meta: 'Hiện trường · 03:55'
    },
    'LS-01': {
      title: ['Sạt lở taluy âm tại LS-01', 'Embankment failure at LS-01'],
      desc: [
        'Vết nứt và trượt lở mái dốc phát hiện qua phân tích chênh lệch pha ảnh radar.',
        'Slope failure detected via radar interferometry differential analysis.'
      ],
      meta: 'Phân tích SAR · 07:05'
    }
  };

  const f = findings[evidenceId] || {
    title: [`Căn cứ dữ liệu: ${evidenceId}`, `Evidence details: ${evidenceId}`],
    desc: [
      'Nhận định tự động từ chuỗi xử lý ảnh viễn thám và tin báo sơ bộ.',
      'Automated finding from satellite pipeline and initial reports.'
    ],
    meta: 'Kịch bản SIC 2026'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{t('Hồ sơ căn cứ: ', 'Evidence details: ')} {evidenceId}</h2>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <span className="demo-badge">{t('Bằng chứng tác động', 'Impact evidence')}</span>

          <h3 style={{ marginTop: '14px', fontSize: '15px' }}>{t(f.title[0], f.title[1])}</h3>
          <p style={{ marginTop: '8px' }}>{t(f.desc[0], f.desc[1])}</p>

          <dl className="incident-facts" style={{ marginTop: '16px' }}>
            <div>
              <dt>{t('Nguồn & Thời điểm', 'Source & Timestamp')}</dt>
              <dd style={{ fontSize: '12.5px' }}>{f.meta}</dd>
            </div>
            <div>
              <dt>{t('Mức độ xác minh', 'Verification Status')}</dt>
              <dd style={{ fontSize: '12.5px' }}>
                {evidenceId === 'LS-02' || (evidenceId === 'U-1' && updated)
                  ? t('Xác minh thực địa', 'Field verified')
                  : t('Cần xác minh thêm', 'Unverified / Inferred')}
              </dd>
            </div>
          </dl>

          <button
            className="button primary"
            style={{ width: '100%', marginTop: '20px' }}
            onClick={onClose}
          >
            {t('Đóng', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};
