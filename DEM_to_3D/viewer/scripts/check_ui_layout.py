"""Exercise GIS discovery, inspectors and legible form controls at supported widths."""
from gis_browser_actions import map_tool
import argparse
import tempfile
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


def audit_text(page):
    problems=page.evaluate('''() => {
      const issues=[];
      for(const el of document.querySelectorAll('label,button,dt,summary')){
        const box=el.getBoundingClientRect();
        if(!box.width || !box.height || getComputedStyle(el).visibility==='hidden')continue;
        for(const node of el.childNodes){
          if(node.nodeType!==Node.TEXT_NODE || node.textContent.trim().length<8)continue;
          const range=document.createRange();range.selectNodeContents(node);
          const lines=[...range.getClientRects()].filter(r=>r.width>1);
          if(lines.length>=3 && lines.every(r=>r.width<35))issues.push({text:node.textContent.trim(),width:box.width});
        }
      }
      return issues;
    }''')
    assert not problems, problems
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Page scrolls horizontally'


def run(url, chrome):
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True, executable_path=chrome)
        page=browser.new_page(viewport={'width':1440,'height':960})
        page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(url+'/') else route.abort())
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(url+'/?offline=1&map=2d&demoRole=manager')
        expect(page.locator('.incident-overview-heading')).to_be_visible(timeout=30000)
        expect(page.locator('.assessment-timeline')).not_to_be_visible()
        expect(page.locator('.map-advanced-tools')).not_to_be_visible()
        expect(page.locator('.map-bottom-bar')).to_have_attribute('data-minimized','true')
        page.get_by_role('button',name='Diễn biến sự kiện',exact=True).click()
        expect(page.locator('.assessment-timeline')).to_be_visible()
        expanded_height=page.locator('.work-area').bounding_box()['height']
        page.get_by_role('button',name='Thu gọn diễn biến',exact=True).click()
        expect(page.locator('.map-timeline-toggle')).to_be_focused()
        assert page.locator('.work-area').bounding_box()['height'] >= expanded_height+60
        page.get_by_role('button',name='Cài đặt hiển thị',exact=True).click()
        page.get_by_role('button',name='Thu gọn tiêu đề',exact=True).click()
        expect(page.locator('.app-header')).not_to_be_visible()
        expect(page.locator('.map-header-restore')).to_be_focused()
        page.get_by_role('button',name='Hiện tiêu đề',exact=True).click()
        expect(page.get_by_role('button',name='Cài đặt hiển thị',exact=True)).to_be_focused()
        map_tool(page,'Đo trên bản đồ 2D').click()
        page.locator('.map-tool-toggle').click()
        page.get_by_role('button',name='Đóng công cụ đo',exact=True).click()
        expect(page.locator('.map-tool-toggle')).to_be_focused()
        page.get_by_role('button',name='Nguồn bản đồ',exact=True).click()
        expect(page.locator('.map-source-popover')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.get_by_role('button',name='Nguồn bản đồ',exact=True)).to_be_focused()
        for width in [1440,1100,901,768,390,320]:
            page.set_viewport_size({'width':width,'height':960})
            if page.locator('.mobile-view-switch').is_visible():
                page.locator('.mobile-view-switch').get_by_role('button',name='Bản đồ',exact=True).click()
            page.locator('.map-tool-toggle').click()
            expect(page.locator('.map-advanced-tools')).to_be_visible()
            advanced=page.locator('.map-advanced-tools').bounding_box()
            canvas=page.locator('.map-canvas').bounding_box()
            assert canvas['y'] >= advanced['y']+advanced['height']-1, (width,advanced,canvas)
            audit_text(page)
            page.locator('.map-tool-toggle').click()
            page.get_by_role('button',name='Lớp bản đồ',exact=True).click()
            expect(page.locator('.layers-panel')).to_be_visible()
            page.locator('.layer-appearance > summary').click()
            audit_text(page)
            page.keyboard.press('Escape')
        page.set_viewport_size({'width':1440,'height':960})
        long_name='Điểm khảo sát sườn dốc phía thượng lưu đường vào thôn Chế Tạo cần xác minh hiện trường'
        page.evaluate('''name=>{
          const data=JSON.parse(localStorage.getItem('dear.gis.v2'));
          data.records.unshift({id:'layout-survey',name,role:'reference',visible:true,
            source:{name:'Layout check',format:'coordinate',importedAt:new Date().toISOString()},
            feature:{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[104.052,21.758]}}});
          localStorage.setItem('dear.gis.v2',JSON.stringify(data));
        }''',long_name)
        page.reload()
        expect(page.locator('.incident-overview-heading')).to_be_visible(timeout=30000)
        baseline=page.evaluate("localStorage.getItem('dear.gis.v2')")
        map_tool(page, 'Dữ liệu GIS').click()
        workspace=page.locator('.geodata-workspace')
        expect(workspace.locator('.geodata-task-nav').get_by_role('button',name='Dữ liệu',exact=True)).to_have_attribute('aria-pressed','true')
        expect(workspace.get_by_role('button',name='Nhập dữ liệu',exact=True)).to_be_visible()
        expect(workspace.locator('.geodata-feature').first).to_be_in_viewport()
        expect(workspace.locator('.geodata-export button').first).not_to_be_visible()
        expect(page.locator('.assessment-timeline')).not_to_be_visible()
        search=workspace.get_by_role('searchbox',name='Tìm đối tượng',exact=True)
        first=workspace.locator('.geodata-feature strong').first.inner_text()
        search.fill(first)
        expect(workspace.locator('.geodata-feature')).to_have_count(1)
        search.fill('không có đối tượng trùng tên này')
        expect(workspace.locator('.geodata-layers .geodata-empty')).to_contain_text('Không tìm thấy đối tượng.')
        search.fill('')
        for width in [1440,1100,901,768,390,320]:
            page.set_viewport_size({'width':width,'height':960})
            mobile=workspace.locator('.geodata-mobile-tabs')
            if mobile.is_visible():mobile.get_by_role('button',name='Dữ liệu',exact=True).click()
            workspace.locator('.geodata-feature').first.click()
            inspector=workspace.get_by_role('complementary',name='Hồ sơ đối tượng',exact=True)
            expect(inspector).to_be_visible()
            expect(inspector.locator('.geodata-inspector-header h2')).to_have_text(long_name)
            audit_text(page)
            assert inspector.locator('.geodata-feature-actions').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1'), 'Feature actions overflow'
            workspace.get_by_role('button',name='Đóng hồ sơ đối tượng',exact=True).click()
            expect(workspace.locator('.geodata-feature').first).to_be_in_viewport()
        page.set_viewport_size({'width':1440,'height':960})
        workspace.locator('.geodata-data-tools > summary').click()
        workspace.get_by_role('tab',name='Vùng quan tâm',exact=True).click()
        workspace.get_by_role('tab',name='Lớp',exact=True).click()
        expect(workspace.get_by_role('tab',name='Ảnh vệ tinh',exact=True)).to_be_visible()
        workspace.locator('.geodata-export > details > summary').click()
        expect(workspace.locator('.geodata-export').get_by_role('button',name='GeoJSON',exact=True)).to_be_visible()
        assert baseline==page.evaluate("localStorage.getItem('dear.gis.v2')"), 'Viewing and filtering changed saved records'
        page.screenshot(path=str(Path(tempfile.gettempdir())/'dear-gis-layout-light.png'))
        page.get_by_role('button',name='Đóng dữ liệu GIS',exact=True).click()
        page.get_by_role('button',name='Cài đặt hiển thị',exact=True).click()
        page.get_by_role('button',name='Tối',exact=True).click()
        page.keyboard.press('Escape')
        map_tool(page, 'Dữ liệu GIS').click()
        audit_text(page)
        page.screenshot(path=str(Path(tempfile.gettempdir())/'dear-gis-layout-dark.png'))
        assert not errors, errors
        browser.close()
    print('UI layout passed: 320–1440px, readable labels, feature search/empty state, one inspector, compact tools/export, unchanged records and light/dark themes.')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:5220');parser.add_argument('--chrome');args=parser.parse_args()
    run(args.url.rstrip('/'),args.chrome)
