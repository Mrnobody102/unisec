import {useEffect,useId} from 'react';
import {basemapTones} from './basemapTone';
/** Only base imagery receives these filters; EO overlays live in a separate pane. */
export function BasemapToneFilters({host,active,prepared=true}:{host:React.RefObject<HTMLElement>;active:boolean;prepared?:boolean}){
  const id='basemap-tone-'+useId().replace(/:/g,'');
  useEffect(()=>{
    const node=host.current;if(!node)return;
    node.classList.toggle('has-balanced-basemap',active);
    node.style.setProperty('--basemap-tone-online',`url(#${id}-online)`);
    node.style.setProperty('--basemap-tone-prepared',prepared?`url(#${id}-prepared)`:'none');
    return ()=>node.classList.remove('has-balanced-basemap');
  },[host,active,prepared,id]);
  return <svg aria-hidden="true" width="0" height="0" style={{position:'absolute',pointerEvents:'none'}}><defs>
    {(['online','prepared'] as const).map(key=><filter key={key} id={id+'-'+key} colorInterpolationFilters="sRGB"><feComponentTransfer>
      <feFuncR type="gamma" amplitude="1" exponent={basemapTones[key][0]} offset="0"/>
      <feFuncG type="gamma" amplitude="1" exponent={basemapTones[key][1]} offset="0"/>
      <feFuncB type="gamma" amplitude="1" exponent={basemapTones[key][2]} offset="0"/>
    </feComponentTransfer></filter>)}
  </defs></svg>;
}
