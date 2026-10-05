"""Check map workspace controls, movable tool windows and label visibility."""
import argparse
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


def run(url, chrome, captures):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, **({'executable_path': chrome} if chrome else {}))
        context = browser.new_context(viewport={'width': 1366, 'height': 768}, permissions=['clipboard-read', 'clipboard-write'])
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(url + '/') else route.abort())
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        expect(page.locator('.leaflet-image-layer')).to_have_count(1, timeout=25000)
        page.get_by_role('button', name='Cài đặt hiển thị', exact=True).click()
        page.get_by_role('button', name='English', exact=True).click()
        page.keyboard.press('Escape')
        toolbar = page.locator('.map-toolbar')
        toggle = toolbar.get_by_role('button', name='Hide information panel', exact=True)
        expect(toggle).to_be_visible()
        assert toggle.bounding_box()['y'] == toolbar.bounding_box()['y'] + 1
        toggle.click()
        expect(page.locator('.sidebar')).to_be_hidden()
        toolbar.get_by_role('button', name='Show information panel', exact=True).click()
        expect(page.locator('.sidebar')).to_be_visible()
        legend = page.locator('.map-bottom-bar')
        legend.get_by_role('button', name='Minimize legend', exact=True).click()
        expect(legend.locator('.legend-item')).to_have_count(0)
        assert legend.bounding_box()['height'] <= 42
        legend.get_by_role('button', name='Legend', exact=True).click()
        assert legend.locator('.legend-item').count() >= 5

        def drag(handle, dx, dy):
            box = handle.bounding_box()
            page.mouse.move(box['x'] + 45, box['y'] + box['height'] / 2)
            page.mouse.down()
            page.mouse.move(box['x'] + 45 + dx, box['y'] + box['height'] / 2 + dy, steps=10)
            page.mouse.up()

        def assert_inside(panel):
            area, box = page.locator('.map-area').bounding_box(), panel.bounding_box()
            assert box['x'] >= area['x'] + 7 and box['y'] >= area['y'] + 63, (area, box)
            assert box['x'] + box['width'] <= area['x'] + area['width'] - 63, (area, box)
            assert box['y'] + box['height'] <= area['y'] + area['height'] - 31, (area, box)

        toolbar.get_by_role('button', name='Measure on 2D map', exact=True).click()
        measure = page.locator('.map-measure-panel')
        handle = measure.get_by_role('group', name='Measurement panel position', exact=True)
        original = measure.bounding_box()
        drag(handle, 170, 90)
        moved = measure.bounding_box()
        assert moved['x'] > original['x'] + 100 and moved['y'] > original['y'] + 60
        expect(page.locator('.map-measure-vertex')).to_have_count(0)
        assert_inside(measure)
        measure.get_by_role('button', name='Close measurement', exact=True).click()
        toolbar.get_by_role('button', name='Measure on 2D map', exact=True).click()
        assert abs(measure.bounding_box()['x'] - moved['x']) < 1
        handle.focus(); page.keyboard.press('ArrowRight')
        assert abs(measure.bounding_box()['x'] - moved['x'] - 16) < 1
        page.keyboard.press('Home')
        assert abs(measure.bounding_box()['x'] - original['x']) < 1, (original, measure.bounding_box(), handle.evaluate('(node) => document.activeElement.outerHTML'))
        drag(handle, 1000, 1000)
        assert_inside(measure)
        anchored = measure.bounding_box()
        measure.get_by_role('button', name='Measurement settings', exact=True).click()
        assert measure.bounding_box() == anchored, (anchored, measure.bounding_box())
        measure.get_by_text('Retained results', exact=False).click()
        assert measure.bounding_box() == anchored
        measure.get_by_role('button', name='Measurement', exact=True).click()
        assert measure.bounding_box() == anchored
        page.set_viewport_size({'width': 1024, 'height': 768})
        assert_inside(measure)
        page.set_viewport_size({'width': 1366, 'height': 768})
        # Reset on the heading text; header buttons remain independently usable.
        handle.locator('strong').dblclick()
        assert abs(measure.bounding_box()['x'] - original['x']) < 1
        if captures: page.screenshot(path=str(captures / 'workspace-tools.png'))
        measure.get_by_role('button', name='Close measurement', exact=True).click()

        toolbar.get_by_role('button', name='Layers', exact=True).click()
        layers = page.locator('.layers-panel')
        handle = layers.get_by_role('group', name='Layers panel position', exact=True)
        original = layers.bounding_box()
        drag(handle, 210, 70)
        assert layers.bounding_box()['x'] > original['x'] + 150
        assert_inside(layers)
        layers.get_by_text('Display options', exact=True).click()
        assert layers.bounding_box()['y'] == original['y'] + 70
        assert layers.locator('summary').evaluate("node => getComputedStyle(node).listStyleType") == 'none'
        for row in layers.locator('.layer-source-row:has(label)').all():
            label, info = row.locator('label').bounding_box(), row.locator('.layer-info-button').bounding_box()
            assert abs(label['y'] + label['height'] / 2 - info['y'] - info['height'] / 2) < 1, (label, info)
        # Geographic marker anchors do not move when their labels are hidden.
        positions = page.locator('[data-map-object]').evaluate_all('(nodes) => Object.fromEntries(nodes.map(n => [n.dataset.mapObject, n.style.transform]))')
        layers.get_by_role('combobox', name='Place labels', exact=True).select_option('none')
        expect(page.locator('.map-pin-label:visible')).to_have_count(0)
        after = page.locator('[data-map-object]').evaluate_all('(nodes) => Object.fromEntries(nodes.map(n => [n.dataset.mapObject, n.style.transform]))')
        assert all(before == after.get(key) for key, before in positions.items() if before and after.get(key)), {key: (before, after.get(key)) for key, before in positions.items() if before and after.get(key) and before != after.get(key)}
        layers.get_by_role('combobox', name='Place labels', exact=True).select_option('auto')
        assert page.locator('.map-pin-label').count() > 0
        communities = layers.get_by_role('checkbox', name='Communities', exact=True)
        communities.uncheck()
        expect(page.locator('[data-map-object^="community:"]')).to_have_count(0)
        communities.check()
        assert page.locator('[data-map-object^="community:"]').count() > 0
        saved = layers.bounding_box()
        layers.get_by_role('button', name='Close map layers', exact=True).click()
        toolbar.get_by_role('button', name='Layers', exact=True).click()
        assert abs(layers.bounding_box()['x'] - saved['x']) < 1
        handle.locator('h2').dblclick()
        assert abs(layers.bounding_box()['x'] - original['x']) < 1
        if captures: page.screenshot(path=str(captures / 'workspace-layers.png'))
        layers.get_by_role('button', name='Close map layers', exact=True).click()
        toolbar.get_by_role('button', name='Hide information panel', exact=True).click()
        if captures: page.screenshot(path=str(captures / 'workspace-map-only.png'))
        toolbar.get_by_role('button', name='Show information panel', exact=True).click()

        page.get_by_role('button', name='Location information', exact=True).click()
        location = page.locator('.map-location-panel')
        expect(location).to_contain_text('Select a point on the map')
        area = page.locator('.map-2d-surface').bounding_box()
        page.mouse.click(area['x'] + area['width'] * .65, area['y'] + area['height'] * .45)
        expect(location.locator('dd')).to_have_count(3)
        assert location.locator('dd').last.text_content().endswith(' m')
        geographic = location.locator('dd').first.text_content()
        location.get_by_role('combobox', name='Coordinate system').select_option('projected')
        assert location.locator('dd').first.text_content() != geographic
        location.get_by_role('button', name='Copy coordinates', exact=True).click()
        expect(location.get_by_role('button', name='Copied', exact=True)).to_be_visible()
        assert 'EPSG:32648' in page.evaluate('navigator.clipboard.readText()')
        page.get_by_role('button', name='Switch to 3D', exact=True).click()
        expect(page.locator('canvas.terrain-canvas')).to_be_visible(timeout=25000)
        expect(page.locator('.map-load-state')).to_have_count(0, timeout=25000)
        previous = location.locator('dd').first.text_content()
        area = page.locator('canvas.terrain-canvas').bounding_box()
        page.mouse.click(area['x'] + area['width'] * .55, area['y'] + area['height'] * .5)
        expect(location.locator('dd').first).not_to_have_text(previous)
        assert location.locator('dd').last.text_content().endswith(' m')
        if captures: page.screenshot(path=str(captures / 'workspace-location-3d.png'))
        location.get_by_role('button', name='Close location information', exact=True).click()
        expect(location).to_have_count(0)
        page.get_by_role('button', name='Switch to 2D', exact=True).click()

        for width in [390, 320]:
            page.set_viewport_size({'width': width, 'height': 740})
            expect(page.locator('.map-panel-toggle')).to_be_hidden()
            toolbar.get_by_role('button', name='Measure on 2D map', exact=True).click()
            box, area = measure.bounding_box(), page.locator('.map-area').bounding_box()
            assert box['height'] <= area['height'] * .49
            assert box['x'] >= area['x'] and box['x'] + box['width'] <= area['x'] + area['width']
            assert measure.evaluate('(node) => !node.style.left && !node.style.top')
            north = page.locator('.map-north').bounding_box()
            assert toolbar.bounding_box()['x'] + toolbar.bounding_box()['width'] <= north['x'] - 6
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            if captures: page.screenshot(path=str(captures / f'workspace-mobile-{width}.png'))
            measure.get_by_role('button', name='Close measurement', exact=True).click()
        assert not errors, errors
        browser.close()
        print('Map workspace passed: toolbar, panels, keyboard, bounds, legend, layers, 2D/3D coordinates, copy and mobile.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:5213')
    parser.add_argument('--chrome')
    parser.add_argument('--captures', type=Path)
    args = parser.parse_args()
    if args.captures: args.captures.mkdir(parents=True, exist_ok=True)
    run(args.url.rstrip('/'), args.chrome, args.captures)
