"""Check the current overview's readable bounds and separate work/reference groups."""


def check_incident_layout(page):
    problems = page.locator('#response-panel').evaluate("""panel => {
        const errors = [], rect = node => node.getBoundingClientRect();
        const body = panel.querySelector('.incident-overview');
        const heading = panel.querySelector('h1');
        if (!body || !heading) return ['Missing incident overview'];
        if (panel.scrollWidth > panel.clientWidth + 1 || body.scrollWidth > body.clientWidth + 1)
            errors.push('incident panel overflow');
        const left = rect(heading).left;
        body.querySelectorAll('section > h2, .incident-overview-item > strong').forEach(node => {
            if (rect(node).width && Math.abs(rect(node).left - left) > 1) errors.push('inconsistent content inset: ' + node.textContent);
        });
        body.querySelectorAll('.incident-overview-item').forEach(row => {
            if (!rect(row).width) return;
            const style = getComputedStyle(row);
            if (rect(row).height < 40 || parseFloat(style.paddingLeft) < 12 || parseFloat(style.paddingTop) < 12)
                errors.push('insufficient list row hit area');
        });
        const work = body.querySelector('.incident-overview-work');
        const reference = body.querySelector('.incident-reference');
        if (!work || !reference || rect(reference).top - rect(work).bottom < 12)
            errors.push('work and reference groups touch');
        if (reference && parseFloat(getComputedStyle(reference).borderTopWidth) < 1)
            errors.push('reference group lacks a boundary');
        return errors;
    }""")
    assert not problems, problems
