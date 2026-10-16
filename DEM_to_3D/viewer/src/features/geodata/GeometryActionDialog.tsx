import { useState } from 'react';
import type { GeometryRecord, GeometryRole } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { roleLabel } from './geometryPresentation';

export type GeometryAction =
  | { kind: 'delete'; id: string }
  | { kind: 'role'; id: string; role: GeometryRole };

export function GeometryActionDialog({ action, records, locale, onConfirm, onCancel }: {
  action: GeometryAction; records: GeometryRecord[]; locale: Locale;
  onConfirm: () => boolean; onCancel: () => void;
}): JSX.Element {
  const [failed, setFailed] = useState(false);
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const record = records.find(item => item.id === action.id);
  const title = action.kind === 'delete' ? t('Xóa đối tượng?', 'Delete feature?')
    : t('Đổi vai trò của vùng?', 'Change area role?');
  const confirmLabel = action.kind === 'delete' ? t('Xóa đối tượng', 'Delete feature')
    : t('Áp dụng', 'Apply');
  return <ConfirmDialog title={title} confirmLabel={confirmLabel} locale={locale}
    destructive={action.kind === 'delete'} onCancel={onCancel}
    onConfirm={() => setFailed(!onConfirm())}
    error={failed ? t('Chưa lưu được thay đổi. Dữ liệu trên bản đồ chưa thay đổi.', 'Could not save the change. The map data has not changed.') : undefined}>
    {action.kind === 'delete' && <>
      <p><strong>{record?.name}</strong></p>
      <p>{record?.feature.geometry.type === 'Point' ? t('Ảnh và vùng ảnh hưởng gắn với điểm này cũng sẽ bị xóa. Có thể khôi phục bằng Hoàn tác GIS.', 'Linked photos and affected areas will also be deleted. You can restore them with Undo GIS.') : t('Xóa vùng này khỏi danh sách và bản đồ. Có thể khôi phục bằng Hoàn tác GIS.', 'Remove this area from the list and map. You can restore it with Undo GIS.')}</p>
    </>}
    {action.kind === 'role' && <>
      <p><strong>{record?.name}</strong></p>
      <dl><div><dt>{t('Sử dụng làm', 'Use as')}</dt><dd>{roleLabel(action.role, locale)}</dd></div></dl>
      {action.role === 'aoi' && <p>{t('Vùng này sẽ được dùng để tìm ảnh và phân tích. AOI hiện tại, nếu có, sẽ chuyển thành lớp tham chiếu.', 'Use this area for imagery searches and analysis. Any current AOI becomes a reference layer.')}</p>}
    </>}
  </ConfirmDialog>;
}
