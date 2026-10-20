import * as THREE from 'three';
import type {BasemapTone} from '../features/imagery/basemapTone';
const states=new WeakMap<THREE.Material,{value:THREE.Vector3}>();
/** Compose with tile/coverage shader hooks; apply sRGB display curves before lighting. */
export function setBasemapTone(material:THREE.Material,tone:BasemapTone|null):void {
  let uniform=states.get(material);
  if(!uniform){
    if(!tone)return;
    uniform={value:new THREE.Vector3(1,1,1)};states.set(material,uniform);
    const before=material.onBeforeCompile,key=material.customProgramCacheKey;
    material.onBeforeCompile=(shader,renderer)=>{
      before.call(material,shader,renderer);
      shader.uniforms.basemapGamma=uniform!;
      shader.fragmentShader=`uniform vec3 basemapGamma;
vec3 basemapEncode(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-.055,step(vec3(.0031308),c));}
vec3 basemapDecode(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
`+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\ndiffuseColor.rgb=basemapDecode(pow(clamp(basemapEncode(diffuseColor.rgb),0.0,1.0),basemapGamma));');
    };
    material.customProgramCacheKey=()=>key.call(material)+':basemap-tone-v1';material.needsUpdate=true;
  }
  uniform.value.set(...(tone?[tone[0],tone[1],tone[2]] as const:[1,1,1] as const));
}
