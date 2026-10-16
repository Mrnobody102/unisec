"""Regression for clustered-point cards, inspector exclusivity and photo modal stacking."""
from gis_browser_actions import gis_task
import argparse,base64,hashlib,tempfile,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from field_photo_fixture import create_field_photo

def run(url,chrome,captures):
 with tempfile.TemporaryDirectory() as temp,sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=chrome);jpg=create_field_photo(browser,temp);raw=jpg.read_bytes()
  preview='data:image/jpeg;base64,'+base64.b64encode(raw).decode();records=[]
  for i in range(3):
   photo={'id':str(uuid.uuid4()),'name':f'field-{i}.jpg','mime':'image/jpeg','bytes':len(raw),'width':640,'height':420,'preview':preview,'sha256':hashlib.sha256(raw).hexdigest(),'addedAt':'2026-10-12T00:00:00Z','exif':{}}
   obs={'schema':'field-observation/v1','kind':'other','note':'Ghi nhận thử nghiệm','observedAt':'','observer':'','accuracyM':None,'status':'unreviewed','updatedAt':'2026-10-12T00:00:00Z','photos':[photo]}
   records.append({'id':str(uuid.uuid4()),'name':f'Điểm cùng vị trí {i+1}','role':'reference','visible':True,'source':{'name':'field.geojson','format':'GeoJSON','importedAt':'2026-10-12T00:00:00Z'},'feature':{'type':'Feature','properties':{'dearObservation':obs},'geometry':{'type':'Point','coordinates':[104.05,21.78]}}})
  context=browser.new_context(viewport={'width':1440,'height':960});context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url+'/') else r.abort())
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url+'/?map=2d&offline=1&demoRole=manager');expect(page.locator('.incident-priority-row').first).to_be_visible(timeout=25000)
  page.evaluate('(r)=>localStorage.setItem("dear.geodata.v1",JSON.stringify(r))',records);page.reload();page.get_by_role('button',name='Dữ liệu GIS',exact=True).click()
  gis_task(page)
  symbol=page.locator('.geodata-map .map-point-cluster')
  expect(symbol).to_have_attribute('aria-label','3 điểm gần cùng vị trí')
  assert symbol.inner_text()=='','Aggregate markers must not replace coordinates with count labels'
  symbol.focus();page.keyboard.press('Enter');card=page.locator('.geodata-map .point-group-card');expect(card).to_be_visible();expect(card.locator('.point-group-list>li')).to_have_count(3);expect(card.locator('img')).to_have_count(3)
  card.locator('.point-group-hero button').first.click();expect(page.locator('.photo-lightbox')).to_be_visible();page.keyboard.press('ArrowRight');expect(page.locator('.photo-lightbox header')).to_contain_text('field-1.jpg');page.keyboard.press('Escape');expect(page.locator('.photo-lightbox')).to_have_count(0);expect(card).to_be_visible()
  card.locator('.point-group-row').first.click();expect(card).to_have_count(0);expect(page.locator('.geodata-inspector')).to_be_visible()
  page.locator('.geodata-map .map-point-cluster').click();expect(card).to_be_visible();expect(page.locator('.geodata-inspector')).not_to_be_visible()
  for width in [1440,1024,390,320]:
   page.set_viewport_size({'width':width,'height':900})
   if width<=760:
    page.locator('.geodata-mobile-tabs').get_by_role('button',name='Bản đồ',exact=True).click()
    if not card.is_visible():page.locator('.geodata-map .map-point-cluster').click()
   expect(card).to_be_visible();assert card.evaluate('n=>n.scrollWidth<=n.clientWidth+1'),width
   assert card.evaluate('n=>n.getBoundingClientRect().top>=n.parentElement.querySelector(\".geodata-map-toolbar\").getBoundingClientRect().bottom+7'),('Point popup overlaps wrapped map toolbar',width)
   assert card.evaluate('n=>{const b=n.getBoundingClientRect();return [...n.querySelectorAll(\".point-group-row\")].every(r=>r.getBoundingClientRect().bottom<=b.bottom+1)}'),('All report choices should fit without repeated photo thumbnails',width)
   card.locator('.point-group-hero button').first.click();expect(page.locator('.photo-lightbox')).to_be_visible();assert page.locator('.photo-lightbox').evaluate('n=>n.scrollWidth<=n.clientWidth+1'),width;page.keyboard.press('Escape');expect(card).to_be_visible()
   if captures:captures.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(captures/f'point-group-{width}.png'))
  page.set_viewport_size({'width':1440,'height':960});page.get_by_role('button',name='Đóng dữ liệu GIS',exact=True).click()
  surface=page.locator('.map-2d');box=surface.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2+200,steps=12);page.mouse.up();page.wait_for_timeout(500)
  page.locator('.map-2d .map-point-cluster').click();card=page.locator('.map-area>.point-group-card');expect(card).to_be_visible();card.locator('.point-group-row').first.click();expect(page.get_by_role('button',name='Quay lại nhóm điểm',exact=True)).to_be_visible();page.get_by_role('button',name='Quay lại nhóm điểm',exact=True).click();expect(card).to_be_visible()
  page.keyboard.press('Escape');expect(card).to_have_count(0);assert not errors,errors;browser.close()
 print('Point groups passed: unnumbered accessible symbols, keyboard group selection, photo paging/Escape, exclusive inspector, responsive popups and main-map return.')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:5174');p.add_argument('--chrome');p.add_argument('--captures',type=Path);a=p.parse_args();run(a.url.rstrip('/'),a.chrome,a.captures)
