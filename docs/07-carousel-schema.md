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
- icon
- logo
- badge
- line
- chart
- screenshot
- video

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
- CTA

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
