# Swiper MCP specification

Updated 14 October 2026. The remote `/mcp` and local stdio process register the same 20 tools. Tool discovery is the source of truth for argument schemas and behavior annotations.

## Tools

All names have the `swiper.` prefix.

| Tool | Implemented behavior |
| --- | --- |
| get_brand | Read the authorized workspace brand |
| update_brand | Update copy guidance, colors, fonts, proof points and uploaded logo |
| list_formats | Discover official and saved workspace formats, counts and `can_generate` |
| list_projects | List workspace drafts with search and pagination: 25 default, 50 maximum |
| create_carousel | Create a manual draft, or draft from a brief |
| generate_carousel | Generate new copy from a brief, using an official or eligible saved format |
| get_carousel | Read current document, IDs, version and editor URL |
| update_carousel | Apply typed, version-guarded operations |
| generate_slide | Revise one slide against current copy; retain its design and all other slides |
| validate_carousel | Check structure, native text fit, assets and copy heuristics |
| render_preview | Return a selected saved slide as PNG image content, plus its version |
| export_carousel | Return download metadata and protected version-bound resource URIs |
| upload_asset | Upload base64 PNG/JPEG/WebP; return owned asset ID |
| list_assets | List owned image metadata, 50 per page |
| delete_asset | Delete an unused image; server references protect images still in use |
| save_format | Save current design, assets and semantic copy slots as a workspace format |
| delete_format | Delete a saved format; existing carousel copies remain |
| undo_carousel | Restore the preceding saved document using `expected_version` |
| delete_carousel | Delete draft and history using `expected_version` |
| get_request_status | Recover creation/revision receipt after response loss |

Generation accepts a brief of 12–10,000 characters, an optional title, `format_id`, `slide_count` and `request_id`. Official formats enforce their advertised range; saved formats keep their exact slide count. Saved-format generation replaces headline/kicker/body/proof/CTA text while retaining geometry, theme, images, labels and captions. Formats without writable copy slots or with ambiguous duplicate roles on a slide remain manual-only.

## Editing and retries

Read `get_carousel` first. `update_carousel` requires `expected_version`, `mutation_id` and 1–500 operations. The shared schema exposes each operation's required fields: `rename`, `update_text`, `set_text_style`, `set_element_box`, `set_element_image`, `add_element`, `delete_element`, `replace_slide_content`, `insert_slide`, `delete_slide`, `reorder_slide`, `set_background`, `set_layout`, `update_cta`, and `restore_document`. IDs come from the current document; coordinates use the 1080 × 1350 canvas. Brand changes use the separate brand tool.

A stale write returns a conflict with `details.current_version`. Read again before deciding how to merge. Reuse an immediate mutation ID only for the identical edit. Undo requires the current version; repeating its old version cannot undo twice.

Use one `request_id` for identical creation/revision retries. Different input under the same ID conflicts. Successful results replay before allowance checks, so response loss does not charge twice. Full receipt payloads expire after 30 days; retained tombstones prevent expired IDs from creating duplicate drafts. `get_request_status` distinguishes completed, deleted, expired and not_completed. The last state can mean work is still running; it is not a cancellation signal.

Model calls have a 60-second timeout with SDK retries disabled. MCP API calls have a 90-second timeout. On transport loss, look up the receipt and retry unchanged input with the same ID. A failed provider can produce a clearly marked local draft; that result uses a carousel slot but no AI credit.

## Preview and file delivery

`render_preview` returns MCP image content rather than an editor link. It uses the native export renderer and does not spend an export credit.

`export_carousel` returns authenticated browser URLs and resources such as:

```text
swiper://carousels/{carousel_id}/versions/{version}/exports/{format}
```

Read these resources through the authenticated MCP connection. PDF is a document, PNG/JPG are ZIP bundles, and JSON is a document backup. Binary reads spend export allowance; JSON is unmetered. JPG requires Pro. A changed version returns a conflict. Resources contain no API key in the URI. Host support for viewing images and saving binary resource attachments still needs certification in each advertised client.

## Authentication and approval

Remote Cursor/Claude connections use `Authorization: Bearer <key>` or `x-api-key`. ChatGPT uses `/mcp?key=<key>` with No authentication; treat the whole URL as a secret. Hosted clients need public HTTPS. Stdio requires the repository, a process-capable client and configured `SWIPER_API_URL`/credentials.

Content keys are workspace-scoped. They cannot manage credentials, start checkout, open the billing portal, or read private metrics. Those actions require an interactive owner/admin session. Identity disable/deletion and explicit revocation invalidate keys.

Every tool advertises read-only, destructive, idempotency and external-interaction hints. Generation and mutations are conservatively annotated when safety depends on optional IDs. Hints inform clients; authorization and version checks are enforced by the server. Ask the user before destructive cleanup, as the tool descriptions instruct. Live client approval behavior remains a release check.

Remote MCP bodies are capped at 12 MiB; image uploads at 8 MiB. Additional pixel, storage, rate and concurrency budgets are documented in [deployment](18-deployment.md). Errors contain concise codes, messages and recoverable details without private database errors or credentials.
