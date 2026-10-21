"""Exercise real 2D/3D map gestures and ensure symbols remain identifiable and stable."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


def run(url, chrome, captures=None):
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=chrome)
        page=browser.new_page(viewport={'width':1440,'height':960})
        page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url+'/') else r.abort())
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script("""{window.mapDrawCalls=0;
          for(const Type of [WebGLRenderingContext,WebGL2RenderingContext])
            for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']) {
              const original=Type.prototype[name];
              if(original) Type.prototype[name]=function(...args){mapDrawCalls++;return original.apply(this,args);};
            }
        }""")
        def audit_symbols():
            result=page.evaluate('''() => {
              const visible=[...document.querySelectorAll('.map-pin:not([hidden])')];
              return {count:visible.length, bad:visible.filter(pin=>{
                if(pin.classList.contains('is-cluster')) return !pin.querySelector('.map-pin-count')?.textContent;
                if(pin.classList.contains('is-selected')) return !pin.querySelector('.map-pin-shape svg')?.getBoundingClientRect().width;
                const icon=pin.querySelector('.map-pin-icon'),svg=icon?.querySelector('svg');
                return !svg || !svg.getBoundingClientRect().width || icon.hidden || icon.dataset.symbol==='overlap';
              }).map(pin=>pin.getAttribute('aria-label'))};
            }''')
            assert result['count']>0 and not result['bad'],result
            return result['count']
        for mode in ['2d','3d']:
            page.goto(url+'/?offline=1&map='+mode+'&demoRole=manager')
            expect(page.locator('.map-pin:visible').first).to_be_visible(timeout=30000)
            page.wait_for_timeout(1500)
            initial=audit_symbols()
            # Clear of the detail dock: 3D keeps the camera on selection, and controls always win.
            singles=page.locator('.map-pin:not([aria-haspopup]):visible')
            marker=next(singles.nth(i) for i in range(singles.count()) if singles.nth(i).bounding_box()['x']<980)
            marker.click()
            selected=page.locator('.map-pin.is-selected:visible').first
            expect(selected).to_be_visible()
            focus=page.evaluate("""() => {const a=document.activeElement;return {valid:a.matches('.map-pin.is-selected') || !!a.closest('#response-details'), tag:a.tagName, id:a.id, cls:a.className}}""")
            assert focus['valid'],focus
            page.wait_for_timeout(1500)
            # A tooltip over the actual symbol must not make that symbol vanish.
            page.evaluate('''() => {
              const pin=document.querySelector('.map-pin.is-selected:not([hidden])');
              const host=pin.closest('.map-marker-layer').parentElement, a=pin.getBoundingClientRect(),b=host.getBoundingClientRect();
              const tip=document.createElement('div');tip.className='leaflet-tooltip';tip.id='hover-symbol-probe';
              Object.assign(tip.style,{position:'absolute',left:(a.x-b.x)+'px',top:(a.y-b.y)+'px',width:a.width+'px',height:a.height+'px',transform:'none',pointerEvents:'none'});
              tip.textContent='Tooltip';host.append(tip);
            }''')
            page.wait_for_timeout(300)
            expect(selected).to_be_visible()
            audit_symbols()
            page.evaluate("document.getElementById('hover-symbol-probe').remove()")
            page.wait_for_timeout(1000)
            page.evaluate('''() => {
              window.idleMarkerChanges=0;window.idleMarkerMutations=[];
              window.idleMarkerObserver=new MutationObserver(rows=>{idleMarkerChanges+=rows.length;idleMarkerMutations.push(...rows.map(r=>({name:r.attributeName,node:r.target.className,value:r.attributeName?r.target.getAttribute(r.attributeName):''})));});
              idleMarkerObserver.observe(document.querySelector('.map-marker-layer'),{subtree:true,childList:true,attributes:true});
            }''')
            draws=page.evaluate('mapDrawCalls')
            for i in range(15):
                page.mouse.move(520+i*10,520+(i%3)*8)
                page.wait_for_timeout(25)
            idle=page.evaluate('idleMarkerObserver.disconnect(); idleMarkerChanges')
            assert idle==0,(mode,'idle marker DOM changes',idle,page.evaluate('idleMarkerMutations.slice(0,20)'))
            if mode=='3d':assert page.evaluate('mapDrawCalls')==draws,'Stationary map still renders WebGL frames'
            area=page.locator('.terrain-canvas').first.bounding_box()
            x=area['x']+area['width']*.42;y=area['y']+area['height']*.62
            # Pan, zoom and orbit through the actual input surface.
            for step in range(3):
                page.mouse.move(x,y);page.mouse.down()
                if mode=='3d':page.keyboard.down('Control')
                page.mouse.move(x+(-1 if step%2 else 1)*65,y+24,steps=12)
                page.mouse.up()
                if mode=='3d':page.keyboard.up('Control')
                page.mouse.wheel(0,-160 if step%2==0 else 160)
                page.wait_for_timeout(800)
                audit_symbols()
            page.get_by_role('button',name='Xem toàn khu vực',exact=True).click()
            page.wait_for_timeout(1200);audit_symbols()
            for other in ['3D' if mode=='2d' else '2D', mode.upper()]:
                page.get_by_role('button',name='Chuyển sang '+other,exact=True).click()
                expect(page.locator('.map-marker-layer')).to_have_count(1,timeout=30000)
                page.wait_for_timeout(1000);audit_symbols()
            if captures:
                captures.mkdir(parents=True,exist_ok=True)
                page.screenshot(path=str(captures/('map-motion-'+mode+'.png')))
            print(mode+': '+str(initial)+' visible symbols; no generic replacement, tooltip disappearance, idle DOM churn or duplicate marker layer')
        assert not errors,errors
        browser.close()
    print('Map motion checks passed: gestures, repeated mode changes, symbol presence, focus and stationary DOM.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',default='http://127.0.0.1:5321');parser.add_argument('--chrome',default=None);parser.add_argument('--captures',type=Path)
    args=parser.parse_args();run(args.url.rstrip('/'),args.chrome,args.captures)
