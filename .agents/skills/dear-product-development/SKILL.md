---
name: dear-product-development
description: Apply the shared VSP EO product UI, GIS/EO correctness and engineering conventions when changing the UNISEC DEAR web demo. Use for this app and its shared-platform integration.
---

# DEAR product development

The canonical audited skill bundle is versioned in the sibling repository at `../../../../vsp-eo-platform/.agents/skills/README.md` relative to this skill folder. Read only the relevant entrypoint there:

- `vsp-product-ui/SKILL.md` for layout, controls, typography and copy.
- `vsp-gis-eo/SKILL.md` for imported points, layers, linked affected areas and DEM/imagery interpretation.
- `vsp-engineering/SKILL.md` for component/state ownership, tests, local persistence and future service boundaries.

The bundle includes pinned official Vercel React/composition/web-review skills and primary GIS/accessibility sources. Do not copy all rule files into the app or force a backend/framework migration merely to follow a reference.

Keep DEAR's resident and coordinator workflows distinct. Photo/GPS submission stays simple; source metadata supports review rather than filling every panel. Imported reference points are not automatically confirmed hazards. Browser-local storage is not a shared review queue, and the demo identity selector is not production authentication.

Use existing product documents for lasting decisions and `docs/quality/workspace-review.md` for verification scope. Do not create dated review documents or screenshot folders for routine changes. Keep temporary browser captures in the system temporary directory and execution history in Git/CI. Landslide extents may be independent mapped polygons: distinguish potential source/runout areas, observed scars/deposits, evidence and review; a source point is an optional evidence link, not a prerequisite for an area.

If the sibling checkout is absent, say so and use the existing app conventions plus official [QGIS layer guidance](https://docs.qgis.org/3.44/en/docs/user_manual/working_with_vector/vector_properties.html), [Earth Engine scale](https://developers.google.com/earth-engine/guides/scale), [React state guidance](https://react.dev/learn/choosing-the-state-structure) and [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) for the affected task. Missing optional references should not stop otherwise authorized work.
