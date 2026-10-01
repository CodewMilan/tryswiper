# Swiper MCP Specification

## Goal

Make Swiper usable from ChatGPT, Claude, Cursor and other MCP-compatible clients.

The MCP layer should expose capabilities rather than internal database operations.

## Core tools

### `swiper.create_carousel`

Input:
```json
{
  "title": "string",
  "brief": "string",
  "format_id": "string?",
  "slide_count": "number?",
  "brand_id": "string?"
}
```

Output:
```json
{
  "carousel_id": "string",
  "editor_url": "string",
  "status": "draft"
}
```

### `swiper.get_carousel`

Returns the canonical carousel schema and metadata.

### `swiper.update_carousel`

Applies structured operations instead of asking the model to resend the whole document.

Operations:
- replace_slide_content
- insert_slide
- delete_slide
- reorder_slide
- set_background
- set_asset
- set_layout
- update_cta
- update_brand

### `swiper.generate_slide`

Creates or regenerates a single slide while preserving surrounding narrative.

### `swiper.generate_carousel`

Creates a complete carousel from a brief.

### `swiper.list_formats`

Returns available formats with descriptions and constraints.

### `swiper.get_brand`

Returns only authorized brand context.

### `swiper.validate_carousel`

Runs structural and content quality checks.

### `swiper.render_preview`

Returns an editor/preview URL or rendered asset references.

### `swiper.export_carousel`

Creates downloadable output.

### `swiper.list_projects`

Lists projects accessible to the authenticated agent.

## Tool safety

MCP authentication must map the client to a workspace/user.

Never expose:
- raw database credentials
- social OAuth refresh tokens
- billing secrets
- unrelated workspace data

## Agent behavior

The server should return concise structured errors.

Example:
```json
{
  "code": "INVALID_SLIDE",
  "message": "Slide 4 exceeds the configured text density limit.",
  "details": {
    "slide_index": 4,
    "suggested_action": "shorten_text"
  }
}
```

## Resources

Expose read-only resources where useful:
- current brand kit
- available templates
- project context
- content guidelines
