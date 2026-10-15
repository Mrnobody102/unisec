"""Shared GIS steps for browser checks."""
from playwright.sync_api import expect


def apply_boundary(page):
    # Saving on the drawing bar applies the boundary; a finished rectangle is already saved.
    toolbar=page.locator('.geodata-drawing-bar')
    if not toolbar.is_visible(): return
    apply=toolbar.get_by_role('button',name='Áp dụng',exact=True)
    (apply if apply.count() else toolbar.get_by_role('button',name='Kết thúc',exact=True)).click()


def download_geometry(page, format):
    page.locator('.geodata-export').get_by_role('button',name=format,exact=True).click()
    dialog=page.get_by_role('dialog',name='Xuất dữ liệu GIS',exact=True)
    expect(dialog).to_be_visible()
    dialog.get_by_role('button',name='Tải tệp',exact=True).click()



def publish_draft(page):
    """Review and publish the whole GIS draft; per-feature Save remains unpublished."""
    bar = page.locator('.geodata-workspace .gis-draft-bar')
    if not bar.is_visible():
        return
    bar.get_by_role('button', name='Áp dụng thay đổi', exact=True).click()
    dialog = page.get_by_role('dialog', name='Áp dụng thay đổi GIS?', exact=True)
    expect(dialog).to_be_visible()
    dialog.get_by_role('button', name='Áp dụng', exact=True).click()
    if dialog.get_by_role('alert').count():
        raise AssertionError(dialog.get_by_role('alert').inner_text())
    expect(dialog).to_have_count(0)
    expect(bar).to_have_count(0)


def published_records(page):
    return page.evaluate("JSON.parse(localStorage.getItem('dear.gis.v2') || '{}').records || JSON.parse(localStorage.getItem('dear.geodata.v1') || '[]')")


def published_edits(page):
    return page.evaluate("Object.values(JSON.parse(localStorage.getItem('dear.gis.v2') || '{}').scenarios || {}).flat()")


def reviewed_records(page):
    """Existing geometry checks use an explicit publication checkpoint at each saved-state
    assertion. Pending modal/vertex edits remain uncommitted, so read the actual baseline.
    Dedicated draft checks verify no-write-until-review and publication failures separately.
    """
    if not page.locator('dialog[open]:visible, .geodata-drawing-bar:visible').count():
        publish_draft(page)
    return published_records(page)


def reviewed_records_json(page):
    import json
    return json.dumps(reviewed_records(page), ensure_ascii=False)
