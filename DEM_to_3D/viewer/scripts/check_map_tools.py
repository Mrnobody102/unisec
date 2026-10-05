"""Interaction checks for measurement, map popovers and theme/locale variants."""
import argparse
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


def run(url, chrome, captures):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=chrome)
        context = browser.new_context(viewport={'width': 1366, 'height': 768})
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(url) else route.abort())
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        expect(page.locator('.leaflet-image-layer')).to_have_count(1, timeout=25000)
        page.get_by_role('button', name='Đo trên bản đồ 2D', exact=True).click()
        panel = page.locator('.map-measure-panel')
        expect(panel).to_be_visible()
        box = page.locator('.map-2d-surface').bounding_box()
        for x, y in [(.55, .35), (.7, .45)]:
            page.mouse.click(box['x'] + box['width'] * x, box['y'] + box['height'] * y)
        expect(panel.locator('.map-measure-result')).to_contain_text('km')
        result = panel.locator('.map-measure-result').text_content()
        page.get_by_role('button', name='Thao tác bản đồ', exact=True).click()
        expect(page.locator('#map-gesture-help')).to_be_visible()
        expect(page.locator('#map-gesture-help')).not_to_contain_text('3D')
        page.keyboard.press('Escape')
        expect(page.locator('#map-gesture-help')).to_have_count(0)
        expect(panel).to_be_visible()
        expect(panel.locator('.map-measure-result')).to_have_text(result)
        # Popover clicks and keyboard commands must not consume measurement points.
        page.get_by_role('button', name='Cài đặt hiển thị', exact=True).click()
        page.get_by_role('button', name='Tối', exact=True).click()
        page.get_by_role('button', name='English', exact=True).click()
        page.get_by_role('button', name='IBM Plex Sans', exact=True).click()
        page.keyboard.press('Escape')
        expect(panel).to_be_visible()
        panel.get_by_role('button', name='Measurement settings', exact=True).click()
        expect(panel).to_contain_text('UTM 48N planar')
        panel.get_by_role('button', name='Measurement settings', exact=True).click()
        page.get_by_role('button', name='Close measurement', exact=True).click()
        expect(panel).to_have_count(0)
        page.get_by_role('button', name='Legend', exact=True).click()
        expect(page.locator('.map-legend')).to_contain_text('Overlapping points')
        if captures:
            page.screenshot(path=str(captures / 'workspace-dark-en.png'))
        # Closing and reopening resumes the current drawing without orphan layers.
        page.get_by_role('button', name='Measure on 2D map', exact=True).click()
        expect(page.locator('.map-measure-vertex')).to_have_count(2)
        page.get_by_role('button', name='Layers', exact=True).click()
        expect(panel).to_have_count(0)
        expect(page.locator('.layers-panel')).to_be_visible()
        for label in ['Landslides', 'Road status', 'Staging point', 'Helicopter landing zones']:
            page.locator('.layers-panel').get_by_role('checkbox', name=label, exact=True).uncheck()
        page.keyboard.press('Escape')
        page.get_by_role('button', name='Fit area', exact=True).click()
        for _ in range(8):
            page.get_by_role('button', name='Zoom out', exact=True).click()
            page.wait_for_timeout(150)
        cluster = page.locator('.map-pin.is-cluster:visible').first
        expect(cluster).to_be_visible()
        assert 'communities' in cluster.get_attribute('aria-label')
        expect(cluster.locator('.map-pin-icon')).to_be_visible()
        expect(cluster.locator('.map-pin-count')).to_be_visible()
        cluster.click()
        page.locator('.map-object-chooser button:not(.map-chooser-expand)').first.click()
        selected = page.locator('.map-pin.is-selected:visible').first
        expect(selected).to_be_visible()
        expect(selected.locator('.map-pin-icon')).to_be_visible()
        expect(selected.locator('.map-pin-count')).to_be_hidden()
        # Opening from the 3D view mounts a fresh working 2D map and tool.
        page.get_by_role('button', name='Switch to 3D', exact=True).click()
        expect(page.locator('.map-2d')).to_have_count(0)
        page.get_by_role('button', name='Measure on 2D map', exact=True).click()
        expect(panel).to_be_visible(timeout=25000)
        expect(page.locator('.leaflet-image-layer')).to_have_count(1, timeout=25000)
        box = page.locator('.map-2d-surface').bounding_box()
        for x, y in [(.6, .35), (.75, .45)]:
            page.mouse.click(box['x'] + box['width'] * x, box['y'] + box['height'] * y)
        expect(panel.locator('.map-measure-result')).to_contain_text('km')
        page.get_by_role('button', name='Close measurement', exact=True).click()
        assert not errors, errors
        context.close(); browser.close()
        print('Map tools passed: measurement lifecycle, 3D to 2D, help dismissal, dark/English/font variants.')


if __name__ == '__main__':
    args = argparse.ArgumentParser()
    args.add_argument('--url', default='http://127.0.0.1:5212')
    args.add_argument('--chrome', default='C:/Program Files/Google/Chrome/Application/chrome.exe')
    args.add_argument('--captures', type=Path)
    options = args.parse_args()
    if options.captures:
        options.captures.mkdir(parents=True, exist_ok=True)
    run(options.url.rstrip('/'), options.chrome, options.captures)
