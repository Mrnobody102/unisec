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
          scene.remove(line);geometry.dispose();material.dispose();
          const sample=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(100/255,120/255,80/255,THREE.SRGBColorSpace),toneMapped:false}));
          scene.add(sample);const ortho=new THREE.OrthographicCamera(-50,50,50,-50,1,100);ortho.position.z=50;
          renderer.setSize(64,64);setBasemapTone(sample.material,basemapTones.online);renderer.render(scene,ortho);
          const gl=renderer.getContext(),actual=new Uint8Array(4);gl.readPixels(32,32,1,1,gl.RGBA,gl.UNSIGNED_BYTE,actual);
          const expected=[100,120,80].map((value,i)=>tonedChannel(value,basemapTones.online[i]));
          setBasemapTone(sample.material,null);renderer.render(scene,ortho);const restored=new Uint8Array(4);gl.readPixels(32,32,1,1,gl.RGBA,gl.UNSIGNED_BYTE,restored);
          sample.geometry.dispose();sample.material.dispose();renderer.dispose();
          return {summaries,actual:[...actual],expected,restored:[...restored]};
        }""")
        assert all(0<item['white']<item['width']*12 for item in proof['summaries']),proof
        assert all(item['maxRun']<20 for item in proof['summaries']),proof
        assert all(abs(proof['actual'][i]-proof['expected'][i])<2 for i in range(3)),proof
        assert all(abs(proof['restored'][i]-[100,120,80][i])<2 for i in range(3)),proof
        assert not errors,errors
        browser.close();print('Surface lines and basemap GPU colours passed:',proof)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:5381');parser.add_argument('--chrome');args=parser.parse_args();run(args.url.rstrip('/'),args.chrome)
