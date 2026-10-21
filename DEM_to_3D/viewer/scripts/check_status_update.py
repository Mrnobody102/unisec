"""Road status: optional notes, saved changes/undo, and consistent detail spacing."""
import argparse
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


def run(url, captures, chrome=None):
    captures.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=chrome)
        context = browser.new_context(viewport={'width':1440,'height':960}, reduced_motion='reduce')
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(url + '/') else route.abort())
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url + '/?map=2d&offline=1&demoRole=manager')
        detail = page.locator('#response-details')

        def open_road():
            page.locator('.incident-landslide-row').first.click()
            detail.locator('.hazard-impact .object-row').first.click()
            expect(detail.get_by_role('button', name='Cập nhật tình trạng', exact=True)).to_be_visible()

        def entries():
            return page.evaluate("Object.values(JSON.parse(localStorage.getItem('dear.gis.v2')).scenarios).flat()")

        def choose_new_status():
            detail.get_by_role('button', name='Cập nhật tình trạng', exact=True).click()
            radios = detail.locator('.road-status-switch input[type=radio]')
            for radio in radios.all():
                if not radio.is_checked():
                    radio.check()
                    return radio.get_attribute('value')
            raise AssertionError('No alternative road status')

        open_road()
        original = detail.locator('.detail-priority .status-text').inner_text()
        target = choose_new_status()
        expect(detail.get_by_label('Ghi chú', exact=True)).to_be_hidden()
        detail.get_by_role('button', name='Lưu', exact=True).click()
        expect(detail.locator('.road-status-editor')).to_have_count(0)
        history = detail.locator('.manual-edit-note')
        expect(history).to_be_visible()
        expect(history.locator('.manual-edit-comment')).to_have_count(0)
        assert entries()[-1]['note'] == ''
        assert entries()[-1]['change']['to'] == target
        updated = detail.locator('.detail-priority .status-text').inner_text()
        assert updated != original
        title = detail.locator('h1').inner_text()
        for width in (1440, 390, 320):
            page.set_viewport_size({'width':width,'height':960})
            if width < 900:
                page.locator('.mobile-view-switch').get_by_role('button',name='Thông tin',exact=True).click()
            expect(detail).to_be_visible()
            measurements = detail.locator('.sidebar-scroll').evaluate('''e => {
                const cards=[...e.children].map(n=>n.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
                return {overflow:e.scrollWidth-e.clientWidth, gaps:cards.slice(1).map((r,i)=>r.top-cards[i].bottom)};
            }''')
            assert measurements['overflow'] <= 1, (width, measurements)
            assert all(11 <= gap <= 13 for gap in measurements['gaps']), (width, measurements)
            detail.screenshot(path=str(captures/f'status-saved-{width}.png'))
            detail.get_by_role('button', name='Cập nhật tình trạng', exact=True).click()
            expect(detail.locator('.road-status-editor')).to_be_visible()
            assert detail.locator('.road-status-editor').evaluate('e=>e.scrollWidth <= e.clientWidth + 1')
            detail.screenshot(path=str(captures/f'status-editor-{width}.png'))
            detail.get_by_role('button', name='Hủy', exact=True).click()
            print('DETAIL_SPACING_OK', width, flush=True)
        page.set_viewport_size({'width':1440,'height':960})
        page.reload()
        open_road()
        expect(detail.locator('h1')).to_have_text(title)
        expect(detail.locator('.detail-priority .status-text')).to_have_text(updated)
        detail.get_by_role('button', name='Hoàn tác', exact=True).click()
        expect(detail.locator('.detail-priority .status-text')).to_have_text(original)
        assert entries()[-1].get('reverts')
        choose_new_status()
        detail.locator('.status-optional-note summary').click()
        note = 'Không có ảnh mới; cập nhật từ thực địa.'
        detail.get_by_label('Ghi chú', exact=True).fill(note)
        detail.get_by_role('button', name='Lưu', exact=True).click()
        assert entries()[-1]['note'] == note
        expect(detail.locator('.manual-edit-comment p')).to_be_hidden()
        detail.locator('.manual-edit-comment summary').click()
        expect(detail.locator('.manual-edit-comment p')).to_have_text(note)
        detail.get_by_role('button', name='Sửa trong GIS', exact=True).click()
        workspace = page.locator('.geodata-workspace')
        card = workspace.locator('.scenario-card')
        expect(card).to_be_visible()
        card.get_by_role('button', name='Cập nhật tình trạng', exact=True).click()
        dialog = page.get_by_role('dialog', name='Cập nhật tình trạng đường', exact=True)
        for radio in dialog.get_by_role('radio').all():
            if not radio.is_checked():
                radio.check()
                break
        expect(dialog.get_by_label('Ghi chú', exact=True)).to_be_hidden()
        dialog.get_by_role('button', name='Lưu tình trạng', exact=True).click()
        expect(dialog).to_have_count(0)
        expect(workspace.locator('.gis-draft-bar')).to_be_visible()
        assert not errors, errors
        browser.close()
        print('OPTIONAL_NOTES_PERSIST_UNDO_AND_GIS_PASSED', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:5174')
    parser.add_argument('--captures', type=Path, required=True)
    parser.add_argument('--chrome')
    args = parser.parse_args()
    run(args.url.rstrip('/'), args.captures,args.chrome)
