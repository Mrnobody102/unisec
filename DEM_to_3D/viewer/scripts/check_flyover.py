"""Play the short flyover, then decode its actual MP4 and check the map survived export."""
import argparse
import tempfile
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


def run(url, chrome):
    with tempfile.TemporaryDirectory() as temp, sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=chrome)
        page=browser.new_page(viewport={'width':1280,'height':800})
        page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url+'/') else r.abort())
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('console',lambda message:print('Browser:',message.text[:500],flush=True) if message.type in ['error','warning'] and 'ERR_FAILED' not in message.text and 'Flyover' in message.text else None)
        page.goto(url+'/?offline=1&map=3d&demoRole=manager')
        expect(page.locator('.map-area > .flyover-launch')).to_have_count(0)
        page.get_by_role('button',name='Công cụ bổ sung',exact=True).click()
        page.get_by_role('button',name='Hành trình 3D',exact=True).click()
        play=page.get_by_role('button',name='Phát hành trình',exact=True)
        expect(play).to_be_enabled(timeout=30000);play.click()
        pause=page.get_by_role('button',name='Tạm dừng',exact=True)
        expect(pause).to_be_visible(timeout=60000);pause.click()
        duration=float(page.get_by_role('slider',name='Vị trí trong hành trình',exact=True).get_attribute('max'))
        assert duration==25,duration
        print(f'Playback uses a paced {duration:.2f}-second plan.',flush=True)
        page.get_by_role('button',name='Thoát hành trình',exact=True).click()
        expect(page.locator('.flyover-bar')).to_have_count(0)
        expect(page.locator('.map-advanced-tools .flyover-launch')).to_be_visible()
        page.get_by_role('button',name='Chuyển sang 2D',exact=True).click()
        expect(page.locator('canvas.terrain-canvas')).to_have_count(0)
        page.get_by_role('button',name='Hành trình 3D',exact=True).click()
        downloads=[];page.on('download',lambda download:downloads.append(download))
        page.get_by_role('button',name='Xuất video MP4',exact=True).click()
        previous=None
        for _ in range(240):
            if downloads:break
            message=page.locator('.flyover-message')
            assert not message.count() or 'Không' not in message.inner_text(),message.inner_text()
            progress=page.locator('.flyover-export-percent')
            current=progress.inner_text() if progress.count() else 'Preparing 3D'
            if current!=previous:print('Export:',current,flush=True);previous=current
            page.wait_for_timeout(1000)
        expect(page.get_by_role('dialog',name='Hành trình 3D',exact=True)).to_be_visible()
        expect(page.get_by_role('status').filter(has_text='Đã xuất video.')).to_be_visible()
        assert downloads,('No MP4 download',page.locator('body').inner_text()[-1200:],errors)
        file=Path(temp)/'flyover.mp4';downloads[0].save_as(file)
        assert file.stat().st_size>10000, 'MP4 is empty'
        page.route(url+'/export-proof.mp4',lambda r:r.fulfill(path=str(file),content_type='video/mp4'))
        proof=page.evaluate("""async () => {
          const video=document.createElement('video');video.muted=true;
          const url=URL.createObjectURL(await (await fetch('/export-proof.mp4')).blob());
          await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=reject;video.src=url;});
          const duration=video.duration, canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;
          const ctx=canvas.getContext('2d',{willReadFrequently:true});const frames=[];
          const catalog=await (await fetch('/scenarios/che-tao/field-photos/photos.json')).json();
          const sample=document.createElement('canvas');sample.width=32;sample.height=32;
          const sc=sample.getContext('2d',{willReadFrequently:true});
          const photos=await Promise.all(['IMG_0926','IMG_0850','IMG_0830'].map(async name=>{
            const photo=catalog.points.flatMap(p=>p.photos).find(p=>p.name===name);
            const bitmap=await createImageBitmap(await (await fetch('/scenarios/che-tao/field-photos/'+photo.image.url)).blob());
            sc.drawImage(bitmap,0,0,32,32);const expected=sc.getImageData(0,0,32,32).data;
            const fit=Math.min(310*1.2/bitmap.width,340*1.2/bitmap.height),w=bitmap.width*fit,h=bitmap.height*fit;
            bitmap.close();return {name,expected,w,h,error:Infinity,time:0};
          }));
          // Find each photo in the actual film rather than pinning the test to fixed stop times.
          for(let time=.5;time<duration;time+=1) {
            await new Promise(resolve=>{video.onseeked=resolve;video.currentTime=time;});
            await new Promise(resolve=>{video.requestVideoFrameCallback(resolve);setTimeout(resolve,200);});
            ctx.drawImage(video,0,0,160,90);const pixels=ctx.getImageData(0,0,160,90).data;
            let green=0;for(let i=0;i<pixels.length;i+=4)if((i/4)%160>=40 && pixels[i+1]>pixels[i]*1.08 && pixels[i+1]>pixels[i+2]*1.08 && pixels[i+1]>15)green++;
            let hash=2166136261;for(const byte of pixels)hash=Math.imul(hash^byte,16777619);
            frames.push({green:green/(120*90),hash:hash>>>0,time});
            for(const photo of photos) {
              const pad=7*1.2,x=24*1.2+pad,y=1080-64*1.2-photo.h-29*1.2-pad;
              sc.drawImage(video,x,y,photo.w,photo.h,0,0,32,32);const actual=sc.getImageData(0,0,32,32).data;
              let error=0;for(let i=0;i<actual.length;i++)if(i%4!==3)error+=Math.abs(actual[i]-photo.expected[i]);
              error/=32*32*3;if(error<photo.error){photo.error=error;photo.time=time;}
            }
          }
          const photoMatches=photos.map(({name,error,time})=>({name,error,time}));
          video.removeAttribute('src');video.load();URL.revokeObjectURL(url);return {duration,frames:[.25,.5,.75].map(f=>frames[Math.floor((frames.length-1)*f)]),photoMatches};
        }""")
        assert 24.99<=proof['duration']<=25.1,proof
        assert all(frame['green']>.04 for frame in proof['frames']),('Map missing from decoded video',proof)
        assert len({frame['hash'] for frame in proof['frames']})>1,('Exported map does not move',proof)
        assert all(photo['error']<16 for photo in proof['photoMatches']),('Matching field photograph missing from video',proof)
        assert not errors,errors
        browser.close()
        print('Flyover passed: 25-second MP4 with terrain and every matching field photo.',proof,flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:5381');parser.add_argument('--chrome');args=parser.parse_args()
    run(args.url.rstrip('/'),args.chrome)
