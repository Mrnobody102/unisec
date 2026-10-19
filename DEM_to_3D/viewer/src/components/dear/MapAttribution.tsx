import {
  imagerySource,
  defaultImagerySource
} from '../../features/map/imagerySource';
import type { BasemapState } from '../../features/map/mapContracts';
import type { Locale } from '../../types/dear';
import { useRef, useState } from 'react';
import { useDismissiblePopover } from '../../shared/hooks/useDismissiblePopover';
import { UiIcon } from './UiIcon';

export function MapAttribution({
  locale,
  state,
  onRetry,
  localSource,
  terrainDisplay
}: {
  locale: Locale;
  state: BasemapState;
  onRetry: () => void;
  localSource?: [string, string];
  terrainDisplay?: {exaggeration: number};
}): JSX.Element | null {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const imagery =
    state.provider === 'configured' ? imagerySource : defaultImagerySource;
  const imageryCredit = imagery.link ? (
    <a href={imagery.link} target="_blank" rel="noreferrer">
      {imagery.credit}
    </a>
  ) : (
    imagery.credit
  );
  const anchor = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useDismissiblePopover(anchor, open, () => setOpen(false));
  const unavailable =
    state.status === 'partial' ||
    state.status === 'error' ||
    state.status === 'unavailable';
  return (
    <>
      <div className="map-attribution" ref={anchor}>
        <button
          className="map-source-button"
          aria-label={t('Nguồn bản đồ', 'Map sources')}
          aria-expanded={open}
          aria-controls="map-source-popover"
          onClick={() => setOpen((value) => !value)}
          title={t('Nguồn bản đồ', 'Map sources')}
        >
          <UiIcon name="info" size={18} />
          {unavailable && (
            <span
              className="map-source-warning"
              aria-label={t(
                'Nền khu vực chưa đầy đủ',
                'Regional basemap incomplete'
              )}
            />
          )}
        </button>
        {open && (
          <div
            className="map-source-popover"
            id="map-source-popover"
            data-popover
          >
            <div className="map-source-heading">
              <h3>{t('Nguồn bản đồ', 'Map sources')}</h3>
              <button
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label={t('Đóng nguồn bản đồ', 'Close map sources')}
              >
                <UiIcon name="close" size={16} />
              </button>
            </div>
            <dl>
              {localSource && (
                <div>
                  <dt>{t('Dữ liệu khu vực', 'Local data')}</dt>
                  <dd>{t(...localSource)}</dd>
                </div>
              )}
              {terrainDisplay && (
                <div><dt>{t('Phóng đại độ cao', 'Vertical exaggeration')}</dt><dd>×{terrainDisplay.exaggeration}</dd></div>
              )}
              <div>
                <dt>{t('Nền khu vực', 'Regional basemap')}</dt>
                <dd>
                  {state.status === 'off'
                    ? t('Đã tắt', 'Off')
                    : state.status === 'loading' && !state.loaded
                      ? t('Đang tải…', 'Loading…')
                    : state.loaded > 0
                      ? state.style === 'satellite'
                        ? imagery.name
                        : 'Terrain Light'
                      : t('Chưa tải được', 'Unavailable')}
                </dd>
              </div>
              {state.style === 'satellite' && !imagery.custom && state.status !== 'off' && (
                <div>
                  <dt>{t('Độ phân giải nền', 'Basemap resolution')}</dt>
                  <dd>{t('Thay đổi theo khu vực', 'Varies by location')}</dd>
                </div>
              )}
            </dl>
            {unavailable && (
              <div className="map-source-status" role="status">
                {state.status === 'partial'
                  ? t(
                      'Một phần nền chưa tải được',
                      'Some basemap tiles are unavailable'
                    )
                  : state.status === 'unavailable'
                    ? t(
                        'Mô hình chưa hỗ trợ nền khu vực',
                        'Regional basemap unavailable for this model'
                      )
                    : t(
                        'Không tải được nền khu vực',
                        'Regional basemap unavailable'
                      )}
                {(state.status === 'error' || state.status === 'partial') && (
                  <button onClick={onRetry}>{t('Thử lại', 'Retry')}</button>
                )}
              </div>
            )}
            {state.loaded > 0 && (
              <p className="map-source-license">
                {state.style === 'satellite' ? (
                  imageryCredit
                ) : (
                  <>
                    <a
                      href="https://maps.eox.at"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Terrain Light
                    </a>{' '}
                    / Data ©{' '}
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noreferrer"
                    >
                      OpenStreetMap contributors
                    </a>{' '}
                    &amp;{' '}
                    <a
                      href="https://maps.eox.at/#data"
                      target="_blank"
                      rel="noreferrer"
                    >
                      others
                    </a>{' '}
                    / Rendering ©{' '}
                    <a href="https://eox.at" target="_blank" rel="noreferrer">
                      EOX
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
