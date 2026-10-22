"""Declare a browser fixture language without relying on the product default."""

def use_vietnamese(page_or_context):
    # Preserve subsequent language changes/reloads inside the regression flow.
    page_or_context.add_init_script("""try {
        if (!localStorage.getItem('dear.locale')) localStorage.setItem('dear.locale', 'vi');
    } catch {}""")
    return page_or_context
