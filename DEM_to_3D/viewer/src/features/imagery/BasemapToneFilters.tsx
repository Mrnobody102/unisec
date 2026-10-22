import {useEffect,useId} from 'react';
import {basemapTones,contextBasemapTone} from './basemapTone';
/** Only base imagery receives these filters; EO overlays live in a separate pane. */
export function BasemapToneFilters({host,active,prepared=true}:{host:React.RefObject<HTMLElement>;active:boolean;prepared?:boolean}){
  const id='basemap-tone-'+useId().replace(/:/g,'');
  useEffect(()=>{
    const node=host.current;if(!node)return;
    node.classList.toggle('has-balanced-basemap',active);
    node.style.setProperty('--basemap-tone-internet',`url(#${id}-internet)`);
    node.style.setProperty('--basemap-tone-online',`url(#${id}-online)`);
    node.style.setProperty('--basemap-tone-prepared',prepared?`url(#${id}-prepared)`:'none');
    return ()=>node.classList.remove('has-balanced-basemap');
  },[host,active,prepared,id]);
  const tones={...basemapTones,online:contextBasemapTone(),internet:basemapTones.online};
  return <svg aria-hidden="true" width="0" height="0" style={{position:'absolute',pointerEvents:'none'}}><defs>
    {(['online','prepared','internet'] as const).map(key=><filter key={key} id={id+'-'+key} colorInterpolationFilters="sRGB"><feComponentTransfer>
      <feFuncR type="gamma" amplitude="1" exponent={tones[key][0]} offset="0"/>
      <feFuncG type="gamma" amplitude="1" exponent={tones[key][1]} offset="0"/>
      <feFuncB type="gamma" amplitude="1" exponent={tones[key][2]} offset="0"/>
    </feComponentTransfer></filter>)}
  </defs></svg>;
}
