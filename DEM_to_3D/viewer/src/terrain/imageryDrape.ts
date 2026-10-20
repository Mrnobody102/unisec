import * as THREE from 'three';
import type { MapTile } from './regionalBasemap';
import type { ImageryDetailAtlas } from './imageryAtlas';

/** The same completed view image on the surrounding terrain, retaining its base outside the window. */
export function imageryDrape(material: THREE.MeshLambertMaterial, tile: MapTile) {
  const baseMap={value:null as THREE.Texture|null}, baseTransform={value:new THREE.Vector4()}, baseEnabled={value:0};
  const map={value:null as THREE.Texture|null}, transform={value:new THREE.Vector4()}, enabled={value:0};
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{viewMap:map,viewTransform:transform,viewEnabled:enabled,contextBaseMap:baseMap,contextBaseTransform:baseTransform,contextBaseEnabled:baseEnabled});
    shader.fragmentShader='uniform sampler2D contextBaseMap; uniform vec4 contextBaseTransform; uniform float contextBaseEnabled;\n'+'uniform sampler2D viewMap;\nuniform vec4 viewTransform;\nuniform float viewEnabled;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec4 baseTint=diffuseColor;
      #include <map_fragment>
      if(contextBaseEnabled>0.5){
        vec2 baseUv=vMapUv*contextBaseTransform.xy+contextBaseTransform.zw;
        vec2 edge=min(baseUv,1.0-baseUv);
        if(min(edge.x,edge.y)>0.0) diffuseColor=mix(diffuseColor,baseTint*texture2D(contextBaseMap,baseUv),smoothstep(0.0,0.015,min(edge.x,edge.y)));
      }
      if(viewEnabled>0.5){
        vec2 detailUv=vMapUv*viewTransform.xy+viewTransform.zw;
        vec2 edge=min(detailUv,1.0-detailUv);
        if(min(edge.x,edge.y)>0.0){
          float blend=smoothstep(0.0,0.015,min(edge.x,edge.y));
          diffuseColor=mix(diffuseColor,baseTint*texture2D(viewMap,detailUv),blend);
        }
      }`);
  };
  const setDetail=(atlas:ImageryDetailAtlas|null)=>{
    enabled.value=atlas?1:0;map.value=atlas?.texture??null;
    if(!atlas)return;
    const ratio=2**(atlas.zoom-tile.z),w=atlas.maxX-atlas.minX,h=atlas.maxY-atlas.minY;
    transform.value.set(ratio/w,ratio/h,(tile.x*ratio-atlas.minX)/w,(atlas.maxY-(tile.y+1)*ratio)/h);
  };
  return Object.assign(setDetail,{setBase(atlas:ImageryDetailAtlas|null){
    baseEnabled.value=atlas?1:0;baseMap.value=atlas?.texture??null;
    if(!atlas)return;
    const ratio=2**(atlas.zoom-tile.z),w=atlas.maxX-atlas.minX,h=atlas.maxY-atlas.minY;
    baseTransform.value.set(ratio/w,ratio/h,(tile.x*ratio-atlas.minX)/w,(atlas.maxY-(tile.y+1)*ratio)/h);
  }});
}
