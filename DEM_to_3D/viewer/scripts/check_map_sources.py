"""Browser regression for original KML coverage, symbol ownership and Vietnamese layout."""
import argparse
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


def run(url, captures):
    captures.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True,
            executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        context = browser.new_context(viewport={'width':1440, 'height':960})
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(url + '/') else route.abort())
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url + '/?map=2d&demoRole=manager', wait_until='domcontentloaded')
        expect(page.locator('.incident-landslide-row')).to_have_count(3, timeout=45000)
        page.wait_for_function("JSON.parse(localStorage.getItem('dear.gis.v2') || '{}').records?.length === 50")
        source = page.evaluate("JSON.parse(localStorage.getItem('dear.gis.v2'))")
        records = source['records']
        assert len([r for r in records if r['feature']['geometry']['type'] == 'Polygon']) == 47
        assert len([r for r in records if r['feature']['geometry']['type'] == 'Point']) == 3
        assert all(r['visible'] for r in records)
        expect(page.locator('.map-2d path.landslide-area')).to_have_count(47)
        expect(page.locator('.map-2d .survey-reference-point')).to_have_count(0)
        expect(page.locator('.map-pin.hazard.landslide')).to_have_count(3)
        expect(page.locator('.map-pin.hazard.landslide:not([hidden]):not(.is-label-hidden)')).to_have_count(3)
        expect(page.locator('.incident-landslide-row .photo-thumb img').first).to_be_visible(timeout=15000)
        page.screenshot(path=str(captures/'original-kml-overview.png'))
        page.get_by_role('button', name='Cài đặt', exact=True).click()
        cdp = context.new_cdp_session(page)
        cdp.send('DOM.enable')
        cdp.send('CSS.enable')
        for font in ('source', 'classic', 'plex', 'modern'):
            page.locator('.settings-font select').select_option(font)
            page.evaluate('document.fonts.ready')
            document = cdp.send('DOM.getDocument')['root']['nodeId']
            node = cdp.send('DOM.querySelector', {'nodeId':document, 'selector':'.settings-utilities .settings-link'})['nodeId']
            fonts = cdp.send('CSS.getPlatformFontsForNode', {'nodeId':node})['fonts']
            print('VIETNAMESE_FONT', font, [(f['familyName'],f['glyphCount'],f['isCustomFont']) for f in fonts], flush=True)
            assert all(f['isCustomFont'] for f in fonts), fonts
            for width in (1440, 390, 320):
                page.set_viewport_size({'width':width,'height':960})
                button = page.get_by_role('button', name='Hướng dẫn sử dụng', exact=True)
                expect(button).to_be_visible()
                assert button.evaluate('e => e.getBoundingClientRect().height < 45'), (font, width)
                menu = page.locator('#display-settings')
                assert menu.evaluate('e => e.scrollWidth <= e.clientWidth + 1')
                menu.screenshot(path=str(captures/f'settings-{font}-{width}.png'))
        page.set_viewport_size({'width':1440,'height':960})
        page.locator('.settings-font select').select_option('source')
        page.get_by_role('button', name='Đóng cài đặt', exact=True).click()
        page.locator('.incident-landslide-row').first.click()
        selected = page.locator('.map-pin.is-selected')
        expect(selected).to_have_count(1)
        assert selected.locator('.map-pin-icon').evaluate('e => getComputedStyle(e).display !== "none"')
        page.locator('#response-details').get_by_role('button', name='Sửa trong GIS', exact=True).click()
        workspace = page.locator('.geodata-workspace')
        expect(workspace).to_be_visible()
        expect(workspace.locator('path.landslide-area')).to_have_count(47)
        expect(workspace.locator('.survey-reference-point')).to_have_count(0)
        workspace.get_by_role('checkbox', name='Lớp tình huống', exact=True).uncheck()
        expect(workspace.locator('.survey-reference-point')).to_have_count(3)
        workspace.get_by_role('checkbox', name='Lớp tình huống', exact=True).check()
        expect(workspace.locator('.survey-reference-point')).to_have_count(0)
        workspace.locator('.geodata-task-nav').get_by_role('button', name='Dữ liệu', exact=True).click()
        expect(workspace.locator('.geodata-source-group')).to_have_count(1)
        workspace.locator('.geodata-feature').first.click()
        expect(workspace.locator('.map-selected-reference')).to_have_count(1)
        expect(workspace.locator('.map-pin.hazard.landslide')).to_have_count(2)
        workspace.screenshot(path=str(captures/'gis-source-selection.png'))
        workspace.get_by_role('button', name='Về bản đồ ứng phó', exact=True).click()
        card = page.locator('.field-map-card')
        expect(card).to_be_visible()
        for mode in ('3D', '2D', '3D', '2D'):
            page.get_by_role('button', name='Chuyển sang ' + mode, exact=True).click()
            selector = '.terrain-reference-point.is-selected' if mode == '3D' else '.survey-reference-point.map-selected-reference'
            expect(page.locator(selector)).to_have_count(1, timeout=45000)
            page.wait_for_function('''selector => {
                const marker = document.querySelector(selector), card = document.querySelector('.field-map-card'), map = document.querySelector('.map-canvas');
                if (!marker || marker.hidden || !card || !map) return false;
                const a=marker.getBoundingClientRect(), b=card.getBoundingClientRect(), c=map.getBoundingClientRect();
                return a.width > 0 && a.left > c.left + 8 && a.right < b.left - 8 && a.top > c.top + 8 && a.bottom < c.bottom - 8;
            }''', arg=selector, timeout=45000)
            print('SOURCE_SELECTION_RETAINED', mode, flush=True)
        assert not errors, errors
        browser.close()
        print('ORIGINAL_KML_AND_SYMBOLS_PASSED', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:5190')
    parser.add_argument('--captures', type=Path, required=True)
    args = parser.parse_args()
    run(args.url.rstrip('/'), args.captures)
