import * as THREE from 'three';
import type { MapTile } from './regionalBasemap';
import type { ImageryDetailAtlas } from './imageryAtlas';

/** The same completed view image on the surrounding terrain, retaining its base outside the window. */
export function imageryDrape(material: THREE.MeshLambertMaterial, tile: MapTile) {
  const map={value:null as THREE.Texture|null}, transform={value:new THREE.Vector4()}, enabled={value:0};
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{viewMap:map,viewTransform:transform,viewEnabled:enabled});
    shader.fragmentShader='uniform sampler2D viewMap;\nuniform vec4 viewTransform;\nuniform float viewEnabled;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec4 baseTint=diffuseColor;
      #include <map_fragment>
      if(viewEnabled>0.5){
        vec2 detailUv=vMapUv*viewTransform.xy+viewTransform.zw;
        vec2 edge=min(detailUv,1.0-detailUv);
        if(min(edge.x,edge.y)>0.0){
          float blend=smoothstep(0.0,0.015,min(edge.x,edge.y));
          diffuseColor=mix(diffuseColor,baseTint*texture2D(viewMap,detailUv),blend);
        }
      }`);
  };
  return (atlas:ImageryDetailAtlas|null)=>{
    enabled.value=atlas?1:0;map.value=atlas?.texture??null;
    if(!atlas)return;
    const ratio=2**(atlas.zoom-tile.z),w=atlas.maxX-atlas.minX,h=atlas.maxY-atlas.minY;
    transform.value.set(ratio/w,ratio/h,(tile.x*ratio-atlas.minX)/w,(atlas.maxY-(tile.y+1)*ratio)/h);
  };
}
