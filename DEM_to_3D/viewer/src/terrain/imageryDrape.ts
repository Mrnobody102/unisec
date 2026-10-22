import {basemapTones,type BasemapTone} from '../features/imagery/basemapTone';
import * as THREE from 'three';
import type { MapTile } from './regionalBasemap';
import type { ImageryDetailAtlas } from './imageryAtlas';

/** The same completed view image on the surrounding terrain, retaining its base outside the window. */
export function imageryDrape(material: THREE.MeshLambertMaterial, tile: MapTile) {
  const baseMap={value:null as THREE.Texture|null}, baseTransform={value:new THREE.Vector4()}, baseEnabled={value:0};
  const map={value:null as THREE.Texture|null}, transform={value:new THREE.Vector4()}, enabled={value:0};
  const viewGamma={value:new THREE.Vector3(1,1,1)},baseGamma={value:new THREE.Vector3(1,1,1)};
  let tone:BasemapTone|null=null,viewSource:ImageryDetailAtlas|null=null,baseSource:ImageryDetailAtlas|null=null;
  const updateGamma=()=>{
    for(const [uniform,atlas] of [[viewGamma,viewSource],[baseGamma,baseSource]] as const){
      uniform.value.set(...(tone&&atlas?.source==='online'?basemapTones.online.map((value,i)=>value/tone![i]):[1,1,1]) as [number,number,number]);
    }
  };
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{viewGamma,baseGamma,viewMap:map,viewTransform:transform,viewEnabled:enabled,contextBaseMap:baseMap,contextBaseTransform:baseTransform,contextBaseEnabled:baseEnabled});
    shader.fragmentShader=`uniform vec3 viewGamma; uniform vec3 baseGamma;
vec3 drapeEncode(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-.055,step(vec3(.0031308),c));}
vec3 drapeDecode(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
vec4 drapeSourceTone(vec4 c,vec3 gamma){return vec4(drapeDecode(pow(clamp(drapeEncode(c.rgb),0.0,1.0),gamma)),c.a);}
`+'uniform sampler2D contextBaseMap; uniform vec4 contextBaseTransform; uniform float contextBaseEnabled;\n'+'uniform sampler2D viewMap;\nuniform vec4 viewTransform;\nuniform float viewEnabled;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec4 baseTint=diffuseColor;
      #include <map_fragment>
      if(contextBaseEnabled>0.5){
        vec2 baseUv=vMapUv*contextBaseTransform.xy+contextBaseTransform.zw;
        vec2 edge=min(baseUv,1.0-baseUv);
        if(min(edge.x,edge.y)>0.0) diffuseColor=mix(diffuseColor,baseTint*drapeSourceTone(texture2D(contextBaseMap,baseUv),baseGamma),smoothstep(0.0,0.015,min(edge.x,edge.y)));
      }
      if(viewEnabled>0.5){
        vec2 detailUv=vMapUv*viewTransform.xy+viewTransform.zw;
        vec2 edge=min(detailUv,1.0-detailUv);
        if(min(edge.x,edge.y)>0.0){
          float blend=smoothstep(0.0,0.015,min(edge.x,edge.y));
          diffuseColor=mix(diffuseColor,baseTint*drapeSourceTone(texture2D(viewMap,detailUv),viewGamma),blend);
        }
      }`);
  };
  const setDetail=(atlas:ImageryDetailAtlas|null)=>{
    viewSource=atlas;updateGamma();
    enabled.value=atlas?1:0;map.value=atlas?.texture??null;
    if(!atlas)return;
    const ratio=2**(atlas.zoom-tile.z),w=atlas.maxX-atlas.minX,h=atlas.maxY-atlas.minY;
    transform.value.set(ratio/w,ratio/h,(tile.x*ratio-atlas.minX)/w,(atlas.maxY-(tile.y+1)*ratio)/h);
  };
  return Object.assign(setDetail,{setTone(value:BasemapTone|null){tone=value;updateGamma();},setBase(atlas:ImageryDetailAtlas|null){
    baseSource=atlas;updateGamma();
    baseEnabled.value=atlas?1:0;baseMap.value=atlas?.texture??null;
    if(!atlas)return;
    const ratio=2**(atlas.zoom-tile.z),w=atlas.maxX-atlas.minX,h=atlas.maxY-atlas.minY;
    baseTransform.value.set(ratio/w,ratio/h,(tile.x*ratio-atlas.minX)/w,(atlas.maxY-(tile.y+1)*ratio)/h);
  }});
}
