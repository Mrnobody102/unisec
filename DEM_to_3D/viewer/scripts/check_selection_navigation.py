"""Regression: detail closing, point zoom, selection across 2D/3D and inbox layout."""
from browser_preferences import use_vietnamese
import argparse
import base64
import json
from pathlib import Path
import re

from playwright.sync_api import expect, sync_playwright


def run(url, chrome, captures):
    captures.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=chrome,
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        context = use_vietnamese(browser.new_context(viewport={'width':1440,'height':960}, timezone_id='Asia/Bangkok'))
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(url + '/') else route.abort())
        page = use_vietnamese(context.new_page())
        errors = []
        console_errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        page.goto(url + '/?map=2d&demoRole=manager', wait_until='domcontentloaded')
        expect(page.locator('.incident-landslide-row').first).to_be_visible(timeout=45000)
        page.evaluate('document.fonts.ready')
        expect(page.locator('.incident-landslide-row .photo-thumb img').first).to_be_visible(timeout=15000)
        page.locator('#response-panel').screenshot(path=str(captures/'overview.png'))
        scale = lambda: page.locator('.leaflet-control-scale-line').first.inner_text()
        before = scale()
        row = page.locator('.incident-landslide-row').first
        selection = row.get_attribute('data-map-preview')
        title = row.locator('strong').inner_text()
        row.click()
        details = page.locator('#response-details')
        expect(details.locator('h1')).to_have_text(title)
        marker = page.locator(f'.map-pin.is-selected[data-map-object="{selection}"]')

        def visible_selection():
            page.wait_for_function('''key => {
                const pin = document.querySelector('.map-pin.is-selected[data-map-object="'+key+'"]');
                const map = document.querySelector('.map-canvas');
                const dock = document.querySelector('#response-details');
                if (!pin || pin.hidden || !map || !dock) return false;
                const a=pin.getBoundingClientRect(), b=map.getBoundingClientRect(), c=dock.getBoundingClientRect();
                return a.width>0 && a.left>b.left+8 && a.right<c.left-8 && a.top>b.top+8 && a.bottom<b.bottom-8;
            }''', arg=selection, timeout=45000)

        visible_selection()
        page.wait_for_timeout(650)
        def metres(label):
            value = float(re.search(r'[\d.]+', label).group())
            return value * (1000 if 'km' in label else 1)
        page.wait_for_function('''before => {
            const label=document.querySelector('.leaflet-control-scale-line')?.textContent ?? '';
            const number=parseFloat(label); return Number.isFinite(number) && number*(label.includes('km')?1000:1)<before;
        }''', arg=metres(before), timeout=10000)
        print('POINT_SCALE', before, '->', scale(), flush=True)
        assert metres(scale()) < metres(before), (before, scale())
        details.screenshot(path=str(captures/'hazard-detail.png'))
        expect(details.locator('.sheet-kind,.panel-parent')).to_have_count(0)
        details.locator('.hazard-impact .object-row').first.click()
        expect(details.locator('.sheet-kind,.panel-parent')).to_have_count(0)
        details.get_by_role('button', name='Đóng chi tiết đối tượng', exact=True).click()
        expect(details).to_have_count(0)
        expect(page.locator('.map-pin.is-selected')).to_have_count(0)
        expect(page.locator('.workspace-nav button[data-view="impact"]')).to_have_attribute('aria-current','page')
        page.locator('.workspace-nav button[data-view="incident"]').click()
        page.locator('.incident-landslide-row').filter(has_text=title).click()
        expect(details.locator('h1')).to_have_text(title)
        visible_selection()
        print('LINKED_ROAD_CLOSE_OK', flush=True)
        for mode in ('3D','2D','3D','2D'):
            page.get_by_role('button', name='Chuyển sang ' + mode, exact=True).click()
            if mode == '3D':
                expect(page.locator('.terrain-viewer .terrain-canvas')).to_be_visible(timeout=60000)
            else:
                expect(page.locator('.leaflet-container')).to_be_visible(timeout=30000)
            expect(details.locator('h1')).to_have_text(title)
            try:
                visible_selection()
            except Exception:
                page.screenshot(path=str(captures/'mode-focus-failure.png'))
                print('FOCUS_FAILURE', mode, page.locator('.map-pin.is-selected').evaluate_all('nodes=>nodes.map(n=>({key:n.dataset.mapObject,hidden:n.hidden,style:n.getAttribute("style"),rect:n.getBoundingClientRect().toJSON()}))'), flush=True)
                print('ERRORS', errors, flush=True)
                print('PAGE_STATE', page.url, page.locator('body').inner_text()[:2000], page.content()[:2000], console_errors[-10:], flush=True)
                raise
            page.wait_for_timeout(700)
            assert marker.evaluate('node => !node.hidden')
            print('SELECTION_RETAINED', mode, flush=True)
        page.screenshot(path=str(captures/'selection-workspace.png'))
        for width in (390,320):
            page.set_viewport_size({'width':width,'height':900})
            page.locator('.mobile-view-switch').get_by_role('button', name='Thông tin', exact=True).click()
            expect(details).to_be_visible()
            assert details.evaluate('node => node.scrollWidth <= node.clientWidth + 1')
            details.screenshot(path=str(captures/f'hazard-{width}.png'))
        page.set_viewport_size({'width':1440,'height':960})
        details.get_by_role('button', name='Đóng chi tiết đối tượng', exact=True).click()
        expect(details).to_have_count(0)
        print('CLOSE_TO_OVERVIEW_OK', flush=True)

        # Independent test reports in this browser context only.
        preview = page.evaluate('''async () => {
            const blob=await fetch('/scenarios/che-tao/field-photos/scar-2-img_0850.thumb.webp').then(r=>r.blob());
            const image=await createImageBitmap(blob), canvas=document.createElement('canvas');
            canvas.width=160;canvas.height=160;canvas.getContext('2d').drawImage(image,0,0,160,160);
            return canvas.toDataURL('image/jpeg');
        }''')
        photo_bytes = len(base64.b64decode(preview.split(',')[1]))
        records=[]
        for i in range(4):
            stamp=f'2026-10-{20-i:02d}T06:00:00Z'
            review=dict(status='checked' if i==0 else 'pending',note='Đã đối chiếu.' if i==0 else '',reviewer='Điều phối viên' if i==0 else '',reviewedAt=stamp if i==0 else '')
            submission=dict(schema='field-submission/v1',authorId='qa-resident',authorName='Người gửi thử nghiệm',role='resident',homeCommunityId=None,submittedAt=stamp,locationSource='manual',review=review)
            observation=dict(schema='field-observation/v1',kind='suspected-landslide',note='Đất đá tràn xuống mặt đường.',observedAt=stamp,observer='Người gửi thử nghiệm',accuracyM=None,status='unreviewed',updatedAt=stamp,
                photos=[dict(id=f'photo-{i}',name='Ảnh hiện trường',mime='image/jpeg',bytes=photo_bytes,width=160,height=160,preview=preview,sha256='a'*64,addedAt=stamp,exif={})])
            records.append(dict(id=f'qa-inbox-{i}',name=f'Ghi nhận đoạn đường {i+1}',role='reference',visible=True,source=dict(name='Browser regression fixture',format='coordinate',importedAt=stamp),feature=dict(type='Feature',geometry=dict(type='Point',coordinates=[104.045,21.76+i*.001]),properties=dict(dearSubmission=submission,dearObservation=observation))))
        page.evaluate('''records => {const stored=JSON.parse(localStorage.getItem('dear.gis.v2'));stored.records.push(...records);localStorage.setItem('dear.gis.v2',JSON.stringify(stored));}''', records)
        page.reload(wait_until='domcontentloaded')
        expect(page.locator('.incident-overview-heading')).to_be_visible(timeout=45000)
        page.get_by_role('button', name='Ghi nhận gửi đến', exact=True).click()
        inbox=page.locator('.report-inbox')
        expect(inbox.locator('.inbox-record-heading h3')).to_have_text('Ghi nhận đoạn đường 2')
        expect(inbox.locator('nav button[aria-pressed="true"]')).to_have_count(1)
        inbox.get_by_label('Nhận xét kiểm tra', exact=True).fill('Đã kiểm tra vị trí và ảnh.')
        inbox.get_by_role('button', name='Lưu kết quả', exact=True).click()
        expect(inbox.get_by_role('status')).to_contain_text('Đã lưu')
        expect(inbox.locator('.inbox-record-heading h3')).to_have_text('Ghi nhận đoạn đường 2')
        for width in (1440,390,320):
            page.set_viewport_size({'width':width,'height':900})
            page.wait_for_timeout(150)
            inbox.locator('article').evaluate('node => node.scrollTop = 0')
            assert inbox.evaluate('node => node.scrollWidth<=node.clientWidth+1')
            assert inbox.locator('article').evaluate('node => node.scrollWidth<=node.clientWidth+1')
            assert inbox.locator('nav button[aria-pressed="true"]').evaluate('node=>{const a=node.getBoundingClientRect(),b=node.parentElement.getBoundingClientRect();return a.left>=b.left && a.right<=b.right+1;}')
            inbox.screenshot(path=str(captures/f'inbox-{width}.png'))
        page.set_viewport_size({'width':1440,'height':960})
        page.evaluate("document.documentElement.dataset.theme='dark'")
        page.wait_for_timeout(250)
        inbox.screenshot(path=str(captures/'inbox-dark.png'))
        page.keyboard.press('Escape')
        expect(inbox).to_have_count(0)
        print('INBOX_SELECTION_REVIEW_RESPONSIVE_OK', flush=True)
        assert not errors, errors
        browser.close()
        print('SELECTION_AND_REVIEW_PASSED', flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:5174')
    parser.add_argument('--chrome')
    parser.add_argument('--captures', type=Path, required=True)
    args=parser.parse_args()
    run(args.url.rstrip('/'),args.chrome,args.captures)
