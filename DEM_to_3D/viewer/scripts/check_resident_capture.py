"""Fake camera lifecycle and reporting from the selected landslide boundary."""
from browser_preferences import use_vietnamese
import argparse
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from gis_browser_actions import published_records


def run(url, chrome, captures):
    captures.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True, executable_path=chrome,
            args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
        ctx=use_vietnamese(browser.new_context(viewport={'width':1440,'height':960},permissions=['camera'],reduced_motion='reduce'))
        ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url+'/') else r.abort())
        ctx.add_init_script('''
            window.cameraTracks=[];
            const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
            navigator.mediaDevices.getUserMedia=async options=>{
                const stream=await original(options);window.cameraTracks.push(...stream.getTracks());return stream;
            };
        ''')
        page=use_vietnamese(ctx.new_page());errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url+'/?map=2d&offline=1')
        page.get_by_label('Tên của bạn',exact=True).fill('Kiểm tra camera')
        page.get_by_role('button',name='Vào ứng dụng',exact=True).click()
        page.get_by_role('button',name='Gửi ghi nhận',exact=True).click()
        trigger=page.get_by_role('button',name='Chụp ảnh',exact=True)
        camera=page.get_by_role('dialog',name='Chụp ảnh hiện trường',exact=True)
        def open_camera():
            trigger.click()
            expect(camera).to_be_visible()
            expect(camera.get_by_role('button',name='Chụp',exact=True)).to_be_enabled(timeout=15000)
        def stopped():
            page.wait_for_function("cameraTracks.length>0&&cameraTracks.every(t=>t.readyState==='ended')")
            expect(trigger).to_be_focused()
        open_camera()
        for _ in range(5):
            page.keyboard.press('Tab')
            # Native dialogs may hand focus to browser chrome between cycles, but never to the form behind them.
            assert camera.evaluate('e=>document.activeElement===document.body||e.contains(document.activeElement)')
        page.keyboard.press('Escape');expect(camera).to_have_count(0);stopped()
        # Closing while JPEG encoding is pending must discard that capture.
        page.evaluate('''()=>{const original=HTMLCanvasElement.prototype.toBlob;
            HTMLCanvasElement.prototype.toBlob=function(callback,...args){
                original.call(this,blob=>setTimeout(()=>callback(blob),500),...args);
            };}''')
        open_camera();camera.get_by_role('button',name='Chụp',exact=True).click()
        camera.get_by_role('button',name='Hủy',exact=True).click();stopped()
        page.wait_for_timeout(650)
        expect(page.locator('.citizen-photo-strip li')).to_have_count(0)
        open_camera();camera.get_by_role('button',name='Chụp',exact=True).click()
        expect(camera).to_have_count(0)
        expect(page.locator('.citizen-photo-strip li')).to_have_count(1)
        stopped()
        print('CAMERA_CANCEL_CAPTURE_FOCUS_AND_CLEANUP_PASSED',flush=True)
        page.get_by_role('button',name='Thông tin đường',exact=True).click()
        page.locator('.citizen-mobile-switch').get_by_role('button',name='Bản đồ',exact=True).click()
        expect(page.locator('path.landslide-area')).to_have_count(47)
        record=next(r for r in published_records(page) if r['visible'] and 'dearLandslideArea' in r['feature']['properties'])
        page.locator('path.landslide-area').first.dispatch_event('click')
        card=page.locator('.citizen-place')
        expect(card.locator('h2')).to_have_text('Vùng sạt lở')
        card.get_by_role('button',name='Gửi ghi nhận tại đây',exact=True).click()
        lat=float(page.get_by_label('Vĩ độ ghi nhận',exact=True).input_value())
        lon=float(page.get_by_label('Kinh độ ghi nhận',exact=True).input_value())
        geometry=record['feature']['geometry']
        rings=geometry['coordinates'] if geometry['type']=='Polygon' else [ring for polygon in geometry['coordinates'] for ring in polygon]
        points=[p for ring in rings for p in ring]
        assert min(p[0] for p in points)-1e-6<=lon<=max(p[0] for p in points)+1e-6
        assert min(p[1] for p in points)-1e-6<=lat<=max(p[1] for p in points)+1e-6
        page.screenshot(path=str(captures/'report-selected-area.png'))
        assert not errors,errors
        print('SELECTED_AREA_REPORT_LOCATION_PASSED',flush=True)
        browser.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='http://127.0.0.1:5174')
    parser.add_argument('--chrome')
    parser.add_argument('--captures',type=Path,required=True)
    args=parser.parse_args()
    run(args.url.rstrip('/'),args.chrome,args.captures)
