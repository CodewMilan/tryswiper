# Application API

Updated 15 October 2026. These are implemented routes under `/api/v1`; route handlers and shared schemas define the detailed contracts. Session and content-key authorization always checks workspace ownership.

| Route | Methods and behavior |
| --- | --- |
| `/projects` | GET paginated workspace project/draft metadata |
| `/carousels` | POST manual creation or generation from a brief |
| `/carousels/generate` | POST generation from a brief and official/eligible saved format |
| `/carousels/{id}` | GET current document (or retained `?version=` snapshot), PATCH typed edits, DELETE draft/history |
| `/carousels/{id}/slides/{slideId}/regenerate` | POST one-slide revision preserving saved design and surrounding work |
| `/carousels/{id}/undo` | POST restore previous saved snapshot |
| `/carousels/{id}/validate` | POST structural, native text-fit, asset and copy checks |
| `/carousels/{id}/render` | GET PNG image with `?slide=N` and version header; POST preview metadata |
| `/carousels/{id}/export` | POST file metadata; GET binary/JSON with `?format=pdf,png,jpg,json` (one value) and optional `version` |
| `/carousels/{id}/publish` | POST legacy version-bound manual preparation compatibility; no social posting |
| `/carousels/{id}/feedback` | POST optional usefulness feedback |
| `/formats` | GET official and workspace formats; POST save owned draft as a format |
| `/formats/{id}` | PATCH owned format name/description; DELETE owned workspace format |
| `/assets` | GET paginated owned image metadata; POST bounded multipart image upload |
| `/assets/{id}` | GET owned image bytes; DELETE unused owned asset |
| `/brand` | GET/PATCH workspace brand |
| `/requests/{id}` | GET durable creation/revision result status |
| `/billing` | GET effective verified plan, usage, limits and customer/period metadata |
| `/billing/checkout` | POST checkout; interactive owner/admin only |
| `/billing/portal` | POST provider customer portal; interactive owner/admin only |
| `/billing/webhook` | POST signed Dodo subscription events |
| `/mcp-keys` | GET/POST key management; interactive owner/admin only |
| `/mcp-keys/{id}` | DELETE key; interactive owner/admin only |
| `/metrics` | GET private workspace event counts; interactive owner/admin only |

`/api/webhooks/clerk` receives bounded signed Clerk lifecycle events; `/api/health` checks the database. Remote MCP uses `/mcp`.

## Creation and edit semantics

Browser/API generation accepts `brief`, optional `title`, `format_id`, `slide_count` and `reference_url`. Official counts follow their advertised range; saved formats use their original count and must advertise `can_generate`. Public-reference metadata failure falls back to the brief with `REFERENCE_UNAVAILABLE`; invalid/unsafe references fail before creation. No private-post or complete-slide extraction is promised.

Creation/revision retries use `Idempotency-Key`. Identical successful requests replay their receipt before allowance admission; changed input conflicts. After 30 days the result payload can expire while its tombstone prevents duplicate creation. GET request status can recover a committed editor link even at the quota boundary; not_completed can still mean in-flight work.

PATCH edits use the shared discriminated operation union, `expected_version` and `mutation_id`. Undo and agent deletion guard the current version. Stale operations return 409 with recoverable version details. History, accepted results and metering commit transactionally; expensive model/render work happens outside the short commit lock. Current-month deletion releases that carousel slot, while generation/export usage remains.

## Limits and errors

Invalid inputs return structured 4xx codes/messages. Missing/corrupt export assets fail explicitly. Bodies, document shape, pixels, storage, pagination and expensive operation rate/concurrency are bounded; see [deployment](18-deployment.md). Internal failures return a generic message and error ID rather than private database details.

There are no implemented project CRUD, standalone slide CRUD, presigned object-store uploads, social-account, scheduling or social analytics routes. Slide changes use the document operation API. The MCP contract is in [the tool specification](05-mcp-spec.md).

## Saved format details

`PATCH /api/v1/formats/{id}` accepts a trimmed `name` (2–80 characters) and optional `description` (up to 240 characters; empty clears it). Unknown fields are rejected. Updates are scoped to the authenticated workspace and require write access. Names remain unique within a workspace; a duplicate returns 409. The design/content and existing carousel copies remain unchanged. Creation, metadata edits and deletion serialize on the workspace row.
