import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';

/** Drape intersections can differ by less than GPU float precision. Drop consecutive
 * coincident vertices before a screen-space extrusion normalises their direction. */
export function surfaceLineGeometry(positions:number[]):LineGeometry {
  const clean:number[]=[];
  for(let i=0;i+2<positions.length;i+=3){
    const point=positions.slice(i,i+3).map(Math.fround);
    if(point.some(value=>!Number.isFinite(value)))throw new Error('Invalid surface line');
    if(clean.length && Math.hypot(point[0]-clean.at(-3)!,point[1]-clean.at(-2)!,point[2]-clean.at(-1)!)<.01)continue;
    clean.push(...point);
  }
  const geometry=new LineGeometry();
  if(clean.length>=6)geometry.setPositions(clean);
  else {const point=clean.length?clean:[0,0,0];geometry.setPositions([...point,...point]);geometry.instanceCount=0;}
  return geometry;
}

/** A segment viewed end-on has no screen direction. Avoid dividing by zero; let
 * the ordinary depth test clip it against the terrain rather than drawing a spike. */
export function stabiliseSurfaceLine(material:LineMaterial):LineMaterial {
  material.alphaToCoverage=true;
  material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('dir = normalize( dir );',
      'float directionLength=length(dir); dir=directionLength>1e-7 ? dir/directionLength : vec2(1.0,0.0);');
  };
  material.customProgramCacheKey=()=> 'surface-line-v1';
  return material;
}
