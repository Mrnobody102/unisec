"""Workspace layout and semantic layer visibility in coordinator/resident maps."""
import argparse
import copy
import json
from playwright.sync_api import expect, sync_playwright

STAMP = '2026-09-29T02:00:00Z'
VERSION = 'che-tao-2026-09-29-v0.2'


def fixture_records():
    area = dict(schema='landslide-area/v1', state='potential', part='source', review='unreviewed', reviewer='', reviewedAt='', sources=['field'], basis='Vùng kiểm thử có căn cứ thực địa.', observedAt=STAMP, imageReference='', imageResolutionM=None, boundaryAccuracyM=None, observationIds=[], networkVersion=VERSION, roadLinks=[], mappedAt=STAMP, updatedAt=STAMP)
    polygon = dict(type='Polygon', coordinates=[[[104.02,21.71],[104.035,21.71],[104.035,21.725],[104.02,21.71]]])
    def record(id, name, geometry, properties=None, visible=True):
        return dict(id=id, name=name, role='reference', visible=visible, source=dict(name='Browser fixture',format='drawing',importedAt=STAMP), feature=dict(type='Feature',geometry=geometry,properties=properties or {}))
    slope = record('slope','Vùng nguy cơ kiểm thử',polygon,{'dearLandslideArea':area})
    other = copy.deepcopy(slope);other['id']='other-network';other['feature']['properties']['dearLandslideArea']['networkVersion']='other'
    point = record('reference','Điểm tham chiếu',dict(type='Point',coordinates=[104.04,21.73]))
    hidden = record('hidden-owner','Ghi nhận đã ẩn',dict(type='Point',coordinates=[104.03,21.71]),visible=False)
    child = record('hidden-area','Vùng gắn ghi nhận đã ẩn',polygon,{'dearFieldArea':dict(schema='field-area/v1',observationId='hidden-owner',status='unreviewed',createdAt=STAMP)})
    return [slope,other,point,hidden,child]


def run(url, chrome):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, **({'executable_path':chrome} if chrome else {}))
        context = browser.new_context(viewport={'width':1280,'height':720})
        context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url+'/') else r.abort())
        value = json.dumps(dict(schema='dear-gis/v2',records=fixture_records(),scenarios={}),ensure_ascii=False)
        context.add_init_script('if (!localStorage.getItem("dear.gis.v2")) localStorage.setItem("dear.gis.v2",'+json.dumps(value)+');')
        page = context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url+'/?map=2d&offline=1&demoRole=manager')
        expect(page.locator('.incident-overview-heading')).to_be_visible(timeout=30000)
        expect(page.get_by_role('button',name='Trình chiếu',exact=True)).to_have_count(0)
        expect(page.locator('.assessment-timeline')).to_be_visible()
        assert page.locator('.map-area').bounding_box()['width'] >= 1280*.7
        expect(page.locator('.landslide-area')).to_have_count(1)
        expect(page.locator('.map-reference-point')).to_have_count(1)
        page.locator('.landslide-area').click()
        card=page.get_by_role('region',name='Vùng sạt lở',exact=True)
        expect(card).to_be_visible()
        page.get_by_role('button',name='Ẩn bảng thông tin',exact=True).click()
        expect(card).to_be_hidden()
        page.get_by_role('button',name='Mở bảng thông tin',exact=True).click()
        expect(card).to_be_visible()
        page.get_by_role('button',name='Đo trên bản đồ 2D',exact=True).click()
        expect(card).to_be_hidden()
        expect(page.locator('#response-panel')).to_have_css('visibility','visible')
        page.get_by_role('button',name='Đo trên bản đồ 2D',exact=True).click()
        expect(card).to_be_visible()
        card.get_by_role('button',name='Đóng điểm GIS',exact=True).click()
        page.get_by_role('button',name='Lớp bản đồ',exact=True).click()
        layers=page.locator('.layers-panel')
        layers.get_by_label('Dữ liệu GIS đã nhập (2D)',exact=True).uncheck()
        expect(page.locator('.landslide-area')).to_have_count(1)
        expect(page.locator('.map-reference-point')).to_have_count(0)
        layers.get_by_label('Sạt lở',exact=True).uncheck()
        expect(page.locator('.landslide-area')).to_have_count(0)
        expect(page.locator('.map-pin.landslide')).to_have_count(0)
        layers.get_by_label('Tình trạng đường',exact=True).uncheck()
        expect(page.locator('.map-pin.bridge')).not_to_have_count(0)
        expect(page.locator('.map-pin.crossing')).not_to_have_count(0)
        layers.get_by_label('Cầu, điểm vượt khe',exact=True).uncheck()
        expect(page.locator('.map-pin.bridge')).to_have_count(0)
        expect(page.locator('.map-pin.crossing')).to_have_count(0)
        page.keyboard.press('Escape')
        page.locator('.incident-overview-hazard').first.click()
        expect(page.locator('.map-pin.landslide.is-selected')).to_have_count(1)
        expect(page.locator('#response-panel')).to_have_css('visibility','hidden')
        page.get_by_role('button',name='Đóng chi tiết đối tượng',exact=True).click()
        page.locator('.incident-priority-row').first.click()
        expect(page.locator('#response-details')).to_contain_text('Nậm Khắt')
        timeline=page.locator('.assessment-timeline')
        timeline.get_by_role('button',name='09:45 Báo cáo chờ kiểm tra',exact=True).click()
        page.keyboard.press('Escape')
        expect(timeline.locator('.assessment-pending')).to_be_visible()
        timeline.locator('.assessment-pending').click()
        page.get_by_role('dialog',name='Báo cáo hiện trường',exact=True).get_by_role('button',name='Cập nhật bản đồ',exact=True).click()
        expect(timeline.get_by_role('button',name='09:45 Cập nhật thực địa',exact=True)).to_have_attribute('aria-pressed','true')
        expect(page.locator('.route-travel-estimate')).to_have_count(0)
        timeline.get_by_role('button',name='09:31 Đánh giá ban đầu',exact=True).click()
        expect(page.locator('.revision-notice')).to_be_visible()
        expect(page.locator('.landslide-area')).to_have_count(0)
        timeline.get_by_role('button',name='09:45 Cập nhật thực địa',exact=True).click()
        for width in [1440,390,320]:
            page.set_viewport_size({'width':width,'height':844})
            page.wait_for_function('document.documentElement.scrollWidth<=innerWidth')
        # The same published areas appear for residents; unrelated imported reference points do not.
        page.evaluate('localStorage.setItem("dear.demo-session.v1",JSON.stringify({id:"resident",role:"resident",name:"Người xem",communityId:null}))')
        page.goto(url+'/?map=2d&offline=1')
        expect(page.locator('.citizen-workspace')).to_be_visible(timeout=30000)
        page.get_by_role('button',name='Bản đồ',exact=True).click()
        expect(page.locator('.landslide-area')).to_have_count(1)
        expect(page.locator('.map-reference-point')).to_have_count(0)
        expect(page.locator('.map-road-route-line')).to_have_count(0)
        page.locator('.citizen-map-layers summary').click()
        page.get_by_label('Vùng và điểm sạt lở',exact=True).uncheck()
        expect(page.locator('.landslide-area')).to_have_count(0)
        expect(page.locator('.map-pin.landslide')).to_have_count(0)
        page.get_by_label('Vùng và điểm sạt lở',exact=True).check()
        expect(page.locator('.landslide-area')).to_have_count(1)
        assert not errors,errors
        browser.close()
    print('Workspace layers passed: single pane, recorded assessments, explicit report update, historical map, mobile layout and shared resident/coordinator layers.')


if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:5377');a.add_argument('--chrome');args=a.parse_args()
    run(args.url.rstrip('/'),args.chrome)
