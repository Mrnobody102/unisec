import { useState } from 'react';
import type { GeometryRecord } from '../../geo/vector/types';
import { isPolygon } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import {
  reviewScenePair,
  searchImagery,
  type ImageryCatalog,
  type ImageryScene
} from './imageryCatalog';
import './catalog.css';

export type SceneResult = ReturnType<typeof searchImagery>[number];
export function SceneCatalog({
  locale,
  catalog,
  error,
  onRetry,
  aoi,
  results,
  queryAoi,
  selected,
  onSelection,
  onResults,
  onInspect,
  onAdd,
  onExport,
  disabled
}: {
  locale: Locale;
  catalog: ImageryCatalog | null;
  error: boolean;
  onRetry: () => void;
  aoi: GeometryRecord | undefined;
  results: SceneResult[];
  queryAoi: string | null;
  selected: string[];
  onSelection: (ids: string[]) => void;
  onResults: (results: SceneResult[], signature: string) => void;
  onInspect: (scene: ImageryScene) => void;
  onAdd: () => void;
  onExport: () => void;
  disabled: boolean;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const [sensor, setSensor] = useState('sar'),
    [from, setFrom] = useState('2026-09-01'),
    [to, setTo] = useState('2026-10-08'),
    [cloud, setCloud] = useState('30');
  const [formError, setFormError] = useState(''),
    [page, setPage] = useState(1);
  const signature = aoi ? JSON.stringify(aoi.feature.geometry) : '';
  const stale = queryAoi !== null && queryAoi !== signature;
  const scenes = catalog?.scenes.filter((scene) => selected.includes(scene.id)) ?? [];
  const pair =
    aoi && isPolygon(aoi.feature.geometry)
      ? reviewScenePair(scenes, aoi.feature.geometry)
      : 'count';
  const pairText = {
    count: t(
      'Chọn hai ảnh khác thời điểm để đối chiếu.',
      'Select two scenes to review a temporal pair.'
    ),
    sensor: t('Khác bộ sản phẩm hoặc mức xử lý.', 'Different collections or processing levels.'),
    time: t('Hai cảnh cùng thời điểm thu nhận.', 'Both scenes have the same acquisition time.'),
    orbit: t(
      'Thiếu hoặc khác thông số thu nhận SAR.',
      'SAR acquisition metadata is missing or incompatible.'
    ),
    coverage: t(
      'Cặp ảnh không có vùng chung trong AOI.',
      'The pair has no common extent inside the AOI.'
    ),
    'metadata-only': t(
      'Thông số thu nhận phù hợp.',
      'Acquisition metadata is compatible.'
    )
  }[pair];
  if (error)
    return (
      <section className="geodata-section" role="alert">
        <h2>{t('Không tải được danh mục ảnh', 'Catalog unavailable')}</h2>
        <button className="button" onClick={onRetry}>
          {t('Thử lại', 'Retry')}
        </button>
      </section>
    );
  if (!catalog)
    return (
      <section className="geodata-section" role="status">
        {t('Đang tải danh mục ảnh', 'Loading catalog')}
      </section>
    );
  return (
    <fieldset className="scene-catalog" disabled={disabled}>
      <section className="geodata-section">
        <h2>{t('Tìm ảnh vệ tinh', 'Find imagery')}</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setFormError('');
            if (!aoi || !isPolygon(aoi.feature.geometry)) {
              setFormError(
                t('Chọn hoặc vẽ AOI trước khi tìm.', 'Select or draw an AOI before searching.')
              );
              return;
            }
            try {
              onResults(
                searchImagery(catalog, aoi.feature.geometry, {
                  sensor,
                  from,
                  to,
                  cloud: sensor === 'optical' && cloud !== '' ? Number(cloud) : null
                }),
                signature
              );
              setPage(1);
            } catch {
              setFormError(
                t('Kiểm tra khoảng ngày và hình học AOI.', 'Check the date range and AOI geometry.')
              );
            }
          }}
        >
          <label className="geodata-field">
            {t('Bộ sản phẩm', 'Collection')}
            <select
              aria-label={t('Bộ sản phẩm', 'Imagery collection')}
              value={sensor}
              onChange={(event) => setSensor(event.target.value)}
            >
              <option value="sar">Sentinel-1 GRD</option>
              <option value="optical">Sentinel-2 L2A</option>
              <option value="all">{t('Tất cả', 'All')}</option>
            </select>
          </label>
          <div className="catalog-dates">
            <label className="geodata-field">
              {t('Từ ngày (UTC)', 'From (UTC)')}
              <input
                aria-label={t('Từ ngày ảnh', 'Imagery from date')}
                type="date"
                required
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label className="geodata-field">
              {t('Đến ngày (UTC)', 'To (UTC)')}
              <input
                aria-label={t('Đến ngày ảnh', 'Imagery to date')}
                type="date"
                required
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </div>
          {sensor === 'optical' && (
            <label className="geodata-field">
              {t('Mây toàn cảnh tối đa (%)', 'Maximum scene cloud cover (%)')}
              <input
                aria-label={t('Mây toàn cảnh', 'Scene cloud cover')}
                type="number"
                min="0"
                max="100"
                value={cloud}
                onChange={(event) => setCloud(event.target.value)}
              />
            </label>
          )}
          <button className="button primary catalog-search" type="submit">
            <UiIcon name="search" />
            {t('Tìm ảnh', 'Search imagery')}
          </button>
          {formError && (
            <p className="geodata-hint" role="alert">
              {formError}
            </p>
          )}
        </form>
      </section>
      <section className="geodata-section">
        <h2>
          {t('Kết quả', 'Results')}
          <span>{results.length}</span>
        </h2>
        {stale && (
          <p className="catalog-warning" role="status">
            {t(
              'AOI đã đổi. Tìm lại để cập nhật kết quả.',
              'AOI changed. Search again to update results.'
            )}
          </p>
        )}
        {queryAoi === null ? (
          <p className="geodata-empty">
            {t(
              'Tìm ảnh trong vùng quan tâm đang chọn.',
              'Search inside the current area of interest.'
            )}
          </p>
        ) : (
          !results.length && (
            <p className="geodata-empty">
              {t(
                'Không có ảnh phù hợp bộ lọc trong danh mục này.',
                'No matching scene in the local catalog.'
              )}
            </p>
          )
        )}
        <ul className="catalog-results">
          {results.slice(0, page * 6).map(({ scene, coverage }) => {
            const chosen = selected.includes(scene.id);
            return (
              <li key={scene.id} className={chosen ? 'is-selected' : ''}>
                <button
                  className="catalog-scene"
                  title={scene.id}
                  aria-label={t('Thông tin ảnh ', 'Scene metadata ') + scene.id}
                  onClick={() => onInspect(scene)}
                >
                  <SceneThumb scene={scene} />
                  <span>
                    <strong>{sceneTitle(scene)}</strong>
                    <time dateTime={scene.acquiredAt}>{sceneTime(scene, locale)}</time>
                    <span className="catalog-chips">
                      <span>{t('Phủ AOI', 'AOI')} {Math.round(coverage * 100)}%</span>
                      <span>
                        {scene.sensor === 'sar'
                          ? scene.polarizations.join('/') || 'SAR'
                          : (scene.cloudCover === null ? t('Chưa rõ mây', 'Cloud unknown') : `${t('Mây', 'Cloud')} ${Math.round(scene.cloudCover)}%`)}
                      </span>
                    </span>
                  </span>
                </button>
                <label className="catalog-pick" title={t('Chọn để đối chiếu', 'Select for comparison')}>
                  <input
                    type="checkbox"
                    aria-label={t('Chọn cảnh ', 'Select scene ') + scene.id}
                    checked={chosen}
                    onChange={(event) =>
                      onSelection(
                        event.target.checked
                          ? [...selected, scene.id]
                          : selected.filter((id) => id !== scene.id)
                      )
                    }
                  />
                </label>
              </li>
            );
          })}
        </ul>
        {results.length > page * 6 && (
          <button className="button" onClick={() => setPage((value) => value + 1)}>
            {t('Thêm kết quả', 'More results')}
          </button>
        )}
      </section>
      <section className="geodata-section catalog-selection">
        <h2>
          {t('Ảnh đã chọn', 'Selected scenes')}
          <span>{scenes.length}</span>
        </h2>
        {scenes.length > 1 && (
          <p className="geodata-hint" data-pair-review={pair}>
            {pairText}
          </p>
        )}
        <ul>
          {[...scenes]
            .sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt))
            .map((scene) => (
              <li key={scene.id}>
                <button
                  className="catalog-selected-name"
                  title={scene.id}
                  onClick={() => onInspect(scene)}
                >
                  <strong>{sceneTitle(scene)}</strong>
                  <time dateTime={scene.acquiredAt}>{sceneTime(scene, locale)}</time>
                </button>
                <button
                  className="icon-button"
                  aria-label={t('Bỏ cảnh ', 'Remove scene ') + scene.id}
                  onClick={() => onSelection(selected.filter((id) => id !== scene.id))}
                >
                  <UiIcon name="close" />
                </button>
              </li>
            ))}
        </ul>
        <div className="geodata-actions">
          <button className="button" disabled={!scenes.length || stale} onClick={onAdd}>
            {t('Lưu phạm vi vào lớp', 'Save footprints to layers')}
          </button>
          <button
            className="icon-button"
            disabled={!scenes.length || !aoi || stale}
            title={t('Xuất danh sách ảnh', 'Export scene list')}
            aria-label={t('Xuất danh sách ảnh', 'Export scene list')}
            onClick={onExport}
          >
            <UiIcon name="download" />
          </button>
        </div>
        <a className="catalog-credit" href={catalog.source.license} target="_blank" rel="noreferrer">
          © {catalog.source.provider}
        </a>
      </section>
    </fieldset>
  );
}

export function SceneDetails({
  scene,
  locale,
  onClose,
  onFit
}: {
  scene: ImageryScene;
  locale: Locale;
  onClose: () => void;
  onFit: () => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const acquired =
    new Date(scene.acquiredAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' UTC';
  const unknown = t('Chưa rõ', 'Unknown');
  // The figures an analyst compares first; the rest is reference.
  const figures: [string, string][] = scene.sensor === 'sar'
    ? [[t('Phân cực', 'Polarization'), scene.polarizations.join('/') || unknown],
       [t('Pixel', 'Pixel'), scene.pixelSpacing === null ? unknown : scene.pixelSpacing + ' m']]
    : [[t('Mây toàn cảnh', 'Scene cloud'), scene.cloudCover === null ? unknown : scene.cloudCover + '%'],
       [t('GSD sản phẩm', 'Product GSD'), scene.gsd === null ? unknown : scene.gsd + ' m']];
  const reference: [string, string][] = [
    [t('Bộ sản phẩm', 'Collection'), scene.collection],
    [t('Mức xử lý', 'Processing level'), scene.level],
    ...(scene.sensor === 'sar' ? [
      [t('Hướng bay', 'Pass'), scene.pass ? (scene.pass === 'ascending' ? t('Hướng bắc', 'Ascending') : t('Hướng nam', 'Descending')) : unknown] as [string, string],
      [t('Quỹ đạo tương đối', 'Relative orbit'), String(scene.orbit ?? unknown)] as [string, string]] : []),
    [t('Mã ảnh', 'Image identifier'), scene.id]
  ];
  return (
    <aside className="geodata-scene-detail" aria-label={t('Thông tin ảnh', 'Scene metadata')}>
      <header>
        <div className="detail-name">
          <p className="sheet-kind">{scene.sensor === 'sar' ? t('Ảnh radar', 'Radar scene') : t('Ảnh quang học', 'Optical scene')}</p>
          <h2>{sceneTitle(scene)}</h2>
          <p className="catalog-detail-time"><time dateTime={scene.acquiredAt}>{acquired}</time></p>
        </div>
        <button
          className="icon-button"
          aria-label={t('Đóng thông tin ảnh', 'Close scene metadata')}
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div className="catalog-detail-body">
        <SceneThumb scene={scene} large />
        <dl className="key-facts">
          {figures.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <section className="workflow-section">
          <dl className="fact-rows">
            {reference.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className={label === t('Mã ảnh', 'Image identifier') ? 'catalog-scene-id' : undefined}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="geodata-actions">
          <button className="button" onClick={onFit}>
            <UiIcon name="fit" />
            {t('Xem phạm vi', 'Fit footprint')}
          </button>
          <a className="button" href={scene.metadataUrl} target="_blank" rel="noreferrer">
            {t('Metadata STAC', 'STAC metadata')}
          </a>
        </div>
      </div>
    </aside>
  );
}


/** "Sentinel-1D GRD", "Sentinel-2A L2A". */
function sceneTitle(scene: ImageryScene): string {
  const platform = scene.platform.replace(/^sentinel-(\w+)$/i, (_, unit: string) => 'Sentinel-' + unit.toUpperCase());
  return `${platform} ${scene.sensor === 'sar' ? 'GRD' : 'L2A'}`;
}
function sceneTime(scene: ImageryScene, locale: Locale): string {
  return (
    new Date(scene.acquiredAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' UTC'
  );
}
/** Provider quicklook; falls back to a sensor icon when absent or blocked. */
function SceneThumb({ scene, large = false }: { scene: ImageryScene; large?: boolean }): JSX.Element {
  const [failed, setFailed] = useState(false);
  return (
    <span className={'catalog-thumb' + (large ? ' is-large' : '')} aria-hidden="true">
      {scene.thumbnail && !failed ? (
        <img src={scene.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <UiIcon name={scene.sensor === 'sar' ? 'layers' : 'image'} />
      )}
    </span>
  );
}
