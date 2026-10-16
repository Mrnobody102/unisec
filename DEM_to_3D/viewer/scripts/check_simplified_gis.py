"""Verify batch edits, live AOI dragging, minimal reports and optional HEIC decoding."""
from gis_browser_actions import gis_task, apply_boundary, reviewed_records
import argparse, base64, hashlib, json, uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from map_wait import settled_box

def run(url, chrome, heic, captures):
    source={'name':'field.kml','format':'KML','importedAt':'2026-10-12T00:00:00Z'}
    def record(name, geometry, role='reference'):
        return {'id':str(uuid.uuid4()),'name':name,'role':role,'visible':True,'source':source,'feature':{'type':'Feature','properties':{},'geometry':geometry}}
    points=[record(f'Điểm {i+1:03}',{'type':'Point','coordinates':[104.05+i*.001,21.78]}) for i in range(5)]
    aoi=record('Vùng khảo sát',{'type':'Polygon','coordinates':[[[104.045,21.775],[104.055,21.775],[104.055,21.785],[104.045,21.785],[104.045,21.775]]]},'aoi')
    child=record('Vùng gắn điểm',aoi['feature']['geometry'])
    child['feature']['properties']['dearFieldArea']={'schema':'field-area/v1','observationId':points[0]['id'],'status':'unreviewed','createdAt':'2026-10-12T00:00:00Z'}
    records=points+[aoi,child]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path=chrome)
        context=browser.new_context(viewport={'width':1440,'height':960})
        context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url+'/') else r.abort())
        page=context.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url+'/?map=2d&offline=1&demoRole=manager');expect(page.locator('.incident-priority-row').first).to_be_visible(timeout=25000)
        page.evaluate('(r)=>localStorage.setItem("dear.geodata.v1",JSON.stringify(r))',records);page.reload()
        page.get_by_role('button',name='Dữ liệu GIS',exact=True).click()
        gis_task(page)
        expect(page.locator('.app-header')).to_be_visible()
        assert page.locator('.geodata-workspace').bounding_box()['y'] >= page.locator('.app-header').bounding_box()['height']
        read=lambda:reviewed_records(page)
        page.get_by_role('button',name='Ẩn tất cả',exact=True).click();assert all(not r['visible'] for r in read())
        page.get_by_role('button',name='Hoàn tác GIS',exact=True).click(); reviewed_records(page);assert all(r['visible'] for r in read())
        page.get_by_role('button',name='Chọn nhiều',exact=True).click()
        page.get_by_label('Chọn Điểm 001',exact=True).check();page.get_by_label('Chọn Điểm 002',exact=True).check()
        page.locator('.geodata-bulk').get_by_role('button',name='Xóa',exact=True).click()
        assert len(read())==7
        page.get_by_role('button',name='Xóa mục đã chọn',exact=True).click();assert len(read())==4
        page.get_by_role('button',name='Hoàn tác GIS',exact=True).click(); reviewed_records(page);assert len(read())==7
        page.get_by_role('button',name='Xong',exact=True).click()
        page.get_by_role('tab',name='Vùng quan tâm',exact=True).click()
        page.get_by_label('Tên vùng',exact=True).fill('Ranh giới khảo sát mới');page.get_by_label('Tên vùng',exact=True).press('Enter')
        assert next(r for r in read() if r['id']==aoi['id'])['name']=='Ranh giới khảo sát mới'
        page.locator('#geo-panel-aoi').get_by_role('button',name='Sửa ranh giới',exact=True).click()
        box=settled_box(page,'.geodata-vertex')
        path=page.locator('.leaflet-drawing-pane path[stroke-width="3"]').first;before=path.get_attribute('d')
        page.mouse.move(box['x']+6,box['y']+6);page.mouse.down();page.mouse.move(box['x']+30,box['y']+20,steps=5)
        expect(path).not_to_have_attribute('d',before)
        page.mouse.up();apply_boundary(page)
        edited=next(r for r in read() if r['id']==aoi['id'])['feature']['geometry'];assert edited!=aoi['feature']['geometry']
        page.locator('#geo-panel-aoi').get_by_role('button',name='Sửa ranh giới',exact=True).click()
        box=settled_box(page,'.geodata-move-handle');page.mouse.move(box['x']+13,box['y']+13);page.mouse.down();page.mouse.move(box['x']+45,box['y']+33,steps=5);page.mouse.up()
        apply_boundary(page)
        moved=next(r for r in read() if r['id']==aoi['id'])['feature']['geometry']['coordinates'][0]
        old=edited['coordinates'][0];dx=moved[0][0]-old[0][0];dy=moved[0][1]-old[0][1]
        assert abs(dx)>0 and all(abs((b[0]-a[0])-dx)<1e-10 and abs((b[1]-a[1])-dy)<1e-10 for a,b in zip(old,moved))
        for width in [1440,1024,390,320]:
            page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        if captures:
            captures.mkdir(parents=True,exist_ok=True);page.set_viewport_size({'width':1440,'height':960});page.screenshot(path=str(captures/'gis-batch-aoi.png'))
        if heic:
            result=page.evaluate("""async b64=>{const {readFieldPhoto}=await import('/src/features/observations/photo.ts');const f=new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'field.heic',{type:''});const p=await readFieldPhoto(f);return {mime:p.mime,width:p.width,height:p.height,sha256:p.sha256,preview:p.preview.startsWith('data:image/jpeg;')};}""",base64.b64encode(heic.read_bytes()).decode())
            assert result['mime']=='image/heic' and result['preview'] and result['width']>0 and result['height']>0,result
            assert result['sha256']==hashlib.sha256(heic.read_bytes()).hexdigest()
        assert not errors,errors
        browser.close()
    print('Simplified GIS passed: shared header, batch hide/delete with undo and linked areas, AOI rename, live vertex and whole-area drag, responsive layout'+(', actual HEIC decoding/hash.' if heic else '.'))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:5174');p.add_argument('--chrome');p.add_argument('--heic',type=Path);p.add_argument('--captures',type=Path);a=p.parse_args();run(a.url.rstrip('/'),a.chrome,a.heic,a.captures)
