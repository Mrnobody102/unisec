"""GPU regression: terrain strokes remain narrow at grazing angles and after resize."""
import argparse
from playwright.sync_api import sync_playwright


def run(url,chrome):
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,**({'executable_path':chrome} if chrome else {}))
        page=browser.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('console',lambda message:errors.append(message.text) if message.type=='error' else None)
        page.route(url+'/surface-fixture',lambda route:route.fulfill(content_type='text/html',body='<html><body></body></html>'))
        page.goto(url+'/surface-fixture')
        proof=page.evaluate("""async()=>{
          const THREE=await import('/node_modules/three/build/three.module.js');
          const {Line2}=await import('/node_modules/three/examples/jsm/lines/Line2.js');
          const {LineMaterial}=await import('/node_modules/three/examples/jsm/lines/LineMaterial.js');
          const {surfaceLineGeometry,stabiliseSurfaceLine}=await import('/src/terrain/surfaceLine.ts');
          const {setBasemapTone}=await import('/src/terrain/basemapTone.ts');
          const {basemapTones,tonedChannel}=await import('/src/features/imagery/basemapTone.ts');
          const renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true,preserveDrawingBuffer:true});
          renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(1);renderer.setSize(640,360);
          const scene=new THREE.Scene();scene.background=new THREE.Color('black');
          const camera=new THREE.PerspectiveCamera(45,640/360,.1,1000000);
          const positions=[];
          for(let i=-100;i<=100;i++){
            const x=i*100,y=400*Math.sin(i*.08),z=-i*5;
            positions.push(x,y,z,x+.00001,y,z+.00001);
          }
          const material=stabiliseSurfaceLine(new LineMaterial({color:'white',linewidth:1.8,depthWrite:false}));
          const geometry=surfaceLineGeometry(positions),line=new Line2(geometry,material);line.computeLineDistances();scene.add(line);
          const summaries=[];
          for(const [width,height,eye] of [[640,360,[0,4000,12000]],[640,360,[0,50,12000]],[1920,1080,[0,30,400]],[640,360,[15000,10,50]]]){
            renderer.setSize(width,height);camera.aspect=width/height;camera.position.set(...eye);camera.lookAt(0,0,0);camera.updateProjectionMatrix();renderer.render(scene,camera);
            const gl=renderer.getContext(),pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
            let white=0,maxRun=0;
            for(let x=0;x<width;x++){
              let run=0;
              for(let y=0;y<height;y++){
                const n=(y*width+x)*4,lit=pixels[n]>220&&pixels[n+1]>220&&pixels[n+2]>220;
                if(lit){white++;run++;maxRun=Math.max(run,maxRun);}else run=0;
              }
            }
            summaries.push({width,height,white,maxRun});
          }
          // Segments straddling the actual near plane and entirely behind the eye.
          scene.remove(line);geometry.dispose();material.dispose();
          const nearProof=[];
          for(const vertices of [[-4,0,2,4,0,-40],[-4,0,.01,4,0,-40],[-4,0,1,4,0,5]]){
            const geo=surfaceLineGeometry(vertices),mat=stabiliseSurfaceLine(new LineMaterial({color:'white',linewidth:2}));
            const stroke=new Line2(geo,mat);scene.add(stroke);renderer.setSize(640,360);
            camera.position.set(0,0,0);camera.lookAt(0,0,-1);camera.aspect=640/360;camera.near=4;camera.updateProjectionMatrix();renderer.render(scene,camera);
            const gl=renderer.getContext(),pixels=new Uint8Array(640*360*4);gl.readPixels(0,0,640,360,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
            let white=0;for(let n=0;n<pixels.length;n+=4)if(pixels[n]>220)white++;
            nearProof.push(white);scene.remove(stroke);geo.dispose();mat.dispose();
          }

          const sample=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(100/255,120/255,80/255,THREE.SRGBColorSpace),toneMapped:false}));
          scene.add(sample);const ortho=new THREE.OrthographicCamera(-50,50,50,-50,1,100);ortho.position.z=50;
          renderer.setSize(64,64);setBasemapTone(sample.material,basemapTones.online);renderer.render(scene,ortho);
          const gl=renderer.getContext(),actual=new Uint8Array(4);gl.readPixels(32,32,1,1,gl.RGBA,gl.UNSIGNED_BYTE,actual);
          const expected=[100,120,80].map((value,i)=>tonedChannel(value,basemapTones.online[i]));
          setBasemapTone(sample.material,null);renderer.render(scene,ortho);const restored=new Uint8Array(4);gl.readPixels(32,32,1,1,gl.RGBA,gl.UNSIGNED_BYTE,restored);
          sample.geometry.dispose();sample.material.dispose();
          // A slanted DEM/context join must be closed geometrically. A changed
          // background colour makes cracks measurable without confusing clouds/roads.
          const {terrainBoundaryEdges}=await import('/src/terrain/terrainSeams.ts');
          const {createTerrainCoverageClip}=await import('/src/terrain/terrainCoverage.ts');
          const {tileGeometry,tileLonLat}=await import('/src/terrain/regionalBasemap.ts');
          const {pixelToProjected,projectedToScene}=await import('/src/terrain/coordinate.ts');
          const {default:proj4}=await import('/node_modules/.vite/deps/proj4.js');
          const original=await (await fetch('/terrain/che_tao_v2_tex.terrain.json')).json();
          const tile={x:1615,y:897,z:11},centre=proj4('EPSG:4326',original.crs.proj4,tileLonLat(tile.x+.5,tile.y+.5,tile.z));
          const metadata={...original,world_origin:{x:centre[0],y:centre[1]},elevation:{...original.elevation,base_elevation:0,exaggeration:1},grid:{...original.grid,shape:[3,3]},grid_transform:{...original.grid_transform,a:30,b:0,c:centre[0]-45,d:0,e:-30,f:centre[1]+45}};
          const grid=new Float32Array(9).fill(1000),surfaces=[{metadata,grid}],edges=terrainBoundaryEdges(surfaces);
          const terrain=new THREE.BufferGeometry(),v=[],ix=[];
          for(let r=0;r<3;r++)for(let c=0;c<3;c++){const p=projectedToScene(metadata,pixelToProjected(metadata,c,r),1000);v.push(p.x,p.y,p.z);}
          for(let r=0;r<2;r++)for(let c=0;c<2;c++){const a=r*3+c;ix.push(a,a+3,a+1,a+1,a+3,a+4);}
          terrain.setAttribute('position',new THREE.Float32BufferAttribute(v,3));terrain.setIndex(ix);terrain.computeVertexNormals();
          const join=new THREE.Scene();join.background=new THREE.Color('#ff00ff');join.add(new THREE.AmbientLight('white',Math.PI));
          const top=new THREE.Mesh(terrain,new THREE.MeshLambertMaterial({color:'#365c32',side:THREE.DoubleSide}));join.add(top);
          const contextMaterial=new THREE.MeshLambertMaterial({color:'#365c32',side:THREE.DoubleSide,depthWrite:false});
          const clip=createTerrainCoverageClip(surfaces,metadata.world_origin);clip.apply(contextMaterial);
          const context=new THREE.Mesh(tileGeometry(metadata,tile,()=>920),contextMaterial);context.renderOrder=2;join.add(context);
          const seamProof=[];renderer.setSize(640,360);camera.aspect=640/360;camera.near=1;camera.far=100000;camera.updateProjectionMatrix();
          for(const eye of [[100,1120,150],[-100,1120,150],[120,1080,-130]]){
            camera.position.set(...eye);camera.lookAt(0,990,0);
            const count=()=>{renderer.render(join,camera);const gl=renderer.getContext(),p=new Uint8Array(640*360*4);gl.readPixels(0,0,640,360,gl.RGBA,gl.UNSIGNED_BYTE,p);let holes=0;for(let i=0;i<p.length;i+=4)if(p[i]>220&&p[i+1]<30&&p[i+2]>220)holes++;return holes;};
            context.geometry.dispose();context.geometry=tileGeometry(metadata,tile,()=>920);const before=count();
            context.geometry.dispose();context.geometry=tileGeometry(metadata,tile,()=>920,edges);const after=count();
            seamProof.push({before,after});
          }
          context.geometry.dispose();contextMaterial.dispose();terrain.dispose();top.material.dispose();clip.dispose();
          // A focus page created after colour balancing must use the exact same
          // profile. Group nesting and load order cannot choose a different tone.
          const {createTerrainImagery,planImageryAtlases}=await import('/src/terrain/terrainImagery.ts');
          const root=new THREE.Group(),source=new THREE.Mesh(new THREE.PlaneGeometry(10,10).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'black'}));root.add(source);
          const imagery=createTerrainImagery(original,root,[source],19,4);
          imagery.setTone(basemapTones.online);imagery.setVisible(true);
          const atlasCanvas=document.createElement('canvas');atlasCanvas.width=atlasCanvas.height=2;
          atlasCanvas.getContext('2d').fillStyle='rgb(100,120,80)';atlasCanvas.getContext('2d').fillRect(0,0,2,2);
          const texture=new THREE.CanvasTexture(atlasCanvas);texture.colorSpace=THREE.SRGBColorSpace;
          const atlas={...planImageryAtlases(original,19).at(-1),texture,dispose:()=>texture.dispose()};
          const toneScene=new THREE.Scene();toneScene.add(root,new THREE.AmbientLight('white',Math.PI));
          const toneCamera=new THREE.OrthographicCamera(-4,4,4,-4,1,200);toneCamera.position.set(0,100,0);toneCamera.lookAt(0,0,0);
          renderer.setSize(64,64);
          const sampleTone=()=>{renderer.render(toneScene,toneCamera);const gl=renderer.getContext(),px=new Uint8Array(4);gl.readPixels(32,32,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);return [...px];};
          imagery.setDetail(atlas);const lateTone=sampleTone();
          imagery.primeDetail(atlas);imagery.setDetail(atlas);const cachedTone=sampleTone();
          imagery.setTone(null);const plainTone=sampleTone();
          imagery.primeDetail(null);imagery.dispose();source.geometry.dispose();source.material.dispose();texture.dispose();renderer.dispose();
          return {summaries,nearProof,seamProof,lateTone,cachedTone,plainTone,actual:[...actual],expected,restored:[...restored]};
        }""")
        assert all(0<count<3000 for count in proof['nearProof'][:2]) and proof['nearProof'][2]==0,proof
        assert all(0<item['white']<item['width']*12 for item in proof['summaries']),proof
        assert all(item['maxRun']<20 for item in proof['summaries']),proof
        assert all(abs(proof['actual'][i]-proof['expected'][i])<2 for i in range(3)),proof
        assert all(abs(proof['restored'][i]-[100,120,80][i])<2 for i in range(3)),proof
        assert all(item['before']>500 and item['after']<10 for item in proof['seamProof']),proof
        for name in ['lateTone','cachedTone']:
            assert all(abs(proof[name][i]-proof['expected'][i])<2 for i in range(3)),proof
        assert all(abs(proof['plainTone'][i]-[100,120,80][i])<2 for i in range(3)),proof
        assert not errors,errors
        browser.close();print('Surface lines and basemap GPU colours passed:',proof)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:5381');parser.add_argument('--chrome');args=parser.parse_args();run(args.url.rstrip('/'),args.chrome)
