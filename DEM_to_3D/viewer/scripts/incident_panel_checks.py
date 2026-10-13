"""Check incident section boundaries and text alignment without relying on copy length."""


def check_incident_layout(page):
    problems = page.locator('.sidebar').evaluate("""panel => {
        const errors = [], rect = node => node.getBoundingClientRect();
        const head = panel.querySelector('.incident-head');
        const body = panel.querySelector('.incident-body');
        const sections = [...body.querySelectorAll('.incident-section')];
        const left = rect(head.querySelector('h1')).left;
        const near = (a, b) => Math.abs(a - b) <= 1;
        if (panel.scrollWidth > panel.clientWidth + 1 || body.scrollWidth > body.clientWidth + 1)
            errors.push('incident panel overflow');
        const contextGap = rect(sections[0]).top - rect(head).bottom;
        if (contextGap < -1 || contextGap > 24)
            errors.push('event context and first section overlap or have excessive spacing');
        const aligned = panel.querySelectorAll('.incident-area-link, .incident-timing dt:first-child, .incident-section-heading h3, .incident-priority-row strong, .road-count-row > :first-child');
        aligned.forEach(node => {
            // The second timestamp occupies the second column.
            if (node.matches('dt') && node.parentElement.previousElementSibling) return;
            if (!near(rect(node).left, left)) errors.push('inconsistent content inset: ' + node.textContent);
        });
        const headings = sections.map(section => rect(section.querySelector('.incident-section-heading')));
        if (!near(headings[0].height, headings[1].height)) errors.push('unequal section heading heights');
        const sectionGap = rect(sections[1]).top - rect(sections[0]).bottom;
        if (sectionGap < -1 || sectionGap > 24)
            errors.push('incident sections overlap or have excessive spacing');
        sections.forEach(section => {
            const heading = section.querySelector('.incident-section-heading');
            const title = rect(heading.querySelector('h3'));
            const action = heading.querySelector('button');
            if (action) {
                const button = rect(action);
                if (!near(title.top + title.height / 2, button.top + button.height / 2))
                    errors.push('section action is vertically offset');
                if (button.left - title.right < 11) errors.push('section title touches action');
            }
            const rows = [...section.querySelectorAll('.incident-priority-row, .road-count-row')];
            if (rows.length && !near(rect(heading).bottom, rect(rows[0]).top))
                errors.push('list does not follow its heading');
            rows.forEach((row, index) => {
                if (index && !near(rect(rows[index-1]).bottom, rect(row).top))
                    errors.push('blank space between list rows');
                if (parseFloat(getComputedStyle(row).paddingLeft) < 12 ||
                    parseFloat(getComputedStyle(row).paddingTop) < 12)
                    errors.push('insufficient row inset');
            });
        });
        const buttons = [...panel.querySelectorAll('.incident-detail-actions button')].map(rect);
        const stacked = near(buttons[0].left, buttons[1].left);
        if (!near(buttons[0].height, buttons[1].height) ||
            (stacked ? buttons[1].top < buttons[0].bottom : !near(buttons[0].top, buttons[1].top)))
            errors.push('reference actions are not aligned');
        if (!stacked && buttons[1].left < buttons[0].right)
            errors.push('reference action hover areas overlap');
        panel.querySelectorAll('.incident-detail-actions button').forEach(button => {
            if (parseFloat(getComputedStyle(button).paddingLeft) < 8)
                errors.push('reference action text has no inset');
        });
        return errors;
    }""")
    assert not problems, problems
