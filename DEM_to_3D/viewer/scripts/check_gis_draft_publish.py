"""GIS edits stay local until one publication, and map names focus their actual point."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


def run(url: str, chrome: str, captures: Path | None = None):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=chrome)
        page = browser.new_page(viewport={"width": 1440, "height": 960})
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(url + "/") else route.abort())
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url + "/?offline=1&map=2d&demoRole=manager")
        expect(page.locator(".map-pin:visible").first).to_be_visible(timeout=30000)
        page.get_by_role("button", name="Dữ liệu GIS", exact=True).click()
        workspace = page.locator(".geodata-workspace")
        expect(workspace.locator(".gis-draft-bar")).to_have_count(0)
        row = workspace.locator(".scenario-feature-row").first
        group = row.locator("xpath=..")
        if group.get_attribute("open") is None:
            group.locator("summary").click()
        row.hover()
        expect(workspace.locator(".map-pin.is-preview:visible, .map-hover-target:visible")).to_have_count(1)
        if captures:
            captures.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(captures / "gis-hover.png"))
        row.click()
        card = workspace.locator(".scenario-card")
        expect(card).to_be_visible()
        original = card.get_by_role("heading", level=2).inner_text()
        before = page.evaluate("localStorage.getItem('dear.gis.v2')")
        card.get_by_role("button", name="Đổi tên", exact=True).click()
        card.get_by_label("Tên tiếng Việt", exact=True).fill("Sạt lở thử bản nháp")
        card.get_by_role("button", name="Lưu", exact=True).click()
        expect(card.get_by_role("heading", level=2)).to_have_text("Sạt lở thử bản nháp")
        assert page.evaluate("localStorage.getItem('dear.gis.v2')") == before
        workspace.get_by_role("button", name="Áp dụng thay đổi", exact=True).click()
        dialog = page.get_by_role("dialog", name="Áp dụng thay đổi GIS?")
        expect(dialog).to_contain_text("sạt lở")
        expect(dialog).to_contain_text("→ Sạt lở thử bản nháp")
        if captures:
            page.screenshot(path=str(captures / "gis-review.png"))
        assert page.evaluate("localStorage.getItem('dear.gis.v2')") == before
        dialog.get_by_role("button", name="Áp dụng", exact=True).click()
        saved = json.loads(page.evaluate("localStorage.getItem('dear.gis.v2')"))
        assert saved["schema"] == "dear-gis/v2"
        assert any(edit["change"]["kind"] == "properties" and edit["change"]["to"]["names"][0] == "Sạt lở thử bản nháp" for edits in saved["scenarios"].values() for edit in edits)
        expect(workspace.locator(".gis-draft-bar")).to_have_count(0)
        if captures:
            captures.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(captures / "gis-published.png"))
        card.get_by_role("button", name="Đổi tên", exact=True).click()
        card.get_by_label("Tên tiếng Việt", exact=True).fill("Bỏ thay đổi thử")
        card.get_by_role("button", name="Lưu", exact=True).click()
        workspace.get_by_role("button", name="Bỏ bản nháp", exact=True).click()
        page.get_by_role("dialog", name="Bỏ bản nháp GIS?").get_by_role("button", name="Bỏ bản nháp", exact=True).click()
        assert json.loads(page.evaluate("localStorage.getItem('dear.gis.v2')")) == saved
        expect(card.get_by_role("heading", level=2)).to_have_text("Sạt lở thử bản nháp")
        workspace.get_by_role("button", name="Thêm điểm tọa độ", exact=True).click()
        point = page.get_by_role("dialog", name="Thêm điểm tọa độ", exact=True)
        point.get_by_label("Tên điểm", exact=True).fill("Điểm GIS kiểm thử")
        point.get_by_label("Vĩ độ (°)", exact=True).fill("21.67000")
        point.get_by_label("Kinh độ (°)", exact=True).fill("104.00200")
        point.get_by_role("button", name="Đánh dấu điểm", exact=True).click()
        assert json.loads(page.evaluate("localStorage.getItem('dear.gis.v2')")) == saved
        workspace.get_by_role("button", name="Áp dụng thay đổi", exact=True).click()
        page.get_by_role("dialog", name="Áp dụng thay đổi GIS?").get_by_role("button", name="Áp dụng", exact=True).click()
        published = json.loads(page.evaluate("localStorage.getItem('dear.gis.v2')"))
        assert len(published["records"]) == len(saved["records"]) + 1
        assert published["records"][-1]["name"] == "Điểm GIS kiểm thử"
        expect(page.locator(".notice-toast:visible")).to_have_count(1)
        workspace.get_by_role('button', name='Hoàn tác GIS', exact=True).click()
        expect(workspace.locator('.gis-draft-bar')).to_be_visible()
        assert json.loads(page.evaluate("localStorage.getItem('dear.gis.v2')")) == published
        workspace.get_by_role('button', name='Làm lại GIS', exact=True).click()
        expect(workspace.locator('.gis-draft-bar')).to_have_count(0)
        assert not errors, errors
        print(f"GIS draft, publish, discard, point import and map hover passed; original: {original}")
        browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5342")
    parser.add_argument("--chrome", default=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    parser.add_argument("--captures", type=Path)
    args = parser.parse_args()
    run(args.url, args.chrome, args.captures)
