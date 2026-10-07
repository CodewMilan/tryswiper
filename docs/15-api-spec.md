# Application API

Use REST for MVP. Keep contracts typed.

## Projects

`POST /v1/projects`
`GET /v1/projects`
`GET /v1/projects/:id`
`PATCH /v1/projects/:id`
`DELETE /v1/projects/:id`

## Carousels

`POST /v1/carousels`
`GET /v1/carousels/:id`
`DELETE /v1/carousels/:id` — delete an authorized carousel and release its current-month carousel slot; saved formats remain available
`PATCH /v1/carousels/:id`
`POST /v1/carousels/:id/generate`
`POST /v1/carousels/:id/validate`
`POST /v1/carousels/:id/render`
`POST /v1/carousels/:id/export`

Browser generation (`POST /api/v1/carousels` with a brief) and
`POST /api/v1/carousels/generate` accept an optional `reference_url`.
If a supported post cannot be fetched or has no public metadata, generation
continues using the brief. The successful response includes a `warnings` array
with code `REFERENCE_UNAVAILABLE` and a human-readable message. Its `editor_url`
carries the non-fatal notice into the editor. Invalid or unsupported URLs still
return a validation error before creating a draft.

## Slides

`POST /v1/carousels/:id/slides`
`PATCH /v1/carousels/:id/slides/:slideId`
`DELETE /v1/carousels/:id/slides/:slideId`
`POST /v1/carousels/:id/slides/:slideId/regenerate`

## Templates

`GET /v1/formats` — list official formats and formats saved in the authenticated workspace
`POST /v1/formats` — save an authorized carousel as a reusable workspace format
`GET /v1/templates`
`POST /v1/templates`

Create-format body:

```json
{
  "carousel_id": "car_...",
  "name": "Customer proof story",
  "description": "Use after a launch to turn proof points into a short narrative."
}
```

## Assets

`POST /v1/assets/presign`
`POST /v1/assets/complete`
`GET /v1/assets/:id`

## Publishing

`POST /v1/social-accounts/connect`
`GET /v1/social-accounts`
`POST /v1/publish-jobs`
`GET /v1/publish-jobs/:id`

## API requirements

- request validation
- authentication
- authorization
- pagination
- idempotency for mutations that can be retried
- structured errors
- request IDs
