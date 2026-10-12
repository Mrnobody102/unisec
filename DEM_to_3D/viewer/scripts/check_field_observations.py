"""Verify local field photos, source integrity and GIS-to-response point mapping."""
import argparse, base64, hashlib, json, struct, tempfile
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

def run(url, chrome, captures):
    with tempfile.TemporaryDirectory() as temp, sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=chrome)
        fixture=browser.new_page()
        jpeg=base64.b64decode(fixture.evaluate("""()=>{const c=document.createElement('canvas');c.width=640;c.height=420;const x=c.getContext('2d');x.fillStyle='#e4e8eb';x.fillRect(0,0,640,420);x.fillStyle='#243242';x.font='20px sans-serif';x.fillText('TEST PHOTO - no disaster assessment',30,40);return c.toDataURL('image/jpeg').split(',')[1];}"""));fixture.close()
        model=b'Test Camera\0';model_at=38;gps_at=model_at+len(model);rational_at=gps_at+54
        entry=lambda tag,kind,count,value:struct.pack('<HHI',tag,kind,count)+(struct.pack('<I',value) if isinstance(value,int) else value)
        tiff=b'II*\0'+struct.pack('<I',8)+struct.pack('<H',2)+entry(272,2,len(model),model_at)+entry(34853,4,1,gps_at)+b'\0'*4+model
        tiff+=struct.pack('<H',4)+entry(1,2,2,b'N\0\0\0')+entry(2,5,3,rational_at)+entry(3,2,2,b'E\0\0\0')+entry(4,5,3,rational_at+24)+b'\0'*4
        tiff+=b''.join(struct.pack('<II',value,1) for value in [21,47,0,104,3,0])
        app1=b'Exif\0\0'+tiff
        jpg=Path(temp)/'field-photo-test.jpg';jpg.write_bytes(jpeg[:2]+b'\xff\xe1'+struct.pack('>H',len(app1)+2)+app1+jpeg[2:])
        bad=Path(temp)/'invalid.jpg';bad.write_text('not an image',encoding='utf-8')
        context=browser.new_context(viewport={'width':1440,'height':960})
        context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url+'/') else r.abort())
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url+'/?offline=1');expect(page.locator('.incident-priority-row').first).to_be_visible(timeout=25000)
        original_roads=page.locator('.map-road-target').count()
        original_road_box=page.locator('.map-road-target').first.bounding_box()
        page.get_by_role('button',name='Dữ liệu GIS',exact=True).click()
        page.get_by_role('button',name='Thêm điểm tọa độ',exact=True).click()
        entry=page.locator('.field-point-entry');entry.get_by_label('Tên điểm',exact=True).fill('Điểm khảo sát A')
        entry.get_by_label('Vĩ độ (°)',exact=True).fill('21.782919');entry.get_by_label('Kinh độ (°)',exact=True).fill('104.053554')
        entry.get_by_role('button',name='Đánh dấu điểm',exact=True).click()
        page.get_by_role('button',name='Thêm ghi nhận thực địa',exact=True).click()
        form=page.locator('.field-observation')
        form.get_by_label('Ghi chú hiện trường',exact=True).fill('Ghi nhận nghi sạt lở, cần kiểm tra tại hiện trường.')
        form.get_by_label('Người ghi nhận',exact=True).fill('Tổ khảo sát demo')
        form.get_by_label('Sai số vị trí (m)',exact=True).fill('8')
        form.get_by_label('Ảnh hiện trường',exact=True).set_input_files(str(bad))
        expect(form.get_by_role('alert')).to_contain_text('Không đọc được ảnh')
        expect(form.locator('.field-photo-gallery img')).to_have_count(0)
        form.get_by_label('Ảnh hiện trường',exact=True).set_input_files(str(jpg))
        expect(form.locator('.field-photo-gallery img')).to_have_count(1,timeout=15000)
        form.get_by_role('button',name='Lưu ghi nhận',exact=True).click()
        expect(form.get_by_role('button',name='Sửa ghi nhận',exact=True)).to_be_visible()
        records=json.loads(page.evaluate("localStorage.getItem('dear.geodata.v1')"));record=records[0];oid=record['id'];obs=record['feature']['properties']['dearObservation'];photo=obs['photos'][0]
        assert record['feature']['geometry']['coordinates']==[104.053554,21.782919]
        assert record['role']=='reference' and obs['status']=='unreviewed'
        assert photo['sha256']==hashlib.sha256(jpg.read_bytes()).hexdigest()
        assert photo['exif']['Model']=='Test Camera',photo['exif']
        assert abs(photo['exif']['latitude']-(21+47/60))<1e-6,photo['exif']
        assert photo['exif']['latitude'] != record['feature']['geometry']['coordinates'][1]
        if captures:captures.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(captures/'field-gis-light.png'))
        # GIS fitting must not move the independent response-map camera.
        page.get_by_role('button',name='Đóng dữ liệu GIS',exact=True).click()
        expect(page.locator('.geodata-workspace')).to_have_count(0)
        road_box=page.locator('.map-road-target').first.bounding_box()
        assert all(abs(road_box[k]-original_road_box[k])<1 for k in ['x','y','width','height']),(road_box,original_road_box)
        page.get_by_role('button',name='Dữ liệu GIS',exact=True).click()
        form=page.locator('.field-observation')
        form.get_by_role('button',name='Xem trên bản đồ ứng phó',exact=True).click()
        expect(page.locator('.geodata-workspace')).to_have_count(0)
        expect(page.locator(f'[data-field-id="{oid}"]')).to_be_visible()
        expect(page.locator('.field-map-card')).to_contain_text('Chưa xác minh')
        expect(page.locator('.field-map-card img')).to_have_count(1)
        assert page.locator('.map-road-target').count()==original_roads
        # Explicit visibility is separate from field classification and incident assessments.
        page.get_by_role('button',name='Lớp bản đồ',exact=True).click()
        page.get_by_label('Dữ liệu GIS đã nhập (2D)',exact=True).uncheck()
        expect(page.locator(f'[data-field-id="{oid}"]')).to_have_count(0)
        page.get_by_label('Dữ liệu GIS đã nhập (2D)',exact=True).check();page.get_by_role('button',name='Đóng lớp bản đồ',exact=True).click()
        expect(page.locator(f'[data-field-id="{oid}"]')).to_be_visible()
        for width in [1440,1024,390,320]:
            page.set_viewport_size({'width':width,'height':900})
            for theme in ['light','dark']:
                page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
                page.wait_for_timeout(220)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,theme)
                assert page.locator('.field-map-card').evaluate('n=>n.scrollWidth<=n.clientWidth'),(width,theme)
                card=page.locator('.field-map-card').bounding_box(); toolbar=page.locator('.map-toolbar').bounding_box()
                assert card['y'] >= toolbar['y']+toolbar['height'],(width,theme,card,toolbar)
                if captures and width in [1440,320]:page.screenshot(path=str(captures/f'field-response-{width}-{theme}.png'))
        page.set_viewport_size({'width':1440,'height':960})
        page.locator('.field-map-card').get_by_role('button',name='Mở hồ sơ trong GIS',exact=True).click()
        form=page.locator('.field-observation');expect(form).to_contain_text(obs['note'])
        form.get_by_role('button',name='Sửa ghi nhận',exact=True).click();form.get_by_label('Ghi chú hiện trường',exact=True).fill('This change must not be retained')
        page.evaluate("""()=>{window.__fieldSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dear.geodata.v1')throw new Error('QuotaExceeded');return window.__fieldSet.call(this,k,v);};}""")
        form.get_by_role('button',name='Lưu ghi nhận',exact=True).click();expect(form.get_by_role('alert')).to_be_visible()
        assert json.loads(page.evaluate("localStorage.getItem('dear.geodata.v1')"))[0]['feature']['properties']['dearObservation']['note']==obs['note']
        page.evaluate('()=>{Storage.prototype.setItem=window.__fieldSet;}')
        form.get_by_role('button',name='Hủy',exact=True).click()
        form.get_by_role('button',name='Sửa ghi nhận',exact=True).click()
        expect(form.get_by_label('Ghi chú hiện trường',exact=True)).to_have_value(obs['note'])
        form.get_by_role('button',name='Hủy',exact=True).click()
        page.goto(url+'/?offline=1&gisPoint='+oid)
        expect(page.locator('.field-map-card')).to_contain_text(obs['note'],timeout=25000)
        expect(page.locator('.field-map-card img')).to_have_count(1)
        page.locator('.field-map-card').get_by_role('button',name='Mở hồ sơ trong GIS',exact=True).click()
        with page.expect_download() as download:page.get_by_role('button',name='GeoJSON',exact=True).click()
        exported=json.loads(Path(download.value.path()).read_text(encoding='utf-8'))
        assert exported['features'][0]['properties']['dearObservation']==obs
        with page.expect_download() as download:page.get_by_role('button',name='KML',exact=True).click()
        kml=Path(temp)/'field-roundtrip.kml';kml.write_bytes(Path(download.value.path()).read_bytes())
        page.locator('.geodata-import input[type=file]').set_input_files(str(kml))
        expect(page.locator('.geodata-layers li')).to_have_count(2)
        page.locator('.geodata-layers li').last.get_by_role('button').first.click()
        expect(page.locator('.field-observation')).to_contain_text(obs['note'])
        expect(page.locator('.field-observation .field-photo-gallery img')).to_have_count(1)
        assert not errors,errors
        context.close();browser.close()
    print('Field observations passed: coordinate entry, pending annotation, real EXIF/camera GPS, thumbnail/hash, invalid-photo rollback, shared response map, visibility, storage failure, reload/export and responsive themes.')
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:5174');parser.add_argument('--chrome',default='C:/Program Files/Google/Chrome/Application/chrome.exe');parser.add_argument('--captures',type=Path)
    args=parser.parse_args();run(args.url.rstrip('/'),args.chrome,args.captures)
