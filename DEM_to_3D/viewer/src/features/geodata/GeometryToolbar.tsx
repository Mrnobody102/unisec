import type { ReactNode } from 'react';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import type { GeometryMode, useGeometryEditor } from './useGeometryEditor';

type Props = {
  locale: Locale;
  editor: ReturnType<typeof useGeometryEditor>;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasSelection: boolean;
  aoiName: string | undefined;
  fieldAreaName?: string;
  snapping: boolean;
  onSnap: (enabled: boolean) => void;
  onStart: (mode: GeometryMode) => void;
  onFinish: () => void;
  onCancel: () => void;
  /** Back button and title, kept on the same row as the tools. */
  leading?: ReactNode;
};
export function GeometryToolbar({
  locale,
  editor,
  busy,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasSelection,
  aoiName,
  fieldAreaName,
  snapping,
  onSnap,
  onStart,
  onFinish,
  onCancel,
  leading
}: Props): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const tools = [
    ['polygon', 'polygon', t('Vẽ vùng quan tâm', 'Draw area of interest')],
    ['rectangle', 'rectangle', t('Vẽ hình chữ nhật', 'Draw rectangle')],
    ['edit', 'edit', t('Sửa ranh giới', 'Edit boundary')]
  ] as const;
  return (
    <div
      className="geodata-workbench-toolbar"
      aria-label={t('Công cụ GIS', 'GIS tools')}
    >
      {leading}
      <div className="geodata-tool-group">
        <button
          className="icon-button"
          aria-label={t('Chọn đối tượng GIS', 'Select GIS feature')}
          title={t('Chọn đối tượng GIS', 'Select GIS feature')}
          aria-pressed={!editor.active}
          onClick={onCancel}
        >
          <UiIcon name="pointer" />
        </button>
        {tools.map(([mode, icon, name]) => (
          <button
            key={mode}
            className="icon-button"
            aria-label={name}
            title={name}
            aria-pressed={editor.mode === mode}
            disabled={
              busy || editor.active || (mode === 'edit' && !hasSelection)
            }
            onClick={() => onStart(mode)}
          >
            <UiIcon name={icon} />
          </button>
        ))}
      </div>
      <div className="geodata-tool-group">
        <button
          className="icon-button"
          aria-label={t('Hoàn tác GIS', 'Undo GIS')}
          title={t('Hoàn tác GIS', 'Undo GIS')}
          disabled={!(editor.active ? editor.canUndo : canUndo) || busy}
          onClick={editor.active ? editor.undo : onUndo}
        >
          <UiIcon name="undo" />
        </button>
        <button
          className="icon-button"
          aria-label={t('Làm lại GIS', 'Redo GIS')}
          title={t('Làm lại GIS', 'Redo GIS')}
          disabled={!(editor.active ? editor.canRedo : canRedo) || busy}
          onClick={editor.active ? editor.redo : onRedo}
        >
          <UiIcon name="redo" />
        </button>
      </div>
      <div className="geodata-tool-group">
        <label className="geodata-snap">
          <input
            type="checkbox"
            checked={snapping}
            onChange={(event) => onSnap(event.target.checked)}
          />
          {t('Hút vào điểm gần', 'Snap to nearby points')}
        </label>
      </div>
      <div className="geodata-drawing-bar" hidden={!editor.active}>
        <strong>
          {fieldAreaName
            ? t('Vùng nghi ảnh hưởng: ', 'Suspected affected area: ') +
              fieldAreaName
            : editor.mode === 'edit'
              ? t('Kéo điểm để sửa ranh giới', 'Drag points to edit boundary')
              : editor.mode === 'rectangle'
                ? t('Hai góc đối diện', 'Two opposite corners')
                : `${editor.draft.vertices.length} ${t('đỉnh', 'vertices')}`}
        </strong>
        <button className="button" onClick={onCancel}>
          {t('Hủy', 'Cancel')}
        </button>
        <button
          className="button primary"
          disabled={
            editor.mode !== 'edit' &&
            editor.draft.vertices.length < (editor.mode === 'rectangle' ? 2 : 3)
          }
          onClick={onFinish}
        >
          {editor.mode === 'edit'
            ? t('Áp dụng', 'Apply')
            : t('Kết thúc', 'Finish')}
        </button>
      </div>
      {!editor.active && (
        <span className="geodata-tool-status" data-empty={!aoiName || undefined} title={aoiName}>
          {aoiName ? `${t('Vùng quan tâm', 'AOI')}: ${aoiName}` : t('Chưa có vùng quan tâm', 'No AOI')}
        </span>
      )}
    </div>
  );
}
