import * as THREE from 'three';
import type { ElevationSurface } from './regionalElevation';

/** A DEM cell exists only when all four vertices exist, matching the exporter.
 * This masks the geographic footprint, not screen pixels or an elevation offset. */
export function terrainCoverage(surface: ElevationSurface, origin: {x:number;y:number}) {
  const {metadata,grid}=surface,[rows,cols]=metadata.grid.shape;
  const width=cols-1,height=rows-1,data=new Uint8Array(width*height);
  for(let row=0;row<height;row++)for(let col=0;col<width;col++) {
    const p=row*cols+col;
    data[row*width+col]=[p,p+1,p+cols,p+cols+1].every(i=>Number.isFinite(grid[i]))?255:0;
  }
  const {a,b,c,d,e,f}=metadata.grid_transform,det=a*e-b*d;
  const x=origin.x-c,y=origin.y-f;
  const matrix=new THREE.Matrix3().set(e/det,-b/det,(e*x-b*y)/det-.5,
    -d/det,a/det,(-d*x+a*y)/det-.5,0,0,1);
  return {width,height,data,matrix};
}

/** Regional triangles can cross above a finer triangulated DEM even when their
 * vertices are lowered. Clip them to its true XY coverage instead of letting the
 * two differently sampled surfaces compete in depth. NoData holes stay open. */
export function createTerrainCoverageClip(surfaces: ElevationSurface[], origin: {x:number;y:number}) {
  const masks=surfaces.filter(s=>s.metadata.grid.shape.every(n=>n>1)).map(surface=>{
    const mask=terrainCoverage(surface,origin);
    const texture=new THREE.DataTexture(mask.data,mask.width,mask.height,THREE.RedFormat);
    texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;
    texture.needsUpdate=true;
    return {...mask,texture};
  });
  return {
    apply(material: THREE.Material) {
      if(!masks.length)return;
      const before=material.onBeforeCompile,key=material.customProgramCacheKey;
      material.onBeforeCompile=(shader,renderer)=>{
        before.call(material,shader,renderer);
        shader.vertexShader='attribute float terrainSeam; varying float vTerrainSeam; varying vec2 vContextXY;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvContextXY=vec2(position.x,-position.z); vTerrainSeam=terrainSeam;');
        shader.fragmentShader='varying float vTerrainSeam; varying vec2 vContextXY;\n'+masks.map((mask,i)=>{
          Object.assign(shader.uniforms,{[`coverageMap${i}`]:{value:mask.texture},[`coverageMatrix${i}`]:{value:mask.matrix},
            [`coverageSize${i}`]:{value:new THREE.Vector2(mask.width,mask.height)}});
          return `uniform sampler2D coverageMap${i}; uniform mat3 coverageMatrix${i}; uniform vec2 coverageSize${i};`;
        }).join('\n')+'\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',
          '#include <clipping_planes_fragment>\n'+masks.map((_,i)=>`{
            vec2 cell=(coverageMatrix${i}*vec3(vContextXY,1.0)).xy;
            if(vTerrainSeam<0.5 && all(greaterThanEqual(cell,vec2(0.0))) && all(lessThan(cell,coverageSize${i}))) {
              vec2 uv=(floor(cell)+0.5)/coverageSize${i};
              if(texture2D(coverageMap${i},uv).r>0.5) discard;
            }
          }`).join('\n'));
      };
      material.customProgramCacheKey=()=>key.call(material)+`:terrain-coverage-v2:${masks.length}`;
    },
    dispose(){masks.forEach(mask=>mask.texture.dispose());}
  };
}
