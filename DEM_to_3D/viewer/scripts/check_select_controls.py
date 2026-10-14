"""Check rendered select alignment, keyboard selection and native fallbacks."""
import argparse
from pathlib import Path
from playwright.sync_api import Error, expect, sync_playwright


def descendants(node):
    yield node
    for child in node.get('children', []) + node.get('shadowRoots', []):
        yield from descendants(child)


def check_controls(page):
    page.evaluate('document.fonts.ready')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    toolbar = page.locator('.geodata-workbench-toolbar:visible')
    if toolbar.count():
        assert toolbar.evaluate('n=>{const box=n.getBoundingClientRect();return [...n.children].filter(c=>getComputedStyle(c).display!==\"none\").every(c=>{const r=c.getBoundingClientRect();return r.top>=box.top-1&&r.bottom<=box.bottom+1})}'), 'GIS toolbar content overlaps adjacent controls'
    controls = page.locator('select:visible')
    assert controls.count() > 0
    for control in controls.all():
        metrics = control.evaluate('''s => {
          const c = getComputedStyle(s), o = getComputedStyle(s.selectedOptions[0]);
          return {label: s.getAttribute('aria-label') || s.value,
            appearance: c.appearance, font: c.fontFamily, size: c.fontSize,
            line: parseFloat(c.lineHeight) || parseFloat(c.fontSize) * 1.5, height: s.clientHeight,
            top: parseFloat(c.paddingTop), bottom: parseFloat(c.paddingBottom),
            right: parseFloat(c.paddingRight), optionFont: o.fontFamily,
            optionSize: o.fontSize};
        }''')
        assert metrics['height'] >= metrics['line'] + metrics['top'] + metrics['bottom'] - 1, metrics
        assert metrics['right'] >= 28, metrics
        if metrics['appearance'] == 'base-select':
            assert metrics['font'] == metrics['optionFont'], metrics
            assert metrics['size'] == metrics['optionSize'], metrics

    # Measure the browser's rendered value, including its UA shadow DOM. This
    # catches vertically displaced text even when the outer control looks correct.
    cdp = page.context.new_cdp_session(page)
    try:
        doc = cdp.send('DOM.getDocument', {'depth': -1, 'pierce': True})
        for node in descendants(doc['root']):
            if node.get('nodeName') != 'SELECT':
                continue
            try:
                box = cdp.send('DOM.getBoxModel', {'nodeId': node['nodeId']})['model']['border']
            except Error:  # Hidden controls have no layout box.
                continue
            for value in descendants(node):
                if '-internal-select-inner-element' not in value.get('attributes', []):
                    continue
                try:
                    text = cdp.send('DOM.getBoxModel', {'nodeId': value['nodeId']})['model']['content']
                except Error:
                    continue
                assert abs((box[1] + box[5] - text[1] - text[5]) / 2) <= 1, (box, text)
                assert text[0] >= box[0] + 8 and text[2] <= box[2] - 26, (box, text)
    finally:
        cdp.detach()


def run(url, chrome, captures):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=chrome)
        errors = []

        def new_page(**kwargs):
            context = browser.new_context(viewport={'width': 1440, 'height': 960}, **kwargs)
            context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(url + '/') else r.abort())
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            return page

        page = new_page()
        page.goto(url + '/?map=2d&workspace=geodata')
        basemap = page.locator('.geodata-map-toolbar select')
        expect(basemap).to_be_visible(timeout=25000)
        for font in ['plex', 'classic', 'modern', 'source']:
            for theme in ['light', 'dark']:
                page.evaluate('([f,t]) => {document.documentElement.dataset.font=f; document.documentElement.dataset.theme=t}', [font, theme])
                for width in [1440, 1024, 390, 320]:
                    page.set_viewport_size({'width': width, 'height': 960})
                    if width <= 760:
                        page.locator('.geodata-mobile-tabs button').last.click()
                    check_controls(page)
                page.set_viewport_size({'width': 1440, 'height': 960})
                basemap.click()
                page.keyboard.press('Home')
                page.keyboard.press('ArrowDown')
                page.keyboard.press('Enter')
                expect(basemap).to_have_value('terrain')
                expect(basemap).to_be_focused()
                basemap.click()
                if captures:
                    page.locator('.geodata-map-toolbar').screenshot(path=str(captures / f'select-{font}-{theme}.png'))
                    page.screenshot(path=str(captures / f'picker-{font}-{theme}.png'))
                page.keyboard.press('Escape')
                expect(basemap).to_be_focused()
                basemap.select_option('satellite')
        page.get_by_role('button', name='Vẽ vùng quan tâm', exact=True).click()
        expect(page.locator('.geodata-drawing-bar')).to_be_visible()
        page.set_viewport_size({'width': 320, 'height': 960})
        check_controls(page)
        page.set_viewport_size({'width': 1440, 'height': 960})
        basemap.click()
        page.keyboard.press('Escape')
        expect(page.locator('.geodata-drawing-bar')).to_be_visible()
        expect(basemap).to_be_focused()
        page.get_by_role('button', name='Hủy', exact=True).focus()
        page.keyboard.press('Escape')
        expect(page.locator('.geodata-drawing-bar')).not_to_be_visible()
        expect(page.locator('.geodata-workspace')).to_be_visible()
        page.context.close()

        page = new_page()
        page.context.add_init_script("localStorage.setItem('dear.locale', 'en')")
        page.goto(url + '/?map=2d&workspace=geodata')
        expect(page.get_by_role('combobox', name='GIS basemap', exact=True)).to_be_visible()
        check_controls(page)
        page.context.close()

        page = new_page(forced_colors='active')
        page.goto(url + '/?map=2d&workspace=geodata')
        expect(page.locator('.geodata-map-toolbar select')).to_be_visible()
        assert page.locator('.geodata-map-toolbar select').evaluate('s => getComputedStyle(s).appearance') == 'auto'
        check_controls(page)
        page.context.close()

        page = new_page(is_mobile=True, has_touch=True)
        page.goto(url + '/?map=2d&workspace=geodata')
        expect(page.locator('.geodata-map-toolbar select')).to_be_visible()
        assert page.locator('.geodata-map-toolbar select').evaluate('s => getComputedStyle(s).appearance') != 'base-select'
        check_controls(page)
        page.context.close()

        page = new_page()
        page.goto(url + '/?map=2d&offline=1')
        expect(page.locator('.demo-signin')).to_be_visible(timeout=25000)
        home = page.locator('.demo-signin select')
        original = home.locator('option').first.text_content()
        # Stress the same control with a long user-provided community name.
        home.evaluate('s => s.options[0].textContent = "Địa bàn cần xác minh ảnh hiện trường và đường tiếp cận ".repeat(3)')
        for width in [1440, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 960})
            check_controls(page)
            assert home.evaluate('s => getComputedStyle(s).textOverflow') == 'ellipsis'
            if captures:
                home.screenshot(path=str(captures / f'long-community-{width}.png'))
        home.evaluate('(s, text) => s.options[0].textContent = text', original)
        page.get_by_label('Tên hiển thị', exact=True).fill('Kiểm tra giao diện')
        page.get_by_role('button', name='Vào ứng dụng', exact=True).click()
        expect(page.locator('.citizen-workspace')).to_be_visible()
        for width in [1440, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 960})
            check_controls(page)
        page.context.close()

        page = new_page()
        page.goto(url + '/?map=2d&offline=1&demoRole=manager')
        page.get_by_role('button', name='Cài đặt hiển thị', exact=True).click(timeout=25000)
        check_controls(page)
        page.locator('.settings-menu select').click()
        page.keyboard.press('Home')
        page.keyboard.press('ArrowDown')
        page.keyboard.press('Enter')
        expect(page.locator('.settings-menu select')).to_have_value('classic')
        page.locator('.settings-menu select').click()
        page.keyboard.press('Escape')
        expect(page.locator('.settings-menu')).to_be_visible()
        expect(page.locator('.settings-menu select')).to_be_focused()
        page.keyboard.press('Escape')
        expect(page.locator('.settings-menu')).to_have_count(0)
        assert not errors, errors
        browser.close()
    print('Select controls passed: rendered value centered, matching picker fonts, arrow clearance, keyboard selection/focus, 4 fonts, VI/EN, light/dark, 320–1440px, long names, touch/forced-colors fallbacks, sign-in, resident and settings.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:5174')
    parser.add_argument('--chrome')
    parser.add_argument('--captures', type=Path)
    args = parser.parse_args()
    if args.captures:
        args.captures.mkdir(parents=True, exist_ok=True)
    run(args.url.rstrip('/'), args.chrome, args.captures)
