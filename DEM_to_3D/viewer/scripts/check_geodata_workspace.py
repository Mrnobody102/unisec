"""Exercise local vector import, AOI coverage, drawing, persistence and GIS export."""
from gis_browser_actions import gis_task, download_geometry, publish_draft, published_records, reviewed_records, reviewed_records_json
import argparse
import json
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


STRIPS = '''Strix-2: POLYGON((103.91837379806059 21.985881028259936, 104.02711922657171 21.548588075305332, 104.18745542653372 21.579715641421235, 104.07870999802259 22.01971591617764, 103.91837379806059 21.985881028259936))
Strix-3: POLYGON((104.08803268362155 21.546969559434526, 103.92647890571061 21.5756741383793, 104.01794387749813 22.01908263773835, 104.179496765540907 21.990378058793063, 104.08803268362155 21.546969559434526))
POLYGON((104.29260436799521 21.69973602498226, 104.148903579990803 21.580771700729777, 103.8135305697942 21.865206634560078, 103.91709913788138 21.984170958812562, 104.29260436799521 21.69973602498226))'''
KML = '''<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Folder><name>Survey</name>
<Placemark><name>Survey &amp; reference</name><description><![CDATA[<img src=x onerror="alert(1)">]]></description><MultiGeometry>
<Point><coordinates>104.053554,21.782919,20</coordinates></Point>
<LineString><coordinates>104,21.7 104.1,21.8</coordinates></LineString>
<Polygon><outerBoundaryIs><LinearRing><coordinates>104,21 106,21 106,22 104,22 104,21</coordinates></LinearRing></outerBoundaryIs>
<innerBoundaryIs><LinearRing><coordinates>104.2,21.2 104.3,21.2 104.3,21.3 104.2,21.3 104.2,21.2</coordinates></LinearRing></innerBoundaryIs></Polygon>
</MultiGeometry></Placemark></Folder></Document></kml>'''


def open_import(page):
    if page.locator('.geodata-import > button').get_attribute('aria-expanded') == 'true': return
    gis_task(page)
    page.get_by_role('tab', name='Lớp', exact=True).click()
    trigger = page.locator('.geodata-import > button')
    if trigger.get_attribute('aria-expanded') != 'true': trigger.click()


def check_controls(page, theme):
    gis_task(page)
    close_record = page.get_by_role('button', name='Đóng hồ sơ đối tượng', exact=True)
    if close_record.is_visible(): close_record.click()
    trigger = page.locator('.geodata-import > button')
    # Wait for the detail dock transition before measuring hover stability.
    from map_wait import settled_box
    trigger.scroll_into_view_if_needed()
    before = settled_box(page, '.geodata-import > button'); trigger.hover()
    assert trigger.bounding_box() == before, 'Import action shifted on hover'
    open_import(page)
    dialog = page.get_by_role('dialog', name='Nhập dữ liệu', exact=True)
    expect(dialog).to_be_visible()
    assert dialog.locator('select').evaluate("node => parseFloat(getComputedStyle(node).paddingRight) >= 30")
    box = dialog.bounding_box()
    assert box['x'] >= 0 and box['width'] <= page.viewport_size['width']
    page.keyboard.press('Escape')
    expect(trigger).to_be_focused()


def paste(page, text, role='reference'):
    dialog = page.locator('.geometry-input-dialog[open]')
    if dialog.count(): page.keyboard.press('Escape')
    gis_task(page)
    page.get_by_role('tab', name='Lớp', exact=True).click()
    panel = page.locator('.geodata-import')
    toggle = panel.get_by_role('button', name='Nhập dữ liệu', exact=True)
    if toggle.get_attribute('aria-expanded') == 'false':
        toggle.click()
    panel.locator('select').select_option(role)
    if not panel.locator('textarea').count():
        panel.get_by_role('button', name='Dán tọa độ / WKT', exact=True).click()
    panel.locator('textarea').fill(text)
    panel.get_by_role('button', name='Nhập', exact=True).click()


def check_large_import(browser, url, root):
    context = browser.new_context(viewport={'width': 1366, 'height': 768})
    context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(url + '/') else route.abort())
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(url + '/?map=2d&workspace=geodata&offline=1')
    geometries = ''.join(f'<Point><coordinates>{104 + i / 100000},21.78</coordinates></Point>' for i in range(1000))
    notes = '<Placemark><name>Note only</name></Placemark>' * 1001
    # More than 2 MB, more than 100 geometries, and note-only placemarks must all work.
    kml = '<kml xmlns="http://www.opengis.net/kml/2.2"><Document><!--' + 'x' * 2_000_000 + '-->' + notes + '<Placemark><name>Khảo sát</name><MultiGeometry>' + geometries + '</MultiGeometry></Placemark></Document></kml>'
    path = root / 'large-survey.kml'
    path.write_text(kml, encoding='utf-8')
    open_import(page)
    page.locator('input[type=file]').set_input_files(path)
    expect(page.locator('.geodata-layers li')).to_have_count(1000, timeout=20000)
    expect(page.get_by_role('alert')).to_have_count(0)
    records = json.loads(reviewed_records_json(page))
    assert all(record['role'] == 'reference' and record['source']['name'] == path.name for record in records)
    page.reload()
    expect(page.locator('.geodata-layers li')).to_have_count(1000, timeout=20000)
    page.locator('.geodata-feature').last.click()
    expect(page.locator('.geodata-map-label')).to_have_count(1)
    expect(page.locator('.geodata-map-label')).to_contain_text('Khảo sát 1000')
    before = reviewed_records_json(page)
    (root / 'extra.wkt').write_text('POINT(104 21)', encoding='utf-8')
    open_import(page)
    page.locator('input[type=file]').set_input_files(root / 'extra.wkt')
    expect(page.get_by_role('alert')).to_contain_text('1.000')
    assert reviewed_records_json(page) == before
    # An over-budget MultiGeometry must fail at 1,001, without replacing the active project.
    path.write_text(kml.replace('</MultiGeometry>', '<Point><coordinates>104,21</coordinates></Point></MultiGeometry>'), encoding='utf-8')
    open_import(page)
    page.locator('input[type=file]').set_input_files(path)
    expect(page.get_by_role('alert')).to_contain_text('large-survey.kml')
    assert reviewed_records_json(page) == before
    # A single batch is one undo/redo operation after clearing only this test context.
    page.evaluate("localStorage.removeItem('dear.geodata.v1'); localStorage.removeItem('dear.gis.v2')")
    page.reload()
    path.write_text(kml, encoding='utf-8')
    open_import(page)
    page.locator('input[type=file]').set_input_files(path)
    expect(page.locator('.geodata-layers li')).to_have_count(1000, timeout=20000)
    page.get_by_role('button', name='Hoàn tác GIS', exact=True).click(); reviewed_records(page)
    expect(page.locator('.geodata-layers li')).to_have_count(0)
    page.get_by_role('button', name='Làm lại GIS', exact=True).click()
    expect(page.locator('.geodata-layers li')).to_have_count(1000, timeout=20000)
    page.evaluate("localStorage.removeItem('dear.geodata.v1'); localStorage.removeItem('dear.gis.v2')")
    page.reload()
    paste(page, '''21°45'26.80"N 104°02'48.44"E
21°45'48.01"N 104°02'43.99"E
21°47'01.34"N 104°02'39.83"E''')
    expect(page.locator('.geodata-layers li')).to_have_count(3)
    first = json.loads(reviewed_records_json(page))[0]['feature']['geometry']['coordinates']
    assert abs(first[0] - (104 + 2 / 60 + 48.44 / 3600)) < 1e-10
    assert abs(first[1] - (21 + 45 / 60 + 26.80 / 3600)) < 1e-10
    assert not errors, errors
    context.close()


def check_point_and_kml_semantics(browser, url, root, captures):
    """Inspect actual Leaflet paint, then round trip mixed KML altitude references and attributes."""
    context = browser.new_context(viewport={'width': 1366, 'height': 768})
    context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(url + '/') else route.abort())
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(url + '/?map=2d&workspace=geodata&offline=1')
    modes = ['absolute', 'relativeToGround', 'clampToGround', 'relativeToSeaFloor', 'clampToSeaFloor']
    # The first two points coincide: their geometry must not be displaced or connected.
    geometries = ''.join(
        f'<Point><{"gx:altitudeMode" if "SeaFloor" in mode else "altitudeMode"}>{mode}</{"gx:altitudeMode" if "SeaFloor" in mode else "altitudeMode"}><coordinates>{104.053554 if i < 2 else 104.053554 + i / 1000},21.782919,{20 + i}</coordinates></Point>'
        for i, mode in enumerate(modes)
    )
    kml = ('<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><Document><Placemark>'
           '<name>Khảo sát &amp; tham chiếu</name><description>&lt;script&gt;untrusted()&lt;/script&gt;</description>'
           '<ExtendedData><Data name="survey &amp; class"><value>A &lt; B</value></Data>'
           '<Data name="kmlAltitudeMode"><value>absolute</value></Data></ExtendedData>'
           '<MultiGeometry>' + geometries + '</MultiGeometry></Placemark></Document></kml>')
    path = root / 'altitude-survey.kml'
    path.write_text(kml, encoding='utf-8')
    open_import(page)
    page.locator('input[type=file]').set_input_files(path)
    expect(page.locator('.geodata-layers li')).to_have_count(5)
    original = json.loads(reviewed_records_json(page))
    assert [record['feature']['properties']['kmlAltitudeMode'] for record in original] == modes
    assert all(record['role'] == 'reference' and record['feature']['geometry']['type'] == 'Point' for record in original)
    assert original[0]['feature']['geometry']['coordinates'][:2] == original[1]['feature']['geometry']['coordinates'][:2]
    expect(page.get_by_role('list', name='Chú giải dữ liệu')).to_contain_text('Tham chiếu')
    page.get_by_role('combobox',name='Hiển thị điểm',exact=True).select_option('individual')
    for selected_index in [0, 4]:
        page.locator('.geodata-feature').nth(selected_index).click()
        paths = page.locator('.leaflet-points-pane path.map-reference-point')
        expect(paths).to_have_count(4)
        paint = paths.evaluate_all("nodes => nodes.map(n => ({stroke:n.getAttribute('stroke'), fill:n.getAttribute('fill'), alpha:n.getAttribute('fill-opacity')}))")
        assert all(item['stroke'] == '#b7791f' and item['fill'] == '#fafbf8' and item['alpha'] == '1' for item in paint), paint
        selected = page.locator('.geodata-selected-point svg path')
        expect(selected).to_have_count(1)
        expect(selected).to_have_css('fill', 'rgb(217, 48, 37)')
        page.get_by_role('button', name='Phóng to GIS', exact=True).click()
        assert [r['feature']['geometry'] for r in published_records(page)] == [record['feature']['geometry'] for record in original]
    expect(page.locator('.geodata-coordinate').first).to_have_text('21.782919°')
    page.get_by_role('button', name='Nguồn và tọa độ', exact=True).click()
    expect(page.locator('.geodata-metadata')).to_contain_text('Bám đáy biển; không dùng Z')
    assert page.locator('.geodata-metadata script').count() == 0
    with page.expect_download() as download:
        download_geometry(page, 'KML')
    exported_path = root / 'altitude-export.kml'
    download.value.save_as(exported_path)
    xml = ET.parse(exported_path)
    ns = {'k': 'http://www.opengis.net/kml/2.2', 'gx': 'http://www.google.com/kml/ext/2.2'}
    placemarks = xml.findall('.//k:Placemark', ns)
    assert len(placemarks) == 5
    for placemark, mode, record in zip(placemarks, modes, original):
        point = placemark.find('k:Point', ns)
        mode_node = point.find('gx:altitudeMode' if 'SeaFloor' in mode else 'k:altitudeMode', ns)
        assert mode_node.text == mode
        assert [float(part) for part in point.find('k:coordinates', ns).text.split(',')] == record['feature']['geometry']['coordinates']
        assert placemark.find('k:description', ns).text == '<script>untrusted()</script>'
        attrs = {item.attrib['name']: item.find('k:value', ns).text for item in placemark.findall('k:ExtendedData/k:Data', ns)}
        assert attrs['survey & class'] == 'A < B'
    if captures:
        page.screenshot(path=str(captures / 'gis-reference-points.png'), animations='disabled')
    page.evaluate("localStorage.removeItem('dear.geodata.v1'); localStorage.removeItem('dear.gis.v2')")
    page.reload()
    open_import(page)
    page.locator('input[type=file]').set_input_files(exported_path)
    expect(page.locator('.geodata-layers li')).to_have_count(5)
    restored = json.loads(reviewed_records_json(page))
    for before, after in zip(original, restored):
        assert before['feature']['geometry'] == after['feature']['geometry']
        for key in ['name', 'description', 'survey & class', 'kmlAltitudeMode']:
            assert before['feature']['properties'][key] == after['feature']['properties'][key]
    # Invalid altitude references must fail atomically instead of becoming ground or absolute.
    before = reviewed_records_json(page)
    path.write_text(kml.replace('<altitudeMode>absolute</altitudeMode>', '<altitudeMode>invalid</altitudeMode>', 1), encoding='utf-8')
    open_import(page)
    page.locator('input[type=file]').set_input_files(path)
    expect(page.get_by_role('alert')).to_contain_text('altitudeMode')
    assert reviewed_records_json(page) == before
    assert not errors, errors
    context.close()


def run(url, chrome, captures):
    with tempfile.TemporaryDirectory() as temporary, sync_playwright() as p:
        root = Path(temporary)
        browser = p.chromium.launch(headless=True, **({'executable_path': chrome} if chrome else {}))
        context = browser.new_context(viewport={'width':1366,'height':768}, permissions=['clipboard-read','clipboard-write'])
        requests, errors = [], []
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(url + '/') else route.abort())
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url))
        page.goto(url + '/?map=2d&workspace=geodata&offline=1')
        expect(page.locator('.geodata-workspace')).to_be_visible()
        expect(page).to_have_title('DEAR | Dữ liệu GIS')
        paste(page, STRIPS, 'footprint')
        expect(page.locator('.geodata-layers li')).to_have_count(3)
        expect(page.locator('.geodata-layers')).to_contain_text('Strix-2')
        paste(page, '21.782919° N, 104.053554° E')
        expect(page.locator('.geodata-layers li')).to_have_count(4)
        page.locator('.geodata-feature').filter(has_text='WGS84 1').click()
        expect(page.locator('.geodata-coordinate').first).to_have_text('21.782919°')
        expect(page.locator('.geodata-coordinate').nth(1)).to_have_text('104.053554°')
        expect(page.locator('.geodata-map-label').last).to_be_visible()
        # Standalone GIS has no dependency on the response scenario, API or DEM.
        assert not any('/datasets/' in request or '/assets/che_tao' in request or '/api/' in request for request in requests), requests
        if captures:
            captures.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(captures / 'gis-strips-dark.png'), animations='disabled')
        # Invalid batches are atomic and retain existing data.
        before = reviewed_records_json(page)
        paste(page, 'POLYGON((104 21,105 22,105 21,104 22,104 21))')
        expect(page.get_by_role('alert')).to_contain_text('tự cắt')
        expect(page.locator('.geodata-layers li')).to_have_count(4)
        assert reviewed_records_json(page) == before
        page.get_by_role('button', name='Đóng lỗi nhập').click()
        (root / 'local.kml').write_text(KML, encoding='utf-8')
        (root / 'network.kml').write_text('<kml><NetworkLink><Link><href>https://example.invalid/remote</href></Link></NetworkLink></kml>', encoding='utf-8')
        open_import(page)
        page.locator('input[type=file]').set_input_files([root / 'local.kml',root / 'network.kml'])
        expect(page.get_by_role('alert')).to_contain_text('NetworkLink')
        expect(page.locator('.geodata-layers li')).to_have_count(4)
        page.get_by_role('button', name='Đóng lỗi nhập').click()
        (root / 'local.kml').write_text(KML.replace('106,21 ','106,21,0 '), encoding='utf-8')
        open_import(page)
        page.locator('input[type=file]').set_input_files(root / 'local.kml')
        expect(page.locator('.geodata-layers li')).to_have_count(7)
        page.locator('.geodata-feature').nth(4).click()
        page.get_by_role('button', name='Nguồn và tọa độ').click()
        expect(page.locator('.geodata-metadata')).to_contain_text('<img src=x')
        assert page.locator('.geodata-metadata img').count() == 0
        expect(page.get_by_role('combobox', name='Vai trò đối tượng', exact=True)).to_have_count(0)
        # A fresh project with overlapping footprints has 100%, not 150%, coverage.
        page.evaluate("localStorage.removeItem('dear.geodata.v1'); localStorage.removeItem('dear.gis.v2')")
        page.reload()
        paste(page,'AOI: POLYGON((104 21,106 21,106 22,104 22,104 21))','aoi')
        paste(page,'Left: POLYGON((104 21,105.5 21,105.5 22,104 22,104 21))\nRight: POLYGON((104.5 21,106 21,106 22,104.5 22,104.5 21))','footprint')
        page.get_by_role('tab', name='Vùng quan tâm', exact=True).click()
        expect(page.locator('[data-coverage-total]')).to_have_text('100%')
        page.get_by_role('tab', name='Lớp', exact=True).click()
        page.get_by_role('checkbox', name='Hiện Left', exact=True).click()
        page.get_by_role('tab', name='Vùng quan tâm', exact=True).click()
        expect(page.locator('[data-coverage-total]')).to_have_text('100%')
        page.get_by_role('tab', name='Lớp', exact=True).click()
        page.locator('.geodata-feature').filter(has_text='Right').click()
        page.get_by_role('textbox', name='Tên đối tượng').fill('Right renamed')
        page.get_by_role('button', name='Lưu tên', exact=True).click()
        page.get_by_role('tab', name='Vùng quan tâm', exact=True).click()
        expect(page.locator('.geodata-coverage table')).to_contain_text('Right renamed')
        page.get_by_role('tab', name='Lớp', exact=True).click()
        page.locator('.geodata-feature').filter(has_text='Right renamed').click()
        page.get_by_role('button', name='Sao chép WKT').click()
        expect(page.locator('.geodata-detail [role=status]')).to_contain_text('Đã sao chép WKT')
        assert page.evaluate('navigator.clipboard.readText()').startswith('POLYGON')
        for format in ['GeoJSON','KML']:
            with page.expect_download() as download:
                download_geometry(page, format)
            path = root / download.value.suggested_filename
            download.value.save_as(path)
            if format == 'GeoJSON':
                exported = json.loads(path.read_text(encoding='utf-8'))
                assert len(exported['features']) == 3
                assert abs(exported['metadata']['coverage']['fraction'] - 1) < 1e-10
            else:
                assert 'Right renamed' in path.read_text(encoding='utf-8')
        publish_draft(page)
        page.reload()
        expect(page.locator('.geodata-layers li')).to_have_count(3)
        expect(page.get_by_role('checkbox', name='Hiện Left', exact=True)).not_to_be_checked()
        # Drawing owns map input; Enter closes a valid ring, Escape cancels only the drawing.
        gis_task(page, 'aoi')
        page.get_by_role('button', name='Vẽ vùng quan tâm', exact=True).click()
        surface = page.locator('.geodata-map-surface')
        for x,y in [(170,130),(270,130),(270,230),(190,240)]:
            surface.click(position={'x':x,'y':y})
        expect(page.locator('.geodata-drawing-bar')).to_contain_text('4 đỉnh')
        page.locator('.geodata-map-surface').focus()
        page.keyboard.press('Backspace')
        expect(page.locator('.geodata-drawing-bar')).to_contain_text('3 đỉnh')
        page.keyboard.press('Enter')
        expect(page.locator('.geodata-drawing-bar')).not_to_be_visible()
        expect(page.locator('.geodata-layers li')).to_have_count(3)
        records = json.loads(reviewed_records_json(page))
        assert len([r for r in records if r['role'] == 'aoi']) == 1
        drawn=next(record for record in records if record['role'] == 'aoi')
        assert drawn['feature']['geometry']['coordinates'][0][0] == drawn['feature']['geometry']['coordinates'][0][-1]
        gis_task(page, 'aoi')
        page.get_by_role('button', name='Vẽ vùng quan tâm', exact=True).click()
        surface.click(position={'x':160,'y':130})
        page.get_by_role('button', name='Hoàn tác GIS', exact=True).focus()
        page.keyboard.press('Escape')
        expect(page.locator('.geodata-drawing-bar')).not_to_be_visible()
        expect(page.locator('.geodata-workspace')).to_be_visible()
        expect(page.locator('.geodata-layers li')).to_have_count(3)
        # Geometry and UI round trip through exported KML, including polygon holes.
        page.get_by_role('tab', name='Lớp', exact=True).click()
        open_import(page)
        page.locator('input[type=file]').set_input_files(root / 'dear-all.kml')
        expect(page.locator('.geodata-layers li')).to_have_count(6)
        for width in [1366,1024,390,320]:
            page.set_viewport_size({'width':width,'height':740})
            for theme in ['light','dark']:
                page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
                if width < 761:
                    page.locator('.geodata-mobile-tabs').get_by_role('button', name='Dữ liệu', exact=True).click()
                check_controls(page, theme)
                expect(page.locator('.geodata-title')).to_be_visible()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width,theme)
                assert page.locator('.geodata-sidebar').evaluate('node=>node.scrollWidth <= node.clientWidth'), (width,theme)
                if width < 761:
                    page.locator('.geodata-mobile-tabs').get_by_role('button', name='Bản đồ', exact=True).click()
                    expect(surface).to_be_visible()
                    surface.click(position={'x':60,'y':80})
                    page.locator('.geodata-mobile-tabs').get_by_role('button', name='Dữ liệu', exact=True).click()
                if captures and width in [1366,320]:
                    page.screenshot(path=str(captures / f'gis-{theme}-{width}.png'), animations='disabled')
        assert not errors, errors
        # GIS opens directly from the map toolbar and returns keyboard focus on close.
        page.set_viewport_size({'width':1366,'height':768})
        publish_draft(page)
        page.goto(url+'/?map=2d&demoRole=manager')
        expect(page.locator('.incident-priority-row').first).to_be_visible(timeout=25000)
        for iteration in range(3):
            page.get_by_role('button', name='Dữ liệu GIS', exact=True).click()
            expect(page.locator('.geodata-workspace')).to_have_attribute('role','region')
            expect(page.locator('.geodata-layers li')).to_have_count(6)
            check_controls(page, page.locator('html').get_attribute('data-theme'))
            assert page.locator('.geodata-title button').count() == 1, 'Duplicate exit controls'
            if iteration == 0:
                gis_task(page, 'aoi')
                page.get_by_role('button', name='Vẽ vùng quan tâm', exact=True).click()
                surface.click(position={'x':100,'y':100});page.keyboard.press('Escape')
                expect(page.locator('.geodata-workspace')).to_be_visible()
            page.keyboard.press('Escape')
            expect(page.locator('.geodata-workspace')).to_have_count(0)
            expect(page.get_by_role('button', name='Dữ liệu GIS', exact=True)).to_be_focused()
        assert not errors, errors
        # Complete drawings by double click or by clicking their first vertex.
        drawing_context = browser.new_context(viewport={'width':1366,'height':768})
        drawing_context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(url + '/') else route.abort())
        drawing_page = drawing_context.new_page()
        drawing_page.goto(url + '/?map=2d&workspace=geodata&offline=1')
        draw_surface = drawing_page.locator('.geodata-map-surface')
        for mode in ['double','first']:
            gis_task(drawing_page, 'aoi')
            drawing_page.get_by_role('button', name='Vẽ vùng quan tâm', exact=True).click()
            for x,y in [(170,130),(270,130),(270,230)]:
                draw_surface.click(position={'x':x,'y':y})
            if mode == 'double':
                draw_surface.dblclick(position={'x':270,'y':230})
            else:
                draw_surface.click(position={'x':170,'y':130})
            expect(drawing_page.locator('.geodata-drawing-bar')).not_to_be_visible()
            assert not drawing_page.locator('[role=alert]').count()
        expect(drawing_page.locator('.geodata-layers li')).to_have_count(1)
        assert not any(record['visible'] is False for record in json.loads(reviewed_records_json(drawing_page)))
        drawing_context.close()
        context.close()
        check_large_import(browser, url, root)
        check_point_and_kml_semantics(browser, url, root, captures)
        browser.close()
        print('GIS data passed: 1,000-feature / >2 MB KML, limit rollback, DMS batch, WKT/point, KML MultiGeometry/holes, solid point paint, attributes/Z/altitude-mode round trip, atomic errors, union coverage, visibility, drawing, persistence, export, modal lifecycle and responsive themes.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:5213')
    parser.add_argument('--chrome', default=None)
    parser.add_argument('--captures', type=Path)
    args = parser.parse_args()
    run(args.url.rstrip('/'),args.chrome,args.captures)
