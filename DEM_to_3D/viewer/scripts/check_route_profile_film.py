"""Prepared cross-DEM profile and short film regression, using the shipped corridor."""
import argparse
from pathlib import Path
from playwright.sync_api import expect,sync_playwright


def run(url,chrome,captures=None):
    if captures:captures.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,**({'executable_path':chrome} if chrome else {}))
        page=browser.new_page(viewport={'width':1440,'height':960});errors=[];requests=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda request:requests.append(request.url))
        page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(url+'/') else route.abort())
        page.goto(url+'/?map=2d&offline=1&demoRole=manager')
        expect(page.locator('.incident-overview-heading')).to_be_visible(timeout=30000)
        page.locator('.workspace-nav').get_by_role('button',name='Đường sá',exact=True).click()
        page.locator('#response-panel .impact-row').filter(has_text='đoạn 3').click()
        page.locator('#response-details').get_by_role('button',name='Mặt cắt địa hình',exact=True).click()
        panel=page.locator('.profile-panel')
        expect(panel).to_be_visible()
        expect(panel.locator('.profile-coverage')).to_have_count(0)
        expect(panel.locator('.profile-stats')).to_contain_text('Độ cao tăng')
        assert not any('.glb' in request for request in requests),'2D profile loaded a 3D mesh'
        # Every part of E8 is covered by one of the two DEMs, including the old empty half.
        slider=page.locator('#profile-dist-slider')
        for value in [0,1000,3000,4000,6500,7300]:
            slider.evaluate("(el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}",value)
            expect(page.locator('.map-profile-point-2d')).to_have_count(1)
            page.wait_for_function("""()=>{
                const node=document.querySelector('.map-profile-point-2d');if(!node)return false;
                const point=node.getBoundingClientRect();
                const map=document.querySelector('.map-2d-surface').getBoundingClientRect();
                const dock=document.querySelector('#response-details').getBoundingClientRect();
                return point.left>=map.left+10 && point.right<Math.min(map.right,dock.left)-10 && point.top>=map.top && point.bottom<map.bottom;
            }""")
        if captures:page.screenshot(path=str(captures/'complete-profile.png'))
        position_before=slider.input_value()
        page.get_by_role('button',name='Chuyển sang 3D',exact=True).click()
        expect(page.locator('canvas.terrain-canvas')).to_be_visible(timeout=30000)
        expect(page.locator('.map-pin[data-map-object="hazard:LS-01"]')).to_be_visible(timeout=30000)
        expect(slider).to_have_value(position_before)
        for value in [1000,7300]:
            slider.evaluate("(el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));}",value)
            page.wait_for_function("""()=>{
                const el=document.querySelector('.map-profile-point');if(!el||el.hidden)return false;
                const point=el.getBoundingClientRect(),map=document.querySelector('canvas.terrain-canvas').getBoundingClientRect(),dock=document.querySelector('#response-details').getBoundingClientRect();
                return point.left>=map.left+10 && point.right<Math.min(map.right,dock.left)-10 && point.top>=map.top && point.bottom<map.bottom;
            }""")
        if captures:page.screenshot(path=str(captures/'profile-3d.png'))
        page.get_by_role('button',name='Đóng mặt cắt',exact=True).click()
        page.get_by_role('button',name='Công cụ bổ sung',exact=True).click()
        page.get_by_role('button',name='Xem tuyến 3D',exact=True).click()
        page.get_by_role('button',name='Bắt đầu xem',exact=True).click()
        page.get_by_role('button',name='Tạm dừng',exact=True).click(timeout=60000)
        timeline=page.get_by_role('slider',name='Tiến trình xem tuyến',exact=True)
        expect(timeline).to_have_attribute('max','25')
        speed=page.get_by_role('combobox',name='Tốc độ phát',exact=True)
        speed.select_option('1.5');expect(speed).to_have_value('1.5')
        before=float(timeline.input_value())
        page.get_by_role('button',name='Tiếp tục',exact=True).click()
        # Shared CI runners render in software. Wait for actual playback rather
        # than treating 500 ms of browser wall time as a frame-rate guarantee.
        # Exact rate multiplication is covered with a controlled controller clock.
        page.wait_for_function("before => Number(document.querySelector('.flyover-seek').value) > before",arg=before,timeout=10000)
        page.get_by_role('button',name='Tạm dừng',exact=True).click()
        assert float(timeline.input_value())>before
        speed.select_option('1');expect(speed).to_have_value('1')
        for time in [0,6,11,17,21,24.9]:
            timeline.fill(str(time));page.wait_for_timeout(150)
            if captures:page.screenshot(path=str(captures/f'film-{time}.png'))
        page.get_by_role('button',name='Thoát chế độ xem 3D',exact=True).click()
        assert not errors,errors
        browser.close()
    print('Cross-DEM profile passed: E8 has no missing half, cursor stays clear of dock, no GLB in 2D; 25-second film, speed selector and closing overview.')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:5384');p.add_argument('--chrome');p.add_argument('--captures',type=Path)
    a=p.parse_args();run(a.url.rstrip('/'),a.chrome,a.captures)
