"""Check panel spacing, access context, grouped markers and Vietnamese search."""
import argparse
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from check_workspace import check_symbols


def check_panel(page):
    problems = page.locator('.sidebar').evaluate("""panel => {
      const errors = [];
      if (panel.scrollWidth > panel.clientWidth + 1) errors.push('panel overflow');
      const body = panel.querySelector('.sidebar-scroll');
      if (body.scrollWidth > body.clientWidth + 1) errors.push('body overflow');
      panel.querySelectorAll('.workflow-section > p + button').forEach(button => {
        const gap = button.getBoundingClientRect().top - button.previousElementSibling.getBoundingClientRect().bottom;
        if (gap < 11) errors.push('copy touches action: ' + button.textContent);
      });
      panel.querySelectorAll('dd').forEach(value => {
        if (value.scrollWidth > value.clientWidth + 1) errors.push('clipped value: ' + value.textContent);
      });
      return errors;
    }""")
    assert not problems, problems


def run(url, chrome, captures):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, **({'executable_path': chrome} if chrome else {}))
        context = browser.new_context(viewport={'width': 1366, 'height': 768})
        context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(url + '/') else r.abort())
        page = context.new_page(); errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        expect(page.locator('.incident-priority-row').first).to_be_visible(timeout=25000)
        expect(page.locator('.leaflet-image-layer')).to_have_count(1, timeout=25000)
        page.wait_for_function("document.querySelector('.leaflet-image-layer')?.complete")
        # A priority village must not disappear into a nameless mixed group.
        priority = page.locator('[data-map-object="community:KM"]')
        expect(priority).to_be_visible()
        assert 'is-label-hidden' not in priority.get_attribute('class')
        priority.click()
        expect(page.locator('.map-object-chooser')).to_contain_text('Các điểm trong nhóm')
        expect(page.locator('.map-chooser-expand')).to_have_text('Xem khu vực này')
        page.keyboard.press('Escape')
        check_symbols(page)
        for width in [1366, 1024, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 768})
            if width < 900:
                page.get_by_role('button', name='Thông tin', exact=True).click()
            page.locator('.workspace-nav button').first.click()
            page.locator('.incident-area-link').click()
            check_panel(page)
            assert page.locator('.area-facts dd').first.bounding_box()['height'] < 40
            expect(page.locator('.object-reference')).not_to_have_attribute('open', '')
            if captures and width == 1366:
                page.screenshot(path=str(captures / 'workspace-area.png'))
            page.get_by_role('button', name='Xem địa bàn trong vùng', exact=True).click()
            expect(page.locator('.sidebar .community')).to_have_count(7)
            query = page.get_by_role('searchbox', name='Tìm địa bàn', exact=True)
            query.fill('nam khat')
            expect(page.locator('.sidebar .community')).to_have_count(1)
            page.locator('.sidebar .community').click()
            expect(page.locator('.decision-overview')).to_contain_text('Có tuyến bị chặn, tuyến khác cần xác minh')
            check_panel(page)
            if captures and width == 1366:
                page.screenshot(path=str(captures / 'workspace-access.png'))
            page.locator('.decision-tabs button').nth(1).click()
            page.locator('.route-card').nth(1).click()
            # Returning to Access summarizes the community, not the selected route.
            page.locator('.decision-tabs button').first.click()
            expect(page.locator('.decision-overview')).to_contain_text('Có tuyến bị chặn, tuyến khác cần xác minh')
            expect(page.locator('.decision-route .status-text')).to_have_text('Bị chặn')
            page.locator('.decision-tabs button').nth(2).click()
            expect(page.locator('.assessment-basis')).to_contain_text('Có đường bị chặn và mất liên lạc')
            check_panel(page)
            page.get_by_role('button', name='Đóng chi tiết địa bàn', exact=True).click()
            expect(query).to_have_value('nam khat')
            page.locator('.workspace-nav button').nth(1).click()
            road_query = page.get_by_role('searchbox', name='Tìm đường hoặc điểm ảnh hưởng', exact=True)
            road_query.fill('khau mang')
            expect(page.locator('.impact-row')).to_have_count(1)
            page.locator('.impact-row').click()
            expect(page.locator('.sidebar h1')).to_have_text('Đường vào Khau Mang qua cầu')
            check_panel(page)
            page.get_by_role('button', name='Xem bản ghi', exact=True).click()
            expect(page.locator('.evidence-metadata')).to_contain_text('03:55')
            page.keyboard.press('Escape')
            page.get_by_role('button', name='Đóng chi tiết đối tượng', exact=True).click()
            expect(road_query).to_have_value('khau mang')
            page.locator('.decision-tabs button').nth(1).click()
            expect(page.locator('.impact-metrics [aria-pressed="true"]')).to_have_count(0)
            page.locator('[data-road-filter="blocked"]').click()
            expect(road_query).to_have_value('')
            expect(page.locator('.decision-tabs button').first).to_have_attribute('aria-pressed', 'true')
            expect(page.locator('.impact-row')).to_have_count(1)
            page.locator('[data-road-filter="all"]').click()
            if width < 900:
                page.get_by_role('button', name='Bản đồ', exact=True).click()
            search = page.get_by_role('combobox', name='Tìm trên bản đồ', exact=True)
            search.fill('bai dap')
            search.press('Escape')
            expect(search).to_have_attribute('aria-expanded', 'false')
            search.press('Enter')
            expect(page.locator('.object-facts')).to_have_count(0)
            search.press('ArrowDown')
            expect(search).to_have_attribute('aria-activedescendant', 'map-result-0')
            search.press('Enter')
            expect(page.locator('.object-facts')).to_contain_text('Vị trí đề xuất')
            check_panel(page)
            if captures and width == 1366:
                page.screenshot(path=str(captures / 'workspace-landing-site.png'))
            page.get_by_role('button', name='Đóng chi tiết đối tượng', exact=True).click()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        # Missing road coverage is one state, not multiple repeated warnings.
        for width in [1366, 320]:
            page.set_viewport_size({'width': width, 'height': 768})
            for name in ['Púng Hốc', 'Nậm Lắt', 'Tà Phình', 'Háng Cơ']:
                if width < 900:
                    page.get_by_role('button', name='Bản đồ', exact=True).click()
                search = page.get_by_role('combobox', name='Tìm trên bản đồ', exact=True)
                search.fill(name)
                search.press('Enter')
                panel = page.locator('.sidebar')
                expect(panel.get_by_text('Chưa có tuyến để đánh giá', exact=True)).to_have_count(1)
                expect(panel.locator('.decision-route')).to_have_count(0)
                expect(panel.locator('.sidebar-intro')).to_have_count(0)
                expect(panel.locator('.assessment-action')).to_contain_text('Bổ sung tuyến đường và tin hiện trường')
                check_panel(page)
                if captures and name == 'Púng Hốc':
                    page.screenshot(path=str(captures / f'workspace-unmapped-{width}.png'))
                page.locator('.decision-tabs button').nth(1).click()
                expect(panel.get_by_text('Chưa có tuyến để đánh giá', exact=True)).to_have_count(1)
                expect(panel.locator('.decision-overview')).to_have_count(0)
                expect(panel.locator('.route-empty')).to_contain_text('Bổ sung tuyến đường và tin hiện trường')
                page.get_by_role('button', name='Xem thông tin địa bàn', exact=True).click()
                expect(panel.get_by_text('Chưa đủ dữ liệu đường vào để đánh giá tiếp cận', exact=True)).to_have_count(1)
                expect(panel.get_by_text('Chưa có tuyến để đánh giá', exact=True)).to_have_count(0)
                expect(panel.locator('.sidebar-intro')).to_have_count(0)
                check_panel(page)
        # The event overview and destination view must read the same updated snapshot.
        page.set_viewport_size({'width': 1366, 'height': 768})
        page.locator('.workspace-nav button').first.click()
        page.get_by_role('button', name='Thông báo sự kiện', exact=True).click()
        page.get_by_role('button', name='Xem chi tiết', exact=True).click()
        page.get_by_role('button', name='Cập nhật bản đồ', exact=True).click()
        expect(page.locator('.incident-priority-row').first).to_contain_text('Các tuyến đã biết đều bị chặn')
        page.locator('.incident-priority-row').first.click()
        expect(page.locator('.decision-overview')).to_contain_text('Các tuyến đã biết đều bị chặn')
        expect(page.locator('.route-travel-estimate')).to_have_count(0)
        page.locator('.decision-tabs button').nth(1).click()
        expect(page.locator('.sidebar-intro')).to_have_count(0)
        expect(page.locator('.route-card')).to_have_count(2)
        expect(page.locator('.route-caution')).to_contain_text('Cả hai tuyến đã biết đều có đoạn bị chặn')
        page.locator('.decision-tabs button').nth(2).click()
        expect(page.locator('.sidebar').get_by_text('Có đường bị chặn và mất liên lạc với địa bàn', exact=True)).to_have_count(1)
        expect(page.locator('.sidebar-intro')).to_have_count(0)
        page.get_by_role('button', name='Cài đặt hiển thị', exact=True).click()
        page.get_by_role('button', name='English', exact=True).click()
        search = page.get_by_role('combobox', name='Search map', exact=True)
        search.fill('pung hoc')
        search.press('Enter')
        panel = page.locator('.sidebar')
        expect(panel.get_by_text('No mapped access route', exact=True)).to_have_count(1)
        expect(panel.locator('.decision-route')).to_have_count(0)
        check_panel(page)
        page.locator('.decision-tabs button').nth(1).click()
        expect(panel.get_by_text('No mapped access route', exact=True)).to_have_count(1)
        page.get_by_role('button', name='Review community findings', exact=True).click()
        expect(panel.get_by_text('Insufficient road data to assess access', exact=True)).to_have_count(1)
        expect(panel.locator('.sidebar-intro')).to_have_count(0)
        check_panel(page)
        assert not errors, errors
        browser.close()
        print('Panel usability passed: 4 viewport sizes, spacing, search, access context, sources, markers, report update and non-repeated missing-route states.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:5213')
    parser.add_argument('--chrome')
    parser.add_argument('--captures', type=Path)
    args = parser.parse_args()
    if args.captures:
        args.captures.mkdir(parents=True, exist_ok=True)
    run(args.url.rstrip('/'), args.chrome, args.captures)
