# Brand — Swiper

_Status: deferred_

The user chose to defer brand setup. This project is currently using shadcn's default neutral palette and no custom typography. The `frontend-design-guidelines` skill will quietly use defaults and will not prompt again.

To set up a real brand palette, typography, and voice at any time, run:

    /brand-design

or say: "pick brand colors"

When `brand-design` runs, it will detect this deferred state, skip the "confirm overwrite" step, and proceed directly to the full brand setup. The resulting palette will be applied to `app/globals.css` and this file will be replaced with the real brand documentation.

_Deferred at: 2026-10-01T05:52:00Z_

## Approved logo — 14 October 2026

The interface mark is seven black vertical bars on a clear ground. Preserve the alternating vertical offsets, equal bar widths, and spacing. The supplied file is `assets/brand/swiper-logo-black.png`. The vector at `apps/web/public/logos/swiper.svg` follows its measured geometry and is what the nav, footer, editor, and 404 render. Keep that mark large enough to read (about 56px tall).

The browser icon and Apple home-screen icon use the same black bars on the stone canvas (`#f5f5f4`) so the mark stays visible at a small size. The earlier white-on-black square remains in `assets/brand/swiper-logo-source.png` and is not the interface mark. Keep the existing interface palette and typography; their setup remains deferred.
