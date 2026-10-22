"""A tile failing twice must recover without leaving an error or a coarse overlay."""
from browser_preferences import use_vietnamese
import argparse, base64
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6LAAAAABJRU5ErkJggg==')

def run(url, chrome):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=chrome)
        page = use_vietnamese(browser.new_page(viewport={'width':1440,'height':960}))
        first = None
        failures = 0
        errors = []
        def request(route):
            nonlocal first, failures
            target = route.request.url
            if target.startswith(url+'/'):
                route.continue_()
            elif 'server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' in target:
                path = urlsplit(target).path
                if first is None: first = path
                if path == first and failures < 2:
                    failures += 1
                    route.fulfill(status=503, body='Temporary outage')
                else:
                    route.fulfill(status=200, content_type='image/png', body=PNG)
            else:
                route.abort()
        page.route('**/*', request)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url+'/?map=2d&demoRole=manager')
        expect(page.locator('.incident-overview-heading')).to_be_visible(timeout=25000)
        expect(page.locator('.map-2d img[data-retry="2"].leaflet-tile-loaded')).to_be_visible(timeout=15000)
        # The local image remains underneath ready opaque tiles to fill future pan gaps.
        expect(page.locator('.map-2d img.leaflet-image-layer[alt="Ảnh nền khu vực Chế Tạo"]')).to_have_css('opacity', '1')
        assert page.locator('.leaflet-dear-imagery-pane').evaluate("p => +getComputedStyle(p).zIndex < +getComputedStyle(document.querySelector('.leaflet-tile-pane')).zIndex")
        expect(page.locator('.map-source-warning')).to_have_count(0)
        expect(page.locator('.map-credit')).to_have_count(0)
        page.get_by_role('button',name='Nguồn bản đồ',exact=True).click()
        expect(page.locator('.map-source-license')).to_contain_text('Esri')
        page.keyboard.press('Escape')
        page.get_by_role('button', name='Nguồn bản đồ', exact=True).click()
        expect(page.locator('.map-source-popover')).to_contain_text('Esri World Imagery')
        expect(page.locator('.map-source-popover')).not_to_contain_text('10 m/pixel')
        # Check the imagery license specifically; place references have their own license.
        expect(page.locator('.map-source-license')).not_to_contain_text('CC BY 4.0')
        assert failures == 2 and not errors, errors
        browser.close()
    print('Basemap recovery passed: repeated tile failures recover, warning clears, detailed tiles draw above the retained local fallback.')

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:5174');parser.add_argument('--chrome')
    args=parser.parse_args();run(args.url.rstrip('/'),args.chrome)
