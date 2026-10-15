# Template and Format System

A template is not merely a visual design. A format defines a repeatable content structure.

## Format definition

```json
{
  "id": "problem-insight-product",
  "name": "Problem → Insight → Product",
  "description": "Start with a painful problem, explain the insight, then introduce the product.",
  "slideCount": {
    "min": 6,
    "max": 9
  },
  "slides": [
    {"role": "hook"},
    {"role": "problem"},
    {"role": "insight"},
    {"role": "proof"},
    {"role": "product"},
    {"role": "cta"}
  ]
}
```

## Initial formats

1. Problem → Insight → Product
2. 5 things nobody tells you
3. Before → After
4. Myth → Reality
5. Step-by-step
6. Product teardown
7. Founder story
8. Comparison
9. Mistakes
10. Curiosity list

## Template rules

Templates define:
- narrative roles
- allowed slide counts
- layout options
- visual constraints
- copy guidance

Templates should not force identical output. The content must adapt to the user's product.

## Template library

Separate:
- official Swiper formats
- workspace templates
- user-created templates
- imported references

## Workspace formats

Any editable carousel can be saved as a workspace format from the editor. The saved format keeps
the carousel's slide order, roles, layouts, element positions, copy, assets, and visual theme.
Starting from it creates a new draft with fresh slide and element IDs, so later edits never mutate
the saved source or other carousels created from it.

Workspace formats are private to the authenticated workspace. They appear alongside the official
library in the browser's **Formats** and **New carousel** flows and can be reused without an agent connection.

## Originality

When a user references another post, extract high-level format characteristics rather than copying text, images, or distinctive creative expression.

## Generating with saved designs

Both browser and MCP generation can use eligible workspace formats. Each generated draft keeps the saved theme, geometry, roles, layouts and owned assets, with fresh IDs. Headline/kicker/body/proof/CTA slots receive new copy; fixed labels and captions stay saved. Omitted copy cannot retain an old claim. The exact saved slide count is enforced. A format needs at least one writable copy slot and no duplicate writable role on the same slide; other formats are manual-only and advertise `can_generate: false`. Review generated copy and wrapping before sharing.

A workspace can retain up to 100 formats. Deleting a format does not delete drafts copied from it. Images referenced by current drafts, formats, brand logos or retained history cannot be deleted as unused.

## Browser format management

`/formats` is protected by workspace sign-in. It offers first-slide previews, source filters, name/description search, manual reuse and brief-based generation for eligible formats. Saved designs can be renamed, described and deleted through a confirmation dialog. Official formats have reuse actions only. Empty, loading, API-error and duplicate-name states provide recovery. Deletion frees a saved-format slot and leaves source/copied carousels editable.

Reuse links use `/new?mode=manual&format={id}` or `/new?mode=generate&format={id}`. Explicit links take precedence over restored brief settings. The picker updates browser history without discarding the brief; missing/deleted/incompatible formats show a notice and an available alternative.
