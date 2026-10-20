"""Every overlapping symbol must select its own member and retain its ground anchor."""
import argparse
from pathlib import Path
from playwright.sync_api import expect,sync_playwright

def run(url,chrome,captures):
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=chrome)
  page=browser.new_page(viewport={'width':1440,'height':960})
  page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url+'/') else r.abort())
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url+'/?offline=1&map=2d&demoRole=manager')
  expect(page.locator('.map-pin:visible').first).to_be_visible(timeout=30000)
  # Fixture uses the same production renderer and CSS; IDs differ even when names repeat.
  page.evaluate("""async()=>{
   const {createScreenMarkers}=await import('/src/terrain/screenMarkers.ts');
   const host=document.createElement('div');host.id='selection-fixture';Object.assign(host.style,{position:'fixed',left:'280px',top:'130px',width:'620px',height:'430px',zIndex:5000,background:'#263b3d'});document.body.append(host);
   window.fixtureHits=[];let selected=null;
   const communities=[{id:'village-a',name:'Điểm A',projected:{x:260,y:210},prio:2},{id:'village-b',name:'Điểm A',projected:{x:263,y:214},prio:2}];
   const hazards=[{id:'hazard-c',name:['Sạt lở C','Hazard C'],projected:{x:258,y:217},kind:'landslide',observation:'reported'}];
   const sites=[{id:'site-d',name:['Bãi đáp D','Landing D'],projected:{x:262,y:218},kind:'hlz',assessment:'candidate'}];
   window.redrawFixture=()=>{window.fixtureRenderer?.dispose();window.fixtureRenderer=createScreenMarkers(host,{communities,hazards,responseSites:sites,layers:{communities:true,status:true,landslide:true,hlz:true,imagery:true},locale:'vi',selectedCommunityId:selected?.type==='community'?selected.id:null,selectedObjectId:selected&&selected.type!=='community'?selected.type+':'+selected.id:null,onSelect:hit=>{fixtureHits.push(hit);selected=hit;redrawFixture();}});fixtureRenderer.update(p=>p);};
   redrawFixture();
  }""")
  fixture=page.locator('#selection-fixture')
  for index,expected in enumerate([{'type':'hazard','id':'hazard-c'},{'type':'community','id':'village-a'},{'type':'community','id':'village-b'},{'type':'poi','id':'site-d'}]):
   marker=fixture.locator('.map-pin:visible');expect(marker).to_have_count(1)
   before=marker.bounding_box();marker.click()
   chooser=fixture.locator('.map-object-chooser');expect(chooser).to_be_visible()
   page.evaluate('fixtureRenderer.update(p=>p)')
   # Real mutation outside the renderer forces collision/layout refresh.
   page.evaluate("""()=>{const note=document.createElement('span');note.id='fixture-note';note.textContent='Layout';document.querySelector('#selection-fixture').append(note);}""")
   page.wait_for_timeout(250);expect(chooser).to_be_visible()
   choices=chooser.locator('button:not(.map-chooser-expand)')
   # Sort is selection first then severity/ID; repeated names are selected by row index.
   ids=page.evaluate("""()=>{const last=fixtureHits.at(-1);const rank=x=>last?.id===x.id?100:x.type==='hazard'?80:x.type==='poi'?10:10;return [{type:'hazard',id:'hazard-c'},{type:'community',id:'village-a'},{type:'community',id:'village-b'},{type:'poi',id:'site-d'}].sort((a,b)=>rank(b)-rank(a)||(a.type+':'+a.id).localeCompare(b.type+':'+b.id)).map(x=>x.id);}""")
   choices.nth(ids.index(expected['id'])).click()
   assert page.evaluate('fixtureHits.at(-1)')==expected
   expect(fixture.locator('.map-object-chooser')).to_have_count(0)
   selected=fixture.locator('.map-pin.is-selected:visible');expect(selected).to_have_count(1)
   anchor=selected.evaluate("""n=>{const r=n.getBoundingClientRect(),h=n.closest('#selection-fixture').getBoundingClientRect();return {x:r.x-h.x+r.width/2,y:r.y-h.y+r.width*28.8/28,fill:getComputedStyle(n.querySelector('.map-pin-shape svg')).fill,color:getComputedStyle(n).color};}""")
   point={'hazard-c':(258,217),'village-a':(260,210),'village-b':(263,214),'site-d':(262,218)}[expected['id']]
   assert abs(anchor['x']-point[0])<.5 and abs(anchor['y']-point[1])<.5,(expected,anchor)
   assert anchor['fill']=='rgb(217, 48, 37)',anchor
  if captures:captures.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(captures/'group-selection-fixture.png'))
  page.evaluate("fixtureRenderer.dispose();document.querySelector('#selection-fixture').remove()")
  # Actual map group menus in both views: opening must survive another frame.
  for mode in ['2d','3d']:
   page.goto(url+'/?offline=1&map='+mode+'&demoRole=manager')
   expect(page.locator('.map-pin:visible').first).to_be_visible(timeout=30000)
   for attempt in range(6):
    if page.locator('.map-pin[aria-haspopup]:visible').count():break
    page.get_by_role('button',name='Thu nhỏ',exact=True).click();page.wait_for_timeout(300)
   groups=page.locator('.map-pin[aria-haspopup]:visible')
   assert groups.count(),mode
   groups.first.click()
   chooser=page.locator('.map-object-chooser');expect(chooser).to_be_visible();page.wait_for_timeout(400);expect(chooser).to_be_visible()
   picked=chooser.locator('button:not(.map-chooser-expand)').last.inner_text()
   chooser.locator('button:not(.map-chooser-expand)').last.click()
   if captures:page.screenshot(path=str(captures/('group-result-'+mode+'.png')))
   expect(page.locator('#response-details h1')).to_have_text(picked)
   expect(page.locator('.map-pin.is-selected:visible')).to_have_count(1)
   if captures:page.screenshot(path=str(captures/('neutral-map-'+mode+'.png')))
   label=page.locator('.map-pin:not([aria-haspopup]):not(.is-label-hidden) .map-pin-label:visible').first
   expect(label).to_be_visible()
   # Visible labels change while the camera frames a selected group member.
   # Retain the feature ID rather than resolving a different first label on click.
   key=label.evaluate('node=>node.closest(".map-pin").dataset.mapObject')
   label=page.locator(f'.map-pin[data-map-object="{key}"] .map-pin-label')
   name=label.inner_text()
   label.hover()
   expect(page.locator('.map-hover-target:visible')).to_have_count(0)
   expect(label).to_be_visible()
   label.click()
   expect(page.locator('#response-details h1')).to_have_text(name)
   expect(page.locator('.map-pin.is-selected:visible')).to_have_count(1)
  # Bulk selection only acts on the records left visible by a filter.
  page.goto(url+'/?offline=1&map=2d&demoRole=manager')
  expect(page.locator('.map-pin:visible').first).to_be_visible(timeout=30000)
  page.evaluate("""async()=>{
   const React=(await import('/node_modules/.vite/deps/react.js')).default;
   const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
   const {GeometryLayers}=await import('/src/features/geodata/GeometryLayers.tsx');
   const host=document.createElement('div');host.id='layer-fixture';host.className='geodata-workspace';Object.assign(host.style,{position:'fixed',top:'120px',left:'200px',width:'380px',height:'780px',overflow:'auto',background:'#fafbf8',zIndex:5000});document.body.append(host);
   const records=Array.from({length:9},(_,i)=>({id:'record-'+i,name:i===0?'Keep A':i===1?'Hidden B':'Other '+i,visible:true,role:'reference',source:{name:'sample.kml',format:'KML',importedAt:'2026-10-14T00:00:00Z'},feature:{type:'Feature',geometry:{type:'Point',coordinates:[104,21]},properties:{}}}));
   window.layerActions=[];window.layerRoot=createRoot(host);
   function App(){const [items,setItems]=React.useState(records);return React.createElement(GeometryLayers,{records:items,selectedId:null,locale:'vi',disabled:false,onSelect:id=>layerActions.push({kind:'select',id}),onUpdate:(id,patch)=>{layerActions.push({kind:'update',id,patch});setItems(prev=>prev.map(r=>r.id===id?{...r,...patch}:r));},onBatch:(ids,action)=>{layerActions.push({kind:'batch',ids,action});setItems(prev=>prev.map(r=>ids.includes(r.id)?{...r,visible:action==='show'}:r));return true;}});}
   layerRoot.render(React.createElement(App));
  }""")
  layer=page.locator('#layer-fixture')
  layer.get_by_role('button',name='Chọn nhiều',exact=True).click()
  layer.get_by_label('Chọn Keep A',exact=True).check();layer.get_by_label('Chọn Hidden B',exact=True).check()
  layer.get_by_role('searchbox').fill('Keep')
  expect(layer.get_by_role('button',name='Ẩn (1)',exact=True)).to_be_visible()
  layer.get_by_role('button',name='Ẩn (1)',exact=True).click()
  assert page.evaluate('layerActions.at(-1)')=={'kind':'batch','ids':['record-0'],'action':'hide'}
  layer.get_by_role('button',name='Xong',exact=True).click()
  layer.get_by_label('Hiện Keep A',exact=True).check()
  assert page.evaluate('layerActions.at(-1)')=={'kind':'update','id':'record-0','patch':{'visible':True}}
  # Visibility controls do not inspect a different row.
  assert all(a['kind']!='select' for a in page.evaluate('layerActions'))
  page.evaluate("layerRoot.unmount();document.querySelector('#layer-fixture').remove()")
  assert not errors,errors;browser.close()
 print('Map group passed: every member selected by its own ID, repeated names, chooser stable after relayout, coordinate tip preserved, red selected pin, 2D/3D map-label hover and selection.')

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:5341');a.add_argument('--chrome');a.add_argument('--captures',type=Path);args=a.parse_args();run(args.url.rstrip('/'),args.chrome,args.captures)
