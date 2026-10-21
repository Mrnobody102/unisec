"""Map regression: imported points, moved hazards, detail ownership and responsive framing."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


def run(url, captures, only=None, chrome=None):
    captures.mkdir(parents=True, exist_ok=True)
    failures = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=chrome,
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        def context():
            ctx = browser.new_context(viewport={'width':1440,'height':960}, reduced_motion='reduce')
            ctx.route('**/*',lambda route:route.continue_() if route.request.url.startswith(url+'/') else route.abort())
            return ctx
        def case(name, action):
            if only and name != only: return
            ctx = context()
            page = ctx.new_page()
            page.set_default_timeout(12000)
            errors = []
            page.on('pageerror',lambda error:errors.append(str(error)))
            try:
                action(page,ctx)
                assert not errors,errors
                print(name+'_PASSED',flush=True)
            except Exception as error:
                page.screenshot(path=str(captures/(name+'-failure.png')))
                failures.append((name,str(error)))
                print(name+'_FAILED '+str(error)[:600],flush=True)
            finally:
                ctx.close()
        def ready(page):
            expect(page.locator('.incident-landslide-row')).to_have_count(3,timeout=45000)
        def overview(page):
            page.goto(url+'/?offline=1&map=2d&demoRole=manager')
            ready(page)
        def ensure_selection(page,selector):
            try:
                page.wait_for_function('''selector=>{
                const pin=document.querySelector(selector),map=document.querySelector('.map-canvas'),dock=document.querySelector('#response-details');
                if(!pin||pin.hidden||!map)return false;
                const a=pin.getBoundingClientRect(),b=map.getBoundingClientRect(),d=dock?.getBoundingClientRect();
                return a.width>0&&a.left>b.left+4&&a.right<b.right-4&&a.top>b.top+4&&a.bottom<b.bottom-4&&
                    (!d||!d.width||a.right<d.left-4||a.left>d.right+4||a.bottom<d.top-4||a.top>d.bottom+4);
                }''',arg=selector,timeout=45000)
            except Exception:
                print('FOCUS_DIAGNOSTIC',selector,page.locator(selector).evaluate_all('nodes=>nodes.map(n=>({hidden:n.hidden,html:n.outerHTML.slice(0,350),rect:n.getBoundingClientRect().toJSON()}))'),page.locator('.map-canvas,#response-details').evaluate_all('nodes=>nodes.map(n=>({class:n.className,hidden:n.hidden,rect:n.getBoundingClientRect().toJSON()}))'),flush=True)
                raise
        def imported(page,ctx,observation=False):
            record={'id':'audit-point','name':'Điểm nhập kiểm tra','role':'reference','visible':True,
                'source':{'name':'audit.geojson','format':'GeoJSON','importedAt':'2026-10-20T00:00:00Z'},
                'feature':{'type':'Feature','properties':{},'geometry':{'type':'Point','coordinates':[104.0469,21.7575]}}}
            if observation:
                record['feature']['properties']['dearObservation']={'schema':'field-observation/v1','kind':'suspected-landslide','note':'Audit',
                    'observedAt':'2026-10-20T00:00:00Z','observer':'Survey','accuracyM':10,'status':'unreviewed','updatedAt':'2026-10-20T00:00:00Z','photos':[]}
            ctx.add_init_script("if(!localStorage.getItem('dear.geodata.v1'))localStorage.setItem('dear.geodata.v1',"+json.dumps(json.dumps([record]))+");")
            page.goto(url+'/?offline=1&map=2d&demoRole=manager&gisPoint=audit-point')
            ready(page)
            expect(page.locator('#response-details h2')).to_have_text(record['name'])
            ensure_selection(page,'.field-map-marker.map-selected-reference' if observation else '.survey-reference-point.map-selected-reference')
            print('IMPORTED_2D_FOCUSED',flush=True)
            page.get_by_role('button',name='Chuyển sang 3D',exact=True).click()
            ensure_selection(page,'[data-map-reference="audit-point"]')
            if observation:
                expect(page.locator('[data-map-reference="audit-point"] b')).to_have_text('!')
            page.get_by_role('button',name='Chuyển sang 2D',exact=True).click()
            ensure_selection(page,'.field-map-marker.map-selected-reference' if observation else '.survey-reference-point.map-selected-reference')
            # Mobile and pane layouts have no right-side dock over the map.
            for width in (1024,390,320):
                page.set_viewport_size({'width':width,'height':900})
                if width<=900:
                    page.locator('.mobile-view-switch').get_by_role('button',name='Bản đồ',exact=True).click()
                ensure_selection(page,'.field-map-marker.map-selected-reference' if observation else '.survey-reference-point.map-selected-reference')
        def moved(page,ctx):
            overview(page)
            packet=page.evaluate("fetch('/scenarios/che-tao/v0.3/incident.json').then(r=>r.json())")
            hazard=packet['hazards'][0]
            edit={'id':'audit-move','at':'2026-10-21T00:00:00Z','author':{'id':'audit','name':'Audit'},
                'target':{'type':'hazard','id':hazard['id'],'name':hazard['name'][0]},
                'change':{'kind':'move','from':hazard['projected'],'to':{'x':hazard['projected']['x']+400,'y':hazard['projected']['y']}},'note':'Move regression'}
            page.evaluate('''edit=>{const value=JSON.parse(localStorage.getItem('dear.gis.v2'));value.scenarios['che-tao-2026-09-12-v0.3']=[edit];localStorage.setItem('dear.gis.v2',JSON.stringify(value));}''',edit)
            page.reload()
            ready(page)
            # The source station remains at its real coordinate after the incident moves.
            expect(page.locator('.survey-reference-point')).to_have_count(1)
        def close_gis(page,ctx):
            overview(page)
            page.locator('.incident-landslide-row').first.click()
            detail=page.locator('#response-details')
            detail.get_by_role('button',name='Sửa trong GIS',exact=True).click()
            workspace=page.locator('.geodata-workspace')
            workspace.locator('.geodata-task-nav').get_by_role('button',name='Dữ liệu',exact=True).click()
            workspace.locator('.geodata-feature').first.click()
            workspace.get_by_role('button',name='Về bản đồ ứng phó',exact=True).click()
            expect(detail.locator('h2')).to_be_visible()
            detail.get_by_role('button',name='Đóng điểm GIS',exact=True).click()
            expect(detail).to_have_count(0)
            expect(page.locator('.map-pin.is-selected')).to_have_count(0)
        def responsive(page,ctx):
            overview(page)
            for width in (1440,1024,800,390,320):
                page.set_viewport_size({'width':width,'height':900})
                if width<=900:
                    page.locator('.mobile-view-switch').get_by_role('button',name='Thông tin',exact=True).click()
                page.locator('.workspace-nav button[data-view="incident"]').click()
                page.locator('.incident-landslide-row').last.click()
                if width<=900:
                    page.locator('.mobile-view-switch').get_by_role('button',name='Bản đồ',exact=True).click()
                ensure_selection(page,'.map-pin.is-selected')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.screenshot(path=str(captures/f'focus-{width}.png'))
        def gis_focus(page,ctx):
            overview(page)
            page.set_viewport_size({'width':1024,'height':900})
            page.locator('.incident-landslide-row').first.click()
            page.locator('#response-details').get_by_role('button',name='Sửa trong GIS',exact=True).click()
            expect(page.locator('.geodata-workspace')).to_be_visible()
            expect(page.locator('.geodata-map .map-pin.is-selected:visible')).to_have_count(1)
            page.screenshot(path=str(captures/'gis-focus-1024.png'))
        def location_pick(page,ctx):
            overview(page)
            page.locator('.incident-landslide-row').first.click()
            page.get_by_role('button',name='Chuyển sang 3D',exact=True).click()
            ensure_selection(page,'.map-pin.is-selected')
            # Enabling a terrain tool rebuilds the screen marker layer. Save the geographic
            # target before that transition instead of reading a detached/hidden marker.
            marker=page.locator('.map-pin.is-selected').bounding_box()
            assert marker is not None
            page.get_by_role('button',name='Công cụ bổ sung',exact=True).click()
            page.get_by_role('button',name='Thông tin vị trí',exact=True).click()
            expect(page.locator('.terrain-viewer .map-marker-layer')).to_have_attribute('inert','')
            # A marker must not intercept a coordinate pick on the terrain underneath it.
            page.mouse.click(marker['x']+marker['width']/2,marker['y']+marker['height']-5)
            expect(page.locator('.map-location-panel dd').first).not_to_have_text('—',timeout=15000)
            expect(page.locator('.map-location-panel dd').first).to_contain_text('21.')
        def layers_search(page,ctx):
            overview(page)
            page.get_by_role('button',name='Lớp bản đồ',exact=True).click()
            panel=page.locator('.layers-panel')
            panel.get_by_role('checkbox',name='Sạt lở',exact=True).uncheck()
            expect(page.locator('.map-pin.landslide')).to_have_count(0)
            expect(page.locator('.map-2d path.landslide-area')).to_have_count(0)
            panel.get_by_role('button',name='Đóng lớp bản đồ',exact=True).click()
            search=page.get_by_role('combobox',name='Tìm trên bản đồ',exact=True)
            search.fill('vet sat 01')
            page.get_by_role('option').first.click()
            expect(page.locator('#response-details h1')).to_have_text('Vết sạt 01')
            ensure_selection(page,'.map-pin.is-selected')
            expect(page.locator('.map-2d path.landslide-area')).to_have_count(47)
            page.locator('#response-details').get_by_role('button',name='Đóng chi tiết đối tượng',exact=True).click()
            page.locator('.workspace-nav button[data-view="priority"]').click()
            page.locator('#response-panel .community').first.click()
            ensure_selection(page,'.map-pin.is-selected')
            section=page.locator('.route-sections-toggle')
            if section.get_attribute('aria-expanded') != 'true': section.click()
            page.locator('.route-section-row').last.click()
            # Inspecting a route section frames that section rather than the community point.
            expect(page.locator('.route-section-list > li.is-selected')).to_have_count(1)
            road_id=page.locator('.route-section-list > li.is-selected').get_attribute('data-road-id')
            page.wait_for_function('''id=>{
                const path=document.querySelector('.map-road-target[data-road-id="'+id+'"]'),map=document.querySelector('.map-canvas'),dock=document.querySelector('#response-details');
                if(!path||!map||!dock)return false;
                const p=path.getBoundingClientRect(),m=map.getBoundingClientRect(),d=dock.getBoundingClientRect();
                return p.top>m.top+30&&p.bottom<m.bottom-30&&p.left>m.left+30&&p.right<d.left-20;
            }''',arg=road_id,timeout=15000)
            page.wait_for_timeout(400)
            page.screenshot(path=str(captures/'selected-route-section.png'))
        case('IMPORTED_POINT_2D_3D',imported)
        case('OBSERVATION_2D_3D',lambda page,ctx:imported(page,ctx,True))
        case('MOVED_HAZARD_SOURCE',moved)
        case('GIS_CLOSE_OWNERSHIP',close_gis)
        case('RESPONSIVE_SELECTION',responsive)
        case('GIS_NARROW_FOCUS',gis_focus)
        case('TERRAIN_COORDINATE_PICK',location_pick)
        case('LAYERS_SEARCH_ROUTE_SECTION',layers_search)
        browser.close()
    assert not failures,failures


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='http://127.0.0.1:5174')
    parser.add_argument('--captures',type=Path,required=True)
    parser.add_argument('--only')
    parser.add_argument('--chrome')
    args=parser.parse_args()
    run(args.url.rstrip('/'),args.captures,args.only,args.chrome)
