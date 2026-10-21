import './analysis-imagery.css';
export type ImageryLoadState='off'|'loading'|'ready'|'error';
/** Only loading/failure needs an on-map message. The layers control owns source details. */
export function ImageryStatus({state,locale,onRetry}:{state:ImageryLoadState;locale:'vi'|'en';onRetry:()=>void}){
  if(state==='off'||state==='ready')return null;
  return <div className="analysis-load-status" role="status">
    <span>{state==='loading'?(locale==='vi'?'Đang tải ảnh vệ tinh…':'Loading satellite imagery…'):(locale==='vi'?'Chưa tải được lớp ảnh vệ tinh.':'Satellite imagery could not be loaded.')}</span>
    {state==='error'&&<button type="button" onClick={onRetry}>{locale==='vi'?'Thử lại':'Retry'}</button>}
  </div>;
}
