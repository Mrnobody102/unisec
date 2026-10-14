"""Browser acceptance: real label bounds, cross-layer obstacles and stable group popups."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


def run(url, chrome, captures=None):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=chrome)
        page = browser.new_page(viewport={"width": 1440, "height": 960})
        errors = []
        page.on("pageerror", lambda e: errors.append(e.stack))
        page.route("**/*", lambda r: r.continue_() if r.request.url.startswith(url + "/") else r.abort())
        page.goto(url + "/?map=2d&offline=1&demoRole=manager")
        expect(page.locator(".incident-priority-row").first).to_be_visible(timeout=30000)
        page.evaluate("document.fonts.ready")
        counts = {}
        for mode in ["2D", "3D"]:
            page.get_by_role("button", name="Chuyển sang " + mode, exact=True).click()
            page.get_by_role("button", name="Xem toàn khu vực", exact=True).click()
            page.wait_for_timeout(1200)
            counts[mode] = []
            for step in range(9):
                page.wait_for_timeout(350)
                result = page.locator(".map-pin-label").evaluate_all("""nodes => {
                    const rect = n => {const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
                    const labels=nodes.filter(n=>n.getBoundingClientRect().width && !n.parentElement.hidden).map(n=>({...rect(n),name:n.textContent,grouped:n.parentElement.hasAttribute('aria-haspopup'),feature:n.parentElement.classList.contains('has-overlap'),named:n.parentElement.getAttribute('aria-label')?.startsWith(n.textContent+'.')}));
                    const overlap=(a,b)=>a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
                    return {labels, collisions:labels.flatMap((a,i)=>labels.slice(i+1).filter(b=>overlap(a,b)).map(b=>[a.name,b.name]))};
                }""")
                assert not result["collisions"], (mode, step, result)
                # A retained selected/priority feature may keep its own name.
                # Anonymous groups and count clusters must never borrow a member label.
                assert all(not label["grouped"] or (label["feature"] and label["named"]) for label in result["labels"]), (mode, step, result)
                counts[mode].append(len(result["labels"]))
                if step == 0:
                    # Simulate a tooltip belonging to another overlay, over a visible label.
                    created = page.evaluate("""() => {
                        const label=[...document.querySelectorAll('.map-pin-label')].find(n=>n.getBoundingClientRect().width);
                        if(!label) return false;
                        const host=label.closest('.map-marker-layer').parentElement, r=label.getBoundingClientRect(), h=host.getBoundingClientRect();
                        const obstacle=document.createElement('div');obstacle.id='label-test-obstacle';obstacle.className='leaflet-tooltip';
                        Object.assign(obstacle.style,{position:'absolute',left:(r.x-h.x)+'px',top:(r.y-h.y)+'px',width:r.width+'px',height:r.height+'px',padding:'0',transform:'none'});obstacle.textContent='Test reference label';host.append(obstacle);return true;
                    }""")
                    if created:
                        page.wait_for_timeout(250)
                        assert page.evaluate("""() => {
                            const b=document.getElementById('label-test-obstacle').getBoundingClientRect();
                            return [...document.querySelectorAll('.map-pin-label')].every(n=>{const a=n.getBoundingClientRect();return !a.width || !(a.x<b.right && a.right>b.x && a.y<b.bottom && a.bottom>b.y)});
                        }"""), mode
                        page.evaluate("document.getElementById('label-test-obstacle').remove()")
                if step in [4,8]:
                    group=page.locator('.map-pin[aria-haspopup="true"]:visible').first
                    if group.count():
                        group.click(); expect(page.locator('.map-object-chooser')).to_be_visible()
                        page.wait_for_timeout(350); expect(page.locator('.map-object-chooser')).to_be_visible()
                        page.keyboard.press('Escape')
                    if captures:
                        captures.mkdir(parents=True,exist_ok=True)
                        page.screenshot(path=str(captures/f'labels-{mode}-{step}.png'))
                page.get_by_role("button",name="Thu nhỏ",exact=True).click()
        print("Label counts",counts,flush=True)
        assert not errors, errors
        browser.close()
        print("Map label checks passed:",counts)


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',default='http://127.0.0.1:5218');parser.add_argument('--chrome',default=None);parser.add_argument('--captures',type=Path)
    args=parser.parse_args();run(args.url.rstrip('/'),args.chrome,args.captures)
