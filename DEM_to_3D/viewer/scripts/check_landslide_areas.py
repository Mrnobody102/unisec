"""Independent slope/scar polygons, evidence, exact road links and atomic GIS publication."""
from gis_browser_actions import map_tool
import argparse
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


def click_exposed_area(page, selector):
    # A road correctly wins at an overlapping pixel; click an exposed part of
    # the polygon instead of force-clicking the centre of its bounding box.
    point = page.locator(selector).evaluate("""el => {
      const box=el.getBoundingClientRect();
      for(let row=1;row<20;row++)for(let col=1;col<20;col++) {
        const x=box.left+box.width*col/20,y=box.top+box.height*row/20;
        if(document.elementFromPoint(x,y)===el)return {x,y};
      }
      return null;
    }""")
    assert point, 'No exposed part of the landslide polygon is clickable'
    page.mouse.click(point['x'],point['y'])


def run(url, chrome, captures):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=chrome)
        page = browser.new_page(viewport={'width': 1440, 'height': 960})
        page.route('**/*', lambda r: r.continue_() if r.request.url.startswith(url + '/') else r.abort())
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url + '/?offline=1&map=2d&demoRole=manager')
        expect(page.locator('.map-pin:visible').first).to_be_visible(timeout=30000)
        page.evaluate("const d=JSON.parse(localStorage.getItem('dear.gis.v2'));d.records=[];localStorage.setItem('dear.gis.v2',JSON.stringify(d))")
        page.reload()
        expect(page.locator('.map-pin:visible').first).to_be_visible(timeout=30000)
        baseline = page.evaluate("localStorage.getItem('dear.gis.v2')")
        map_tool(page, 'Dữ liệu GIS').click()
        workspace = page.locator('.geodata-workspace')
        tasks = workspace.locator('.geodata-task-nav')
        expect(tasks.get_by_role('button', name='Dữ liệu', exact=True)).to_have_attribute('aria-pressed', 'true')
        tasks.get_by_role('button', name='Vùng sạt lở', exact=True).click()
        expect(workspace.get_by_role('button', name='Nhập dữ liệu', exact=True)).not_to_be_visible()
        expect(workspace.get_by_role('button', name='Vẽ vùng quan tâm', exact=True)).to_have_count(0)
        tasks.get_by_role('button', name='Đường', exact=True).click()
        roads_task = workspace.locator('.geodata-task-panel').filter(has=page.get_by_role('heading', name='Đánh giá đường', exact=True))
        road_search = roads_task.get_by_role('searchbox')
        first_road = roads_task.locator('.scenario-feature-row').first.locator('span').inner_text()
        road_search.fill(first_road)
        expect(roads_task.locator('.scenario-feature-row')).to_have_count(1)
        expect(roads_task.locator('.scenario-feature-row small')).not_to_be_empty()
        road_search.fill('')
        tasks.get_by_role('button', name='Dữ liệu', exact=True).click()
        expect(workspace.get_by_role('button', name='Nhập dữ liệu', exact=True)).to_be_visible()
        expect(workspace.get_by_role('button', name='Khoanh vùng nguy cơ', exact=True)).not_to_be_visible()
        tasks.get_by_role('button', name='Vùng sạt lở', exact=True).click()
        if captures:
            captures.mkdir(parents=True, exist_ok=True)
            for width in [1440, 390, 320]:
                page.set_viewport_size({'width': width, 'height': 900})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
                expect(tasks.get_by_role('button', name='Vùng sạt lở', exact=True)).to_be_visible()
                page.screenshot(path=str(captures / f'gis-tasks-{width}.png'))
            page.set_viewport_size({'width': 1440, 'height': 960})
        for _ in range(3):
            page.get_by_role('button', name='Phóng to GIS', exact=True).click()
        def draw(label, offset=0):
            workspace.get_by_role('button', name=label, exact=True).click()
            surface = workspace.locator('.geodata-map-surface').bounding_box()
            for x, y in [(0.42, 0.38), (0.55, 0.39), (0.5, 0.54)]:
                page.mouse.click(surface['x'] + surface['width'] * x + offset, surface['y'] + surface['height'] * y)
            workspace.locator('.geodata-drawing-bar').get_by_role('button', name='Kết thúc', exact=True).click()
            expect(workspace.locator('.landslide-area-editor')).to_be_visible()
            return workspace.locator('.landslide-area-editor')
        def publish():
            workspace.get_by_role('button', name='Áp dụng thay đổi', exact=True).click()
            dialog = page.get_by_role('dialog', name='Áp dụng thay đổi GIS?', exact=True)
            dialog.get_by_role('button', name='Áp dụng', exact=True).click()
            expect(dialog).to_have_count(0)
            return json.loads(page.evaluate("localStorage.getItem('dear.gis.v2')"))
        editor = draw('Khoanh vùng nguy cơ')
        # A new outline may remain in draft, but cannot publish without its mapping basis.
        workspace.get_by_role('button', name='Áp dụng thay đổi', exact=True).click()
        review = page.get_by_role('dialog', name='Áp dụng thay đổi GIS?', exact=True)
        review.get_by_role('button', name='Áp dụng', exact=True).click()
        expect(review).to_contain_text('Chọn nguồn và ghi căn cứ')
        assert page.evaluate("localStorage.getItem('dear.gis.v2')") == baseline
        review.get_by_role('button', name='Hủy', exact=True).click()
        editor.get_by_label('Phản ánh người dân', exact=True).check()
        editor.get_by_label('Căn cứ khoanh vùng', exact=True).fill('TEST: Residents reported new ground cracks and cracking sounds on the slope. Extent is provisional.')
        roads = editor.locator('details').filter(has=page.locator('summary', has_text='Đoạn đường liên quan'))
        roads.locator('summary').click()
        row = roads.locator('.landslide-road-edit').first
        row.locator('input[type=checkbox]').first.check()
        expect(row.get_by_label('Quan hệ với vùng', exact=True).locator('option')).to_have_count(1)
        row.get_by_label('Chỉ một phần đoạn đường', exact=True).check()
        row.get_by_role('button', name='Chọn đầu và cuối trên bản đồ', exact=True).click()
        expect(workspace.locator('.scenario-pick-bar')).to_be_visible()
        road_points = workspace.locator('.leaflet-scenario-pane path[stroke-opacity="0.9"]').first.evaluate('''path => {
            const matrix = path.getScreenCTM(), length = path.getTotalLength();
            return [.2, .55].map(f => { const p = path.getPointAtLength(length * f).matrixTransform(matrix); return {x:p.x,y:p.y}; });
        }''')
        page.mouse.click(road_points[0]['x'], road_points[0]['y'])
        expect(workspace.locator('.scenario-pick-bar')).to_contain_text('Chọn cuối')
        page.mouse.click(road_points[1]['x'], road_points[1]['y'])
        expect(workspace.locator('.scenario-pick-bar')).to_have_count(0)
        expect(editor).to_be_visible()
        assert float(row.get_by_label('Đến (m)', exact=True).input_value()) > float(row.get_by_label('Từ (m)', exact=True).input_value())
        row.get_by_label('Từ (m)', exact=True).fill('100')
        row.get_by_label('Đến (m)', exact=True).fill('250')
        editor.get_by_role('button', name='Lưu vùng vào bản nháp', exact=True).click()
        # A consumed map pick must not overwrite subsequent manual correction after save/remount.
        editor.locator('details').filter(has=page.locator('summary', has_text='Đoạn đường liên quan')).locator('summary').click()
        row = editor.locator('.landslide-road-edit').first
        expect(row.get_by_label('Từ (m)', exact=True)).to_have_value('100')
        expect(row.get_by_label('Đến (m)', exact=True)).to_have_value('250')
        if captures:
            captures.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(captures / 'potential-area-editor.png'))
        saved = publish()
        potential = next(r for r in saved['records'] if r['feature']['properties'].get('dearLandslideArea'))
        metadata = potential['feature']['properties']['dearLandslideArea']
        assert potential['role'] == 'reference' and metadata['state'] == 'potential'
        assert metadata['roadLinks'][0]['fromM'] == 100 and metadata['roadLinks'][0]['toM'] == 250
        assert all(not changes for changes in saved['scenarios'].values()), 'A potential polygon must not close a road automatically'
        # A selected polygon must not remain editable after switching to a road task.
        tasks.get_by_role('button', name='Đường', exact=True).click()
        expect(workspace.get_by_role('button', name='Sửa ranh giới', exact=True)).to_have_count(0)
        roads_task.locator('.scenario-feature-row').first.click()
        expect(workspace.locator('.scenario-card')).to_be_visible()
        expect(workspace.get_by_role('button', name='Sửa ranh giới', exact=True)).to_have_count(0)
        tasks.get_by_role('button', name='Vùng sạt lở', exact=True).click()
        editor = draw('Khoanh vết sạt lở', offset=25)
        editor.get_by_label('Ảnh vệ tinh / ảnh bay', exact=True).check()
        editor.get_by_label('Căn cứ khoanh vùng', exact=True).fill('TEST: Delineated a fresh scar and visible debris deposit on dated imagery; field passage requires confirmation.')
        editor.get_by_label('Mã ảnh / tài liệu ảnh', exact=True).fill('TEST Sentinel-2 scene, 2026-09-29')
        editor.get_by_label('Độ phân giải ảnh (m, nếu biết)', exact=True).fill('10')
        roads = editor.locator('details').filter(has=page.locator('summary', has_text='Đoạn đường liên quan'))
        roads.locator('summary').click()
        row = roads.locator('.landslide-road-edit').first
        row.locator('input[type=checkbox]').first.check()
        row.get_by_label('Quan hệ với vùng', exact=True).select_option('affected')
        row.get_by_role('button', name='Lưu vùng và mở đoạn đường', exact=True).click()
        card = workspace.locator('.scenario-card')
        expect(card.get_by_role('button', name=potential['name'], exact=True)).to_be_visible()
        card.get_by_role('button', name='Cập nhật tình trạng', exact=True).click()
        status = page.get_by_role('dialog', name='Cập nhật tình trạng đường', exact=True)
        status.get_by_role('radio', name='Bị chặn', exact=True).check()
        status.locator('.status-optional-note summary').click()
        status.get_by_label('Ghi chú', exact=True).fill('TEST: Field team confirms the linked road section is blocked by deposited debris.')
        status.get_by_role('button', name='Lưu tình trạng', exact=True).click()
        expect(workspace.locator('.gis-draft-bar')).to_be_visible()
        final = publish()
        assert len([r for r in final['records'] if r['feature']['properties'].get('dearLandslideArea')]) == 2
        assert any(e['change']['kind'] == 'status' and e['change']['to'] == 'blocked' for es in final['scenarios'].values() for e in es)
        assert not any(r['role'] == 'aoi' for r in final['records']), 'Drawing hazard extents must not create an AOI'
        page.reload()
        expect(page.locator('.landslide-area.is-potential')).to_have_count(1, timeout=30000)
        expect(page.locator('.landslide-area.is-occurred')).to_have_count(1)
        click_exposed_area(page,'.landslide-area.is-potential')
        expect(page.locator('.landslide-area-summary')).to_be_visible()
        page.locator('.landslide-area-summary .landslide-road-link').first.click()
        scar = next(r for r in final['records'] if r['feature']['properties'].get('dearLandslideArea', {}).get('state') == 'occurred')
        page.locator('#response-details').get_by_role('button').filter(has_text=scar['name']).click()
        expect(page.locator('.field-map-card > header')).to_contain_text(scar['name'])
        expect(page.locator('.field-map-card > header')).to_contain_text('Ranh giới chưa xác minh')
        page.locator('.landslide-area-summary .landslide-road-link').first.click()
        page.locator('#response-details').get_by_role('button').filter(has_text=potential['name']).click()
        expect(page.locator('.field-map-card > header')).to_contain_text(potential['name'])
        expect(page.locator('.landslide-area-summary')).to_contain_text('100–250 m')
        if captures:
            page.screenshot(path=str(captures / 'published-areas-2d.png'))
        page.get_by_role('button', name='Chuyển sang 3D', exact=True).click()
        expect(page.locator('canvas.terrain-canvas')).to_be_visible(timeout=30000)
        expect(page.locator('.landslide-area-summary')).to_be_visible()
        if captures:
            page.wait_for_timeout(600)
            page.screenshot(path=str(captures / 'published-areas-3d.png'))
        map_tool(page, 'Dữ liệu GIS').click()
        page.locator('.landslide-area-list').get_by_role('button').filter(has_text=potential['name']).click()
        expect(editor).to_be_visible()
        for width in (390, 320):
            page.set_viewport_size({'width': width, 'height': 900})
            for theme in ('light', 'dark'):
                page.evaluate('theme => document.documentElement.dataset.theme = theme', theme)
                assert editor.evaluate('el => el.scrollWidth <= el.clientWidth'), (width, theme)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, theme)
        assert not errors, errors
        browser.close()
    print('Landslide mapping passed: independent potential/occurred polygons, evidence gate, bounded road links, no inferred blockage, explicit road assessment, draft publication and 2D/3D inspection.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:5342')
    parser.add_argument('--chrome')
    parser.add_argument('--captures', type=Path)
    args = parser.parse_args()
    run(args.url.rstrip('/'), args.chrome, args.captures)
