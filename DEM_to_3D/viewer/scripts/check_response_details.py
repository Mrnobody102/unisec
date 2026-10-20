"""Check retained lists, selected details, keyboard focus and responsive map tools."""
import argparse
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


def run(url, chrome, captures=None):
    if captures:
        captures.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        options = {'executable_path': chrome} if chrome else {}
        browser = playwright.chromium.launch(headless=True, **options)
        page = browser.new_page(viewport={'width': 1440, 'height': 960})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('**/*', lambda route: route.continue_()
                   if route.request.url.startswith(url + '/') else route.abort())
        page.goto(url + '/?map=2d&demoRole=manager')
        expect(page.locator('.incident-priority-row').first).to_be_visible(timeout=30000)
        # An overview selection must keep its marker clear of the floating dock.
        # A pending hover preview used to interrupt the camera framing on click.
        page.locator('.incident-priority-row').first.click()
        page.wait_for_function("""() => {
            const pin = document.querySelector('.map-pin.is-selected[data-map-object^="community:"]');
            const dock = document.querySelector('#response-details');
            if (!pin || pin.hidden || !dock) return false;
            const point = pin.getBoundingClientRect(), panel = dock.getBoundingClientRect();
            return point.width > 0 && point.right < panel.left - 12;
        }""")
        # The rebuilt list can move another row under the stationary pointer.
        # It must not trigger a second camera move after selection has settled.
        page.wait_for_timeout(1000)
        assert page.locator('.map-pin.is-selected').evaluate('node => !node.hidden')
        page.get_by_role('button', name='Đóng chi tiết địa bàn', exact=True).click()
        page.locator('.workspace-nav button').last.click()
        row = page.locator('#response-panel .community').filter(
            has=page.locator('strong', has_text='Nậm Khắt'))
        row.click()
        details = page.locator('#response-details')
        def detail_bounds():
            # Measure layout after the panel entry animation has settled.
            expect(details).to_have_css('transform', 'none')
            return details.bounding_box()
        expect(details).to_be_visible()
        expect(details.locator('h1')).to_have_text('Nậm Khắt')
        expect(page.locator('#response-panel .community')).to_have_count(7)
        expect(row).to_be_visible()
        expect(details.locator('h1')).to_be_focused()
        bounds = detail_bounds()
        assert bounds['x'] >= page.locator('.map-area').bounding_box()['x'] + 100, bounds
        page.wait_for_function("""() => {
            const pin = document.querySelector('.map-pin.is-selected[data-map-object^="community:"]');
            const canvas = document.querySelector('.map-canvas');
            if (!pin || !canvas) return false;
            const point = pin.getBoundingClientRect(), map = canvas.getBoundingClientRect();
            const dock = document.querySelector('#response-details').getBoundingClientRect();
            return !pin.hidden && point.left > map.left + 16 && point.right < dock.left - 12;
        }""")
        if captures:
            page.screenshot(path=str(captures / 'community-1440.png'))
        profile = details.get_by_role('button', name='Mặt cắt địa hình', exact=True)
        expect(profile).to_be_enabled(timeout=30000)
        profile.click()
        expect(page.locator('.profile-panel')).to_be_visible()
        expect(details).to_be_visible()
        detail_box = detail_bounds()
        profile_box = page.locator('.profile-panel').bounding_box()
        assert detail_box['y'] + detail_box['height'] <= profile_box['y'] - 10
        if captures:
            page.screenshot(path=str(captures / 'profile-1440.png'))
        page.locator('.map-measure-trigger').click()
        expect(details).not_to_be_visible()
        expect(page.locator('.map-measure-panel')).to_be_visible()
        page.locator('.map-measure-trigger').click()
        expect(details).to_be_visible()
        page.get_by_role('button', name='Đóng chi tiết địa bàn', exact=True).click()
        expect(details).to_have_count(0)
        expect(row).to_be_focused()
        for width in [1024, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 960})
            if width <= 900:
                page.get_by_role('button', name='Thông tin', exact=True).click()
            row.click()
            expect(details).to_be_visible()
            expect(details.locator('h1')).to_have_text('Nậm Khắt')
            expect(page.locator('#response-panel')).not_to_be_visible()
            box = detail_bounds()
            assert box['x'] < 2 and box['width'] <= width, box
            assert details.evaluate('node => node.scrollWidth <= node.clientWidth + 1')
            if captures:
                page.screenshot(path=str(captures / f'community-{width}.png'))
            if width <= 900:
                page.get_by_role('button', name='Bản đồ', exact=True).click()
                expect(details).not_to_be_visible()
                page.get_by_role('button', name='Thông tin', exact=True).click()
                expect(details).to_be_visible()
            page.get_by_role('button', name='Đóng chi tiết địa bàn', exact=True).click()
            expect(details).to_have_count(0)
            expect(row).to_be_focused()
        # Hiding information retains the selection and clears both information surfaces.
        page.set_viewport_size({'width': 1024, 'height': 960})
        row.click()
        page.get_by_role('button', name='Ẩn bảng thông tin', exact=True).click()
        expect(details).not_to_be_visible()
        expect(page.locator('#response-panel')).not_to_be_visible()
        assert page.locator('.map-canvas').bounding_box()['width'] >= 1000
        page.get_by_role('button', name='Mở bảng thông tin', exact=True).click()
        expect(details).to_be_visible()
        expect(details.locator('h1')).to_have_text('Nậm Khắt')
        page.get_by_role('button', name='Đóng chi tiết địa bàn', exact=True).click()

        # Resizing the list must not squeeze the usable map behind a fixed dock.
        page.set_viewport_size({'width': 1101, 'height': 960})
        row.click()
        separator = page.get_by_role('separator')
        separator.focus()
        separator.press('End')
        expect(page.locator('.workspace')).to_have_attribute('data-response-layout', 'pane')
        assert page.locator('.map-canvas').bounding_box()['width'] >= 360
        expect(details).to_be_visible()
        assert detail_bounds()['x'] < 2
        separator.press('Home')
        page.get_by_role('button', name='Đóng chi tiết địa bàn', exact=True).click()

        # On a short screen the profile owns the map; details return when it closes.
        page.set_viewport_size({'width': 1440, 'height': 600})
        row.click()
        profile = details.get_by_role('button', name='Mặt cắt địa hình', exact=True)
        profile.click()
        expect(page.locator('.profile-panel')).to_be_visible()
        expect(details).not_to_be_visible()
        page.get_by_role('button', name='Đóng mặt cắt', exact=True).click()
        expect(details).to_be_visible()
        expect(profile).to_be_focused()
        assert details.locator('.sidebar-scroll').bounding_box()['height'] >= 128

        assert not errors, errors
        browser.close()
        print('Detail dock passed: retained lists, selection/close focus, visible map feature, '
              'profile separation, measurement exclusivity and responsive single pane.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:5213')
    parser.add_argument('--chrome')
    parser.add_argument('--captures', type=Path)
    args = parser.parse_args()
    run(args.url.rstrip('/'), args.chrome, args.captures)
