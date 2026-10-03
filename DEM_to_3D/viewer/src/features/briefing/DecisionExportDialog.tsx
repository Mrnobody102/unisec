import { useEffect, useState } from 'react';
import type { Locale } from '../../types/dear';
import type { TerrainData } from '../../types/terrain';
import { UiIcon } from '../../components/dear/UiIcon';
import { downloadBlob, snapshotFilename, type DecisionSnapshot } from './decisionSnapshot';
import { renderDecisionMap } from './renderDecisionMap';

export function DecisionExportDialog({ snapshot, terrain, imageUrl, locale, onClose }: {
  snapshot: DecisionSnapshot; terrain: TerrainData | null; imageUrl?: string; locale: Locale; onClose: () => void;
}): JSX.Element {
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  useEffect(() => {
    const controller = new AbortController(); let url: string | undefined;
    setPreview(null); setError(false);
    if (terrain && imageUrl) void renderDecisionMap(snapshot, terrain, imageUrl, locale, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob); setPreview({ blob, url });
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [snapshot, terrain, imageUrl, locale, attempt]);
  return <div className="modal-overlay" onClick={onClose}>
    <section className="modal-dialog decision-export-dialog" role="dialog" aria-modal="true" aria-labelledby="decision-export-title" onClick={e => e.stopPropagation()}>
      <header className="modal-head"><h2 id="decision-export-title">{t('Lưu đánh giá tiếp cận', 'Save access assessment')}</h2><button className="icon-button" aria-label={t('Đóng', 'Close')} onClick={onClose}><UiIcon name="close"/></button></header>
      <div className="modal-body">
        {preview ? <img className="decision-export-preview" src={preview.url} alt={t(`Bản đồ và đánh giá tiếp cận ${snapshot.community.name}`, `Map and access assessment for ${snapshot.community.name}`)}/> :
          <div className="decision-export-loading" role={error ? 'alert' : 'status'}>{error ? t('Không tạo được ảnh bản đồ', 'Map image could not be created') : !terrain || !imageUrl ? t('Chưa có ảnh nền phù hợp để xuất bản đồ', 'No compatible imagery available for map export') : t('Đang tạo ảnh bản đồ', 'Preparing map image')}
            {error && <button className="button soft" onClick={() => setAttempt(value => value + 1)}>{t('Thử lại', 'Retry')}</button>}
          </div>}
      </div>
      <footer className="decision-export-actions">
        <button className="button soft" onClick={() => downloadBlob(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }), snapshotFilename(snapshot) + '.json')}>{t('Tải dữ liệu JSON', 'Download JSON')}</button>
        <button className="button primary" disabled={!preview} onClick={() => preview && downloadBlob(preview.blob, snapshotFilename(snapshot) + '.png')}><UiIcon name="download"/>{t('Tải bản đồ PNG', 'Download PNG')}</button>
      </footer>
    </section>
  </div>;
}
