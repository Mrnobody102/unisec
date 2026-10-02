import React from 'react';
import type { Locale } from '../../types/dear';
import { UiIcon } from './UiIcon';

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

  const findings: Record<string, { title: [string, string]; desc: [string, string]; meta: [string, string] }> = {
    'LS-02': {
      title: ['Sạt lở chặn đường chính vào Nậm Khắt', 'Landslide blocks the main road to Nậm Khắt'],
      desc: [
        'Báo cáo hiện trường xác nhận sạt lở taluy dương vùi lấp mặt đường. Xe cơ giới không thể qua.',
        'Field report confirms debris blocking the roadway. Motor vehicles cannot pass.'
      ],
      meta: ['Hiện trường 07:40, SAR 06:12', 'Field report 07:40, SAR 06:12']
    },
    'U-1': {
      title: updated
        ? ['Đường vòng bị chặn tại điểm vượt khe', 'Mountain bypass blocked at the gully crossing']
        : ['Chưa rõ khả năng đi qua điểm vượt khe', 'Gully crossing passability is unconfirmed'],
      desc: updated
        ? [
            'Quan sát lúc 09:40, nhận tin lúc 09:45: Đất đá vùi lấp đoạn qua khe. Đường vòng có đoạn bị chặn.',
            'Observed at 09:40, received at 09:45: Debris blocks the gully crossing on the bypass.'
          ]
        : [
            'Có tin báo đất đá tại chỗ vượt khe sau mưa lũ. Chưa xác nhận xe bán tải gầm cao đi qua được.',
            'Debris reported at the stream crossing. 4WD vehicle passage unconfirmed.'
          ],
      meta: updated
        ? ['Hiện trường: quan sát 09:40, nhận 09:45', 'Field report: observed 09:40, received 09:45']
        : ['Tin hiện trường, 08:58', 'Field report, 08:58']
    },
    'B-2': {
      title: ['Cầu trên đường vào Khau Mang cần kiểm tra', 'Access bridge to Khau Mang needs inspection'],
      desc: [
        'Có tin mặt cầu ngập khoảng 0,6 m lúc 03:55. Chưa có tin mới xác nhận mực nước hoặc khả năng đi qua.',
        'A report at 03:55 put water about 0.6 m above the bridge deck. No newer report confirms water level or passability.'
      ],
      meta: ['Hiện trường, 03:55', 'Field report, 03:55']
    },
    'LS-01': {
      title: ['Dấu hiệu sạt lở gần Lao Mải', 'Possible landslide near Lao Mải'],
      desc: [
        'Phân tích ảnh radar cho thấy dấu hiệu trượt lở gần đường tiếp cận.',
        'Radar image analysis indicates a possible slope failure near the access road.'
      ],
      meta: ['Phân tích SAR, 07:05', 'SAR analysis, 07:05']
    },
    'LS-03': {
      title: ['Điểm nghi sạt lở gần Khau Mang', 'Possible landslide near Khau Mang'],
      desc: [
        'Phân tích ảnh radar đánh dấu một vị trí nghi sạt lở gần đường vào bản. Chưa xác minh ảnh hưởng đến đường.',
        'Radar analysis marks a possible landslide near the access road. Road impact is unverified.'
      ],
      meta: ['Phân tích SAR, 07:05', 'SAR analysis, 07:05']
    }
  };

  const f = findings[evidenceId] || {
    title: [`Thông tin: ${evidenceId}`, `Finding: ${evidenceId}`],
    desc: [
      'Bộ dữ liệu chưa có mô tả căn cứ riêng cho điểm này.',
      'This dataset has no separate source description for this site.'
    ],
    meta: ['Chưa ghi nguồn cụ thể', 'Source not specified']
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="evidence-dialog-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="evidence-dialog-title">{t('Căn cứ và nguồn', 'Finding and source')}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t('Đóng', 'Close')}>
            <UiIcon name="close" />
          </button>
        </div>

        <div className="modal-body">
          <h3 className="evidence-title">{t(f.title[0], f.title[1])}</h3>
          <span className="small">{t('Mã tham chiếu', 'Reference ID')}: {evidenceId}</span>
          <p style={{ marginTop: '8px' }}>{t(f.desc[0], f.desc[1])}</p>

          <dl className="incident-facts" style={{ marginTop: '16px' }}>
            <div>
              <dt>{t('Nguồn, thời điểm', 'Source and time')}</dt>
              <dd style={{ fontSize: '12.5px' }}>{t(f.meta[0], f.meta[1])}</dd>
            </div>
            <div>
              <dt>{t('Loại căn cứ', 'Evidence type')}</dt>
              <dd style={{ fontSize: '12.5px' }}>
                {['LS-02', 'U-1', 'B-2'].includes(evidenceId)
                  ? t('Tin hiện trường', 'Field report')
                  : ['LS-01', 'LS-03'].includes(evidenceId) ? t('Phân tích SAR, chưa kiểm chứng thực địa', 'SAR analysis, not field validated') : t('Chưa xác định', 'Unknown')}
              </dd>
            </div>
          </dl>

          <p className="small evidence-document-status">{t('Tài liệu gốc: chưa có tệp đính kèm.', 'Source document: no attachment available.')}</p>
        </div>
      </div>
    </div>
  );
};
