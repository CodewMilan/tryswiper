# Canonical Carousel Schema

The carousel JSON is the contract shared by the AI, editor and renderer.

```json
{
  "schemaVersion": "1.0",
  "metadata": {
    "title": "string",
    "formatId": "string",
    "aspectRatio": "4:5",
    "platforms": ["instagram", "linkedin"]
  },
  "theme": {
    "background": "#FFFFFF",
    "primary": "#111111",
    "secondary": "#666666",
    "accent": "#FF5A36",
    "fontFamily": "Inter"
  },
  "slides": [
    {
      "id": "slide_1",
      "layout": "hero",
      "background": {
        "type": "solid",
        "value": "#FFFFFF"
      },
      "elements": [
        {
          "id": "headline",
          "type": "text",
          "role": "headline",
          "text": "Your headline",
          "x": 80,
          "y": 100,
          "width": 920,
          "height": 300,
          "style": {
            "fontSize": 72,
            "fontWeight": 800,
            "align": "left"
          }
        }
      ]
    }
  ]
}
```

## Element types

- text
- image
- shape
- logo
- line

Backgrounds are solid opaque hex colors. Theme colors use three or six hex digits; element colors also accept four/eight digits for alpha. Unsupported gradient/image backgrounds and chart/video/icon/badge/screenshot elements are rejected. Upload screenshots as ordinary image assets.

Images/logos require an owned uploaded `assetId`. Their optional `src` must equal `/api/v1/assets/{assetId}`. Images crop to fill; logos fit inside their box. A missing or unreadable asset fails validation and export explicitly.

## Layout types

Start small:
- hero
- centered
- split
- image-left
- image-right
- quote
- list
- comparison
- cta

`split` separates headline and body into columns. `image-left`/`image-right` reserve the named side for an uploaded image; add the image yourself. `list` gives the body a tall indented column; `comparison` puts body and proof side by side. `set_layout` moves the first text slot of each semantic role and first image while preserving text, element IDs, assets, colors and font sizes. Other custom elements keep their positions. Review wrapping after changing layout.

## Coordinate system

Use a fixed logical canvas, for example 1080 × 1350. Scale at render time.

## Invariants

Every slide must:
- fit within the canvas
- have a valid layout
- use valid element types
- have stable IDs
- reference existing assets
- satisfy safe-area constraints

The schema must be versioned. Migration functions are required when schema versions change.
