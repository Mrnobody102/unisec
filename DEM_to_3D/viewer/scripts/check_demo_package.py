"""Exercise a fresh Windows portable package with every remote request blocked."""
import argparse
import json
import os
import socket
import subprocess
import tempfile
import time
import urllib.request
import zipfile
import weakref
from pathlib import Path
from playwright.sync_api import Browser, BrowserContext, sync_playwright, expect
from start_demo import verify_package


def check_english_startup(base, chrome, captures=None):
    from start_demo import presentation_url
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=chrome)
        context = browser.new_context(viewport={'width': 1440, 'height': 960})
        external, errors = [], []
        context.on('request', lambda request: external.append(request.url) if request.url.startswith(('http:', 'https:')) and not request.url.startswith(base + '/') else None)
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base + '/') else route.abort())
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(presentation_url(base))
        expect(page.locator('html')).to_have_attribute('lang', 'en')
        page.get_by_role('radio', name='Response coordinator', exact=False).check()
        page.get_by_role('button', name='Enter app', exact=True).click()
        expect(page.locator('.incident-overview-heading')).to_be_visible(timeout=30000)
        page.locator('.incident-landslide-row').first.click()
        expect(page.locator('#response-details .field-photo-strip-grid img')).to_have_count(4, timeout=30000)
        if captures:
            captures.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(captures / 'offline-english.png'))
        page.get_by_role('button', name='Settings', exact=True).click()
        page.get_by_role('button', name='Tiếng Việt', exact=True).click()
        expect(page.locator('html')).to_have_attribute('lang', 'vi')
        page.reload()
        expect(page.locator('html')).to_have_attribute('lang', 'vi')
        expect(page.locator('.incident-overview-heading')).to_be_visible(timeout=30000)
        page.get_by_role('button', name='Cài đặt', exact=True).click()
        page.get_by_role('button', name='English', exact=True).click()
        page.reload()
        expect(page.locator('html')).to_have_attribute('lang', 'en')
        expect(page.locator('.workspace-nav').get_by_role('button', name='Roads', exact=True)).to_be_visible(timeout=30000)
        assert not external, external
        assert not errors, errors
        browser.close()
    print('Language preferences passed: English by default, Vietnamese/English switching and remembered selection after reload, without internet.', flush=True)


def check_local_map(base, chrome, captures=None):
    from browser_preferences import use_vietnamese
    from gis_browser_actions import map_tool
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=chrome)
        page = use_vietnamese(browser.new_page(viewport={'width': 1440, 'height': 960}))
        requests, failures, errors = [], [], []
        page.on('request', lambda request: requests.append(request.url))
        page.on('response', lambda response: failures.append((response.status, response.url)) if response.status >= 400 else None)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base + '/?map=2d&demoRole=manager')
        expect(page.locator('.incident-overview-heading')).to_be_visible(timeout=30000)
        page.wait_for_function("""()=>[...document.querySelectorAll('img.leaflet-tile')].some(image=>image.src.includes('/offline-map/imagery/')&&image.complete&&image.naturalWidth===256)""")
        if captures:
            captures.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(captures / 'offline-overview-2d.png'))
        map_tool(page, 'Dữ liệu GIS').click()
        basemap = page.get_by_role('combobox', name='Bản đồ nền GIS', exact=True)
        expect(basemap).to_have_value('satellite')
        page.wait_for_function("getComputedStyle(document.querySelector('.geodata-map .leaflet-tile-pane')).filter !== 'none'")
        basemap.select_option('terrain')
        page.wait_for_function("""()=>[...document.querySelectorAll('img.leaflet-tile')].some(image=>image.src.includes('/offline-map/terrain/')&&image.complete&&image.naturalWidth===256)""")
        page.wait_for_function("getComputedStyle(document.querySelector('.geodata-map .leaflet-tile-pane')).filter === 'none'")
        basemap.select_option('satellite')
        if captures:
            page.screenshot(path=str(captures / 'offline-gis-local-map.png'))
        page.goto(base + '/?map=3d&demoRole=manager')
        expect(page.locator('canvas.terrain-canvas')).to_be_visible(timeout=30000)
        page.wait_for_function("""()=>performance.getEntriesByType('resource').some(entry=>entry.name.includes('/offline-map/elevation/'))""")
        assert any('/offline-map/imagery/' in request for request in requests), requests
        assert any('/offline-map/terrain/' in request for request in requests), requests
        assert any('/offline-map/elevation/' in request for request in requests), requests
        assert not failures, failures
        assert not errors, errors
        browser.close()
    print('Local map passed: real XYZ images, both GIS base styles, 3D elevation and no HTTP/browser errors.', flush=True)


def run(archive, chrome=None, captures=None, video=None):
    if os.name != 'nt':
        raise RuntimeError('The bundled Windows runtime must be tested on Windows')
    from check_route_profile_film import run as profile
    from check_gis_draft_publish import run as gis
    from check_citizen_mobile import run as resident
    from check_cartographic_evidence import run as evidence
    from check_flyover import run as film

    with tempfile.TemporaryDirectory(prefix='DEAR offline kiểm thử ') as temporary:
        root = Path(temporary).resolve()
        with zipfile.ZipFile(archive) as package:
            for name in package.namelist():
                if not (root / name).resolve().is_relative_to(root):
                    raise ValueError('Unsafe package member')
            package.extractall(root)
        release = verify_package(root)
        assert release['portableWindowsX64'] and release['localMap'], release
        with socket.socket() as socket_probe:
            socket_probe.bind(('127.0.0.1', 0))
            port = socket_probe.getsockname()[1]
        base = f'http://127.0.0.1:{port}'
        with (root / 'server.log').open('w', encoding='utf8') as log:
            # The embedded runtime and packaged scripts must work independently of cwd/PATH.
            process = subprocess.Popen([str(root / 'runtime/python.exe'), str(root / 'scripts/start_demo.py'), '--no-browser', '--port', str(port)], cwd=root / 'runtime', stdout=log, stderr=log)
            try:
                for _ in range(120):
                    if process.poll() is not None:
                        raise RuntimeError((root / 'server.log').read_text(encoding='utf8'))
                    try:
                        with urllib.request.urlopen(base + '/api/health', timeout=1) as response:
                            assert json.load(response)['packageId']
                        break
                    except OSError:
                        time.sleep(.25)
                else:
                    raise TimeoutError('Portable launcher did not start')
                with urllib.request.urlopen(base + '/workspace-config.json') as response:
                    config = json.load(response)
                assert config['offline'] and config['localMap'] == '/offline-map/map.json', config
                # A second launcher must reuse this package, without terminating its server.
                duplicate = subprocess.run([str(root / 'runtime/python.exe'), str(root / 'scripts/start_demo.py'), '--no-browser', '--port', str(port)], cwd=root, capture_output=True, timeout=30)
                assert duplicate.returncode == 0, duplicate.stderr
                assert process.poll() is None

                external, seen = [], weakref.WeakSet()
                original_context, original_page = Browser.new_context, Browser.new_page
                original_context_page = BrowserContext.new_page

                def guard(context):
                    if context in seen:
                        return
                    seen.add(context)
                    context.on('request', lambda request: external.append(request.url) if request.url.startswith(('http:', 'https:')) and not request.url.startswith(base + '/') else None)
                    context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base + '/') or route.request.url.startswith(('blob:', 'data:')) else route.abort())

                def new_context(browser, *args, **kwargs):
                    context = original_context(browser, *args, **kwargs)
                    guard(context)
                    return context

                def new_page(browser, *args, **kwargs):
                    page = original_page(browser, *args, **kwargs)
                    guard(page.context)
                    return page

                def context_page(context, *args, **kwargs):
                    guard(context)
                    return original_context_page(context, *args, **kwargs)

                Browser.new_context, Browser.new_page, BrowserContext.new_page = new_context, new_page, context_page
                try:
                    steps = [('English competition startup', lambda: check_english_startup(base, chrome, captures)),
                             ('local map in all workspaces', lambda: check_local_map(base, chrome, captures)),
                             ('profile and film camera', lambda: profile(base, chrome, captures)),
                             ('GIS edit/publish', lambda: gis(base, chrome, captures)),
                             ('resident photo/audio/report', lambda: resident(base, chrome, captures)),
                             ('Planet/field photos and failure recovery', lambda: evidence(base, chrome, captures)),
                             ('MP4 encoding and decoded frames', lambda: film(base, chrome, video))]
                    for name, check in steps:
                        print('Offline: ' + name, flush=True)
                        check()
                        assert not external, external
                finally:
                    Browser.new_context, Browser.new_page, BrowserContext.new_page = original_context, original_page, original_context_page
            finally:
                process.terminate()
                process.wait(timeout=15)
    print('Portable demo passed: bundled runtime, Unicode path, duplicate launcher, local map and all flows with zero external requests.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--chrome')
    parser.add_argument('--captures', type=Path)
    parser.add_argument('--video', type=Path)
    args = parser.parse_args()
    run(args.archive, args.chrome, args.captures, args.video)
