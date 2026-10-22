import type { Locale } from '../types/dear';
import { UiIcon } from '../shared/ui/UiIcon';

/** No incident, source or timestamp is displayed before the dataset is validated. */
export function WorkspaceStartup({ locale, failed, failure, onRetry }: { locale: Locale; failed: boolean; failure?:{message:string;status?:number}|null; onRetry: () => void }) {
  return <div className="workspace" data-mobile="info">
    <header className="app-header"><div className="brand"><span className="brand-symbol"><UiIcon name="layers"/></span>DEAR</div></header>
    <main className="work-area">
      <div className="workspace-nav" aria-hidden="true"/>
      <aside className="sidebar"><div className="sidebar-top" role={failed ? 'alert' : 'status'}>
        <h1>{failed ? locale === 'vi' ? 'Chưa tải được dữ liệu' : 'Dataset unavailable' : locale === 'vi' ? 'Đang tải dữ liệu' : 'Loading dataset'}</h1>
        {failed && failure && <>
          {failure.status===403 && <p>{locale==='vi'?'Một tệp dữ liệu bị từ chối truy cập (HTTP 403). Kiểm tra quyền truy cập hoặc dùng gói offline.':'Access to a required data file was denied (HTTP 403). Check access or use the offline app.'}</p>}
          <p className="muted" style={{overflowWrap:'anywhere'}}>{failure.message}</p>
        </>}
        {failed && <button className="button soft" onClick={onRetry}>{locale === 'vi' ? 'Thử lại' : 'Retry'}</button>}
      </div></aside>
      <section className="map-area" aria-label={locale === 'vi' ? 'Bản đồ' : 'Map'}/>
    </main>
  </div>;
}
