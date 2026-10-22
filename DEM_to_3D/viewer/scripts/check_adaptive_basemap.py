"""Verify background Internet detail without a source selector or loss of local imagery."""
import argparse
import urllib.request
from playwright.sync_api import sync_playwright, expect


def run(base, chrome):
    with urllib.request.urlopen(base+'/offline-map/imagery/12/3230/1793.webp') as response:
        fixture=response.read()
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True,executable_path=chrome)
        for mode,succeeds in [('2d',True),('3d',True),('2d',False),('3d',False)]:
            context=browser.new_context(viewport={'width':1440,'height':960})
            context.add_init_script('window.demoConnected=true;Object.defineProperty(navigator,"onLine",{get:()=>window.demoConnected})')
            remote,errors=[],[]
            def route(request):
                if request.request.url.startswith(base+'/'): request.continue_()
                elif '/World_Imagery/MapServer/tile/' in request.request.url:
                    remote.append(request.request.url)
                    if succeeds: request.fulfill(body=fixture,content_type='image/webp')
                    else: request.abort()
                else: request.abort()
            context.route('**/*',route)
            page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('console',lambda message:errors.append(message.text) if message.type=='error' and ('Shader Error' in message.text or 'VALIDATE_STATUS' in message.text) else None)
            page.goto(base+'/?map='+mode+'&demoRole=manager&lang=en')
            expect(page.locator('.incident-overview-heading')).to_be_visible(timeout=30000)
            # The initial overview also uses the web source, without a zoom gesture.
            page.wait_for_function("""()=>performance.getEntriesByType('resource').some(e=>e.name.includes('/World_Imagery/'))""",timeout=30000)
            assert remote,'No automatic Internet imagery at overview'
            page.locator('.incident-landslide-row').first.click()
            detail=page.locator('#response-details')
            expect(detail.locator('.field-photo-strip-grid img')).to_have_count(4,timeout=30000)
            heading=detail.locator('h1,h2').first.inner_text()
            page.evaluate('window.retainedMap=document.querySelector(".terrain-canvas")')
            for _ in range(8): page.get_by_role('button',name='Zoom in',exact=True).click()
            if mode=='2d' and succeeds:
                page.wait_for_function("""()=>[...document.querySelectorAll('img.leaflet-tile')].some(i=>i.src.includes('/World_Imagery/')&&i.complete&&i.naturalWidth===256)""",timeout=30000)
                assert page.locator('img.leaflet-tile[src*="/offline-map/imagery/"]').count()>0
            else:
                page.wait_for_function("""()=>performance.getEntriesByType('resource').some(e=>e.name.includes('/World_Imagery/'))""",timeout=30000)
            page.wait_for_timeout(500)
            assert remote,'No automatic Internet refinement'
            if mode=='2d' and not succeeds:
                expect(page.locator('img.leaflet-tile[src*="/World_Imagery/"]')).to_have_count(0)
                assert page.locator('img.leaflet-tile[src*="/offline-map/imagery/"]').count()>0
            page.evaluate('window.demoConnected=false;window.dispatchEvent(new Event("offline"))')
            page.get_by_role('button',name='Zoom out',exact=True).click()
            expect(detail.locator('h1,h2').first).to_have_text(heading)
            assert page.evaluate('window.retainedMap===document.querySelector(".terrain-canvas")')
            expect(page.get_by_role('combobox',name='Basemap source',exact=True)).to_have_count(0)
            if mode=='2d': expect(page.locator('img.leaflet-tile[src*="/World_Imagery/"]')).to_have_count(0)
            assert not errors,errors
            context.close()
            print('Adaptive basemap passed:',mode,'Internet success' if succeeds else 'Internet failure','automatic detail, retained offline base/map/selection, no selector.',flush=True)
        browser.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--url',required=True);parser.add_argument('--chrome')
    args=parser.parse_args();run(args.url.rstrip('/'),args.chrome)
