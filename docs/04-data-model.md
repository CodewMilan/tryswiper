# Data Model

Use PostgreSQL.

## Entities

### User
- id
- email
- name
- created_at

### Workspace
- id
- name
- owner_id
- created_at

### Membership
- workspace_id
- user_id
- role

Roles:
- owner
- admin
- editor
- viewer

### Brand
- id
- workspace_id
- name
- description
- tone
- colors
- fonts
- logo_asset_id
- guidelines

### Project
- id
- workspace_id
- brand_id
- name
- description
- status
- created_by
- created_at
- updated_at

### Carousel
- id
- project_id
- version
- schema_version
- title
- format_id
- status
- content_json
- created_by
- created_at
- updated_at

### Slide
Slides may be embedded in `content_json` for the MVP. Normalize later if analytics or collaborative editing requires it.

### Asset
- id
- workspace_id
- type
- storage_key
- mime_type
- width
- height
- metadata_json
- created_at

### Template
- id
- workspace_id nullable
- name
- category
- schema_json
- preview_asset_id
- public/private

### SocialAccount
- id
- workspace_id
- platform
- account_external_id
- encrypted_credentials
- metadata_json
- status

### PublishJob
- id
- carousel_id
- social_account_id
- scheduled_at
- status
- external_post_id
- attempts
- error

### AnalyticsSnapshot
- id
- carousel_id
- platform
- impressions
- views
- likes
- comments
- shares
- saves
- clicks
- captured_at

## Versioning

Never overwrite a carousel's semantic history. Store versions or immutable snapshots so an agent can safely undo/compare changes.
