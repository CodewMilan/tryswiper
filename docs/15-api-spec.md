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
`PATCH /v1/carousels/:id`
`POST /v1/carousels/:id/generate`
`POST /v1/carousels/:id/validate`
`POST /v1/carousels/:id/render`
`POST /v1/carousels/:id/export`

## Slides

`POST /v1/carousels/:id/slides`
`PATCH /v1/carousels/:id/slides/:slideId`
`DELETE /v1/carousels/:id/slides/:slideId`
`POST /v1/carousels/:id/slides/:slideId/regenerate`

## Templates

`GET /v1/formats`
`GET /v1/templates`
`POST /v1/templates`

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
