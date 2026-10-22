"""Selected markers must remain opaque, focused and still while the pointer moves."""
from browser_preferences import use_vietnamese
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


def run(url, chrome, captures=None):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=chrome)
        page = use_vietnamese(browser.new_page(viewport={'width': 1440, 'height': 960}))
        page.route('**/*', lambda r: r.continue_() if r.request.url.startswith(url + '/') else r.abort())
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        for mode in ['2d', '3d']:
            page.goto(url + '/?offline=1&map=' + mode + '&demoRole=manager')
            expect(page.locator('.map-pin:visible').first).to_be_visible(timeout=30000)
            page.wait_for_timeout(1200)
            # Use a single feature so selection, rather than the group chooser, is exercised.
            # Pick one clear of the detail dock: 3D keeps the camera on selection, so a pin
            # near the right edge would be under the dock (controls always win).
            singles = page.locator('.map-pin:not([aria-haspopup]):visible')
            marker = next(singles.nth(i) for i in range(singles.count()) if singles.nth(i).bounding_box()['x'] < 980)
            marker.click()
            selected = page.locator('.map-pin.is-selected:visible').first
            expect(selected).to_be_visible()
            page.wait_for_timeout(800)
            selected.focus()
            before = selected.bounding_box()
            page.evaluate('''() => {
                const selected = document.querySelector('.map-pin.is-selected');
                const layer = selected.closest('.map-marker-layer');
                window.markerAudit = {hidden: 0, restarts: 0, opacity: [], disconnected: false};
                window.markerObserver = new MutationObserver(changes => {
                    markerAudit.hidden += changes.filter(c => c.target === selected && c.attributeName === 'hidden').length;
                });
                markerObserver.observe(layer, {subtree: true, attributes: true, attributeFilter: ['hidden']});
                layer.addEventListener('animationstart', () => markerAudit.restarts++);
                let frames = 0;
                function sample() {
                    markerAudit.disconnected ||= !selected.isConnected;
                    markerAudit.opacity.push(Number(getComputedStyle(selected).opacity));
                    if (++frames < 80) requestAnimationFrame(sample);
                }
                sample();
            }''')
            for step in range(32):
                page.mouse.move(400 + step * 12, 420 + (step % 3) * 4)
                page.wait_for_timeout(30)
            # Real UI mutations also cause a relayout; focus must survive it.
            page.evaluate('''() => {
                const host=document.querySelector('.map-marker-layer').parentElement;
                const note=document.createElement('div');note.className='leaflet-tooltip';note.id='marker-audit-note';
                Object.assign(note.style,{position:'absolute',top:'100px',left:'20px',width:'90px',height:'20px'});
                note.textContent='Overlay';host.append(note);
            }''')
            page.wait_for_timeout(200)
            page.evaluate("document.getElementById('marker-audit-note').remove()")
            page.wait_for_timeout(500)
            audit = page.evaluate('markerObserver.disconnect(); markerAudit')
            assert audit['hidden'] == 0 and audit['restarts'] == 0, (mode, audit)
            assert not audit['disconnected'] and min(audit['opacity']) >= .99, (mode, audit)
            expect(selected).to_be_focused()
            # Detail docks must be obstacles too: no partially covered symbol or label.
            collisions = page.evaluate("""() => {
                const panel=document.querySelector('#response-details:not([hidden])');
                if(!panel) return [];
                const b=panel.getBoundingClientRect();
                return [...document.querySelectorAll('.map-pin:not([hidden]),.map-pin:not([hidden]) .map-pin-label')].filter(n=>{
                    const a=n.getBoundingClientRect();
                    return a.width && a.height && a.x<b.right && a.right>b.x && a.y<b.bottom && a.bottom>b.y;
                }).map(n=>n.getAttribute('aria-label')||n.textContent);
            }""")
            assert not collisions, (mode, collisions)
            after = selected.bounding_box()
            assert max(abs(before[k] - after[k]) for k in ['x', 'y', 'width', 'height']) < .5, (mode, before, after)
            if captures:
                captures.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(captures / ('marker-stable-' + mode + '.png')))
            # Inspect another point with the detail panel already open.
            candidate = page.locator('.map-pin:not(.is-selected):not([aria-haspopup]):visible').first
            if candidate.count():
                candidate.click()
                expect(page.locator('.map-pin.is-selected:visible')).to_have_count(1)
            print(mode + ': opaque selected marker, no visibility cycling, animation restart or focus loss')
        assert not errors, errors
        browser.close()


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',default='http://127.0.0.1:5321')
    parser.add_argument('--chrome',default=None)
    parser.add_argument('--captures',type=Path)
    args=parser.parse_args();run(args.url.rstrip('/'),args.chrome,args.captures)