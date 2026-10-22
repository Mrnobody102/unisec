"""A storage event must not let Undo delete another tab's newly published report."""
from browser_preferences import use_vietnamese
import argparse
from playwright.sync_api import sync_playwright, expect


def run(url, chrome):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=chrome)
        context = use_vietnamese(browser.new_context())
        page = use_vietnamese(context.new_page())
        page.goto(url + '/?offline=1&workspace=geodata')
        expect(page.locator('.geodata-workspace')).to_be_visible()
        # Mount the real persistence hook independently of the GIS draft wrapper.
        page.evaluate("""async () => {
            const {default: React} = await import('/node_modules/.vite/deps/react.js');
            const {default: {createRoot}} = await import('/node_modules/.vite/deps/react-dom_client.js');
            const {useGeometrySession} = await import('/src/features/geodata/useGeometrySession.ts');
            const host = document.createElement('div'); host.id = 'storage-fixture'; Object.assign(host.style, {position:'fixed',top:'100px',left:'400px',zIndex:10000}); document.body.append(host);
            function Fixture() {
                const s = useGeometrySession();
                return React.createElement('div', null,
                    React.createElement('button', {onClick: () => s.importText('Local: POINT(104 21)', 'reference')}, 'Import fixture'),
                    React.createElement('button', {onClick: s.undo, disabled: !s.canUndo}, 'Undo fixture'),
                    React.createElement('output', null, s.records.map(r => r.name).join(',')));
            }
            window.fixtureRoot = createRoot(host); fixtureRoot.render(React.createElement(Fixture));
        }""")
        fixture = page.locator('#storage-fixture')
        fixture.get_by_role('button', name='Import fixture').click()
        expect(fixture.get_by_role('button', name='Undo fixture')).to_be_enabled()
        second = use_vietnamese(context.new_page()); second.goto(url + '/?offline=1&workspace=geodata')
        expect(second.locator('.geodata-workspace')).to_be_visible()
        # An unrelated scenario edit must not destroy a valid geometry Undo history.
        second.evaluate("""() => {
            const data = JSON.parse(localStorage.getItem('dear.gis.v2'));
            data.scenarios.other = []; localStorage.setItem('dear.gis.v2', JSON.stringify(data));
        }""")
        page.wait_for_timeout(100)
        expect(fixture.get_by_role('button', name='Undo fixture')).to_be_enabled()
        second.evaluate("""() => {
            const data = JSON.parse(localStorage.getItem('dear.gis.v2'));
            data.records.push({...data.records[0], id:'external-report', name:'External report'});
            localStorage.setItem('dear.gis.v2', JSON.stringify(data));
        }""")
        expect(fixture.locator('output')).to_contain_text('External report')
        expect(fixture.get_by_role('button', name='Undo fixture')).to_be_disabled()
        page.evaluate('fixtureRoot.unmount()')
        # The published scenario snapshot also reaches resident/manager hooks without reload.
        page.evaluate("""async () => {
            const {default: React} = await import('/node_modules/.vite/deps/react.js');
            const {default: {createRoot}} = await import('/node_modules/.vite/deps/react-dom_client.js');
            const {useScenarioRevision} = await import('/src/features/access/useScenarioRevision.ts');
            const host = document.createElement('div'); host.id = 'revision-fixture'; Object.assign(host.style, {position:'fixed',top:'100px',left:'400px',zIndex:10000,background:'white'}); document.body.append(host);
            function Fixture() {
                const s = useScenarioRevision('sync-fixture');
                return React.createElement('div', null,
                    React.createElement('button', {onClick: () => s.change(true)}, 'Apply revision fixture'),
                    React.createElement('output', null, JSON.stringify(s.revision)));
            }
            window.revisionRoot = createRoot(host);
            revisionRoot.render(React.createElement(React.Fragment, null, React.createElement(Fixture), React.createElement(Fixture)));
        }""")
        revision = page.locator('#revision-fixture')
        revision.get_by_role('button', name='Apply revision fixture').first.click()
        for output in revision.locator('output').all(): expect(output).to_contain_text('"applied":true')
        second.evaluate("localStorage.setItem('dear.scenario-revision.v1:sync-fixture', JSON.stringify({applied:false,at:null}))")
        for output in revision.locator('output').all(): expect(output).to_contain_text('"applied":false')
        second.evaluate("localStorage.setItem('dear.scenario-revision.v1:sync-fixture', JSON.stringify({applied:true,at:'2026-09-29T03:00:00Z'}))")
        for output in revision.locator('output').all(): expect(output).to_contain_text('2026-09-29T03:00:00Z')
        second.evaluate("localStorage.removeItem('dear.scenario-revision.v1:sync-fixture')")
        for output in revision.locator('output').all(): expect(output).to_contain_text('"applied":false')
        page.evaluate('revisionRoot.unmount()')
        browser.close()
    print('GIS storage sync passed: external records reset stale Undo; scenario-only events retain it.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:5353')
    parser.add_argument('--chrome')
    args = parser.parse_args(); run(args.url.rstrip('/'), args.chrome)
