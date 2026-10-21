"""Map symbols stay singular across hover, selection and 2D/3D views."""
import argparse
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


def run(url: str, captures: Path | None, chrome: str | None):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=chrome)
        page = browser.new_page(viewport={"width": 1440, "height": 960})
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(url + "/") else route.abort())
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        for mode in ("2d", "3d"):
            page.goto(f"{url}/?offline=1&map={mode}&demoRole=manager")
            page.get_by_role('button', name='Lớp bản đồ', exact=True).click()
            page.locator('.layer-context > summary').click()
            landing_layer=page.get_by_label('Bãi đáp đề xuất', exact=True)
            if landing_layer.count(): landing_layer.check()
            page.get_by_role('button', name='Đóng lớp bản đồ', exact=True).click()
            candidates = page.locator(".map-pin:not(.is-selected):not([aria-haspopup]):visible")
            expect(candidates.first).to_be_visible(timeout=30000)
            for pin in page.locator(".map-pin:not(.is-selected):visible").all():
                assert pin.locator(".map-pin-shape svg").count() == 1
                assert pin.locator(".map-pin-shape svg path").count() == 1
                assert pin.get_attribute("title") is None
            # Exercise each symbol type present in the selected dataset.
            kinds=page.locator('.map-pin:visible').evaluate_all("nodes=>[...new Set(nodes.map(node=>node.dataset.mapObject?.split(':')[0]).filter(Boolean))]")
            for kind in kinds:
                pin=page.locator(f'.map-pin[data-map-object^="{kind}:"]:visible').first
                pin.hover()
                expect(pin.locator('.map-pin-label:visible')).to_have_count(1)
                expect(page.locator('.map-hover-target:visible')).to_have_count(0)
            marker = candidates.first
            name = marker.get_attribute("aria-label")
            assert name and marker.get_attribute("title") is None
            assert marker.locator(".map-pin-shape svg").count() == 1
            assert marker.locator(".map-pin-icon svg path").count() == 1
            assert 'Roboto' in marker.locator('.map-pin-label').evaluate('(el)=>getComputedStyle(el).fontFamily')
            marker.hover()
            expect(page.locator(".map-hover-target:visible")).to_have_count(0)
            expect(marker.locator(".map-pin-label")).to_be_visible()
            assert marker.locator(".map-pin-label").inner_text() == name
            assert page.locator(".map-pin.is-preview").count() == 0
            if captures:
                captures.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(captures / f"symbols-hover-{mode}.png"))
            marker.click()
            selected = page.locator(".map-pin.is-selected:visible")
            expect(selected).to_have_count(1)
            assert selected.first.locator(".map-pin-shape svg").count() == 1
            expect(selected.first.locator(".map-pin-icon")).to_be_visible()
            if captures:
                page.screenshot(path=str(captures / f"symbols-selected-{mode}.png"))
            if mode == '2d':
                selected_id = selected.first.get_attribute('data-map-object')
                page.get_by_role('button', name='Chuyển sang 3D', exact=True).click()
                expect(page.locator('canvas.terrain-canvas')).to_be_visible(timeout=30000)
                expect(page.locator(f'[data-map-object="{selected_id}"]:visible')).to_have_count(1, timeout=15000)
                if captures:
                    page.screenshot(path=str(captures / 'symbols-selected-after-switch.png'))
        assert not errors, errors
        browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5342")
    parser.add_argument("--captures", type=Path)
    parser.add_argument("--chrome")
    args = parser.parse_args()
    run(args.url.rstrip("/"), args.captures, args.chrome)
