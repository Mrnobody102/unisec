"""A tile failing twice must recover without leaving an error or a coarse overlay."""
import argparse, base64
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6LAAAAABJRU5ErkJggg==')

def run(url, chrome):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=chrome)
        page = browser.new_page(viewport={'width':1440,'height':960})
        first = None
        failures = 0
        errors = []
        def request(route):
            nonlocal first, failures
            target = route.request.url
            if target.startswith(url+'/'):
                route.continue_()
            elif 'tiles.maps.eox.at/' in target:
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
        expect(page.locator('.incident-priority-row').first).to_be_visible(timeout=25000)
        expect(page.locator('.map-2d img[data-retry="2"].leaflet-tile-loaded')).to_be_visible(timeout=15000)
        # The local image remains underneath ready opaque tiles to fill future pan gaps.
        expect(page.locator('.map-2d img.leaflet-image-layer')).to_have_css('opacity', '1')
        assert page.locator('.leaflet-dear-imagery-pane').evaluate("p => +getComputedStyle(p).zIndex < +getComputedStyle(document.querySelector('.leaflet-tile-pane')).zIndex")
        expect(page.locator('.map-source-warning')).to_have_count(0)
        assert failures == 2 and not errors, errors
        browser.close()
    print('Basemap recovery passed: repeated tile failures recover, warning clears, detailed tiles draw above the retained local fallback.')

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:5174');parser.add_argument('--chrome')
    args=parser.parse_args();run(args.url.rstrip('/'),args.chrome)
