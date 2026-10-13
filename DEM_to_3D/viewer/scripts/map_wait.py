"""Read map handle positions only after Leaflet stops animating."""

# Starting an edit zooms the map to the geometry. Leaflet hides markers while it
# zooms, so a handle can be attached but have no box. Poll on animation frames
# until no zoom is running and the handle kept the same box for two frames.
_SETTLED = """(selector) => {
  const node = document.querySelector(selector);
  if (!node || document.querySelector('.leaflet-zoom-anim')) return false;
  const r = node.getBoundingClientRect(), key = [r.x, r.y, r.width, r.height].join();
  const seen = (window.__settledBoxes ??= {});
  const still = seen[selector] === key;
  seen[selector] = key;
  return still && r.width > 0;
}"""


def settled_box(page, selector, timeout=15000):
    """Bounding box of the first element matching `selector` once the map is still."""
    page.wait_for_function(_SETTLED, arg=selector, timeout=timeout)
    return page.locator(selector).first.bounding_box()
