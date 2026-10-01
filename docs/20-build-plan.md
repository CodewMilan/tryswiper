# Build Plan

## Phase 0 — Foundation

- monorepo
- TypeScript
- database
- auth
- workspace model
- CI
- environment configuration
- logging

## Phase 1 — Carousel core

- canonical schema
- schema validator
- project CRUD
- carousel CRUD
- slide CRUD
- basic renderer
- export

Milestone: manually create and export a carousel.

## Phase 2 — Editor

- canvas
- slide navigator
- inspector
- text editing
- image upload
- layouts
- undo/redo
- autosave

Milestone: editor is usable without AI.

## Phase 3 — Templates

- format schema
- initial 10 formats
- template previews
- format selection
- workspace templates

Milestone: user can start from a format.

## Phase 4 — AI generation

- product context
- narrative planner
- slide generator
- visual planner
- validator
- critic
- repair loop

Milestone: brief → editable carousel.

## Phase 5 — MCP

- authentication
- MCP server
- create/get/update tools
- generation tools
- validation
- preview
- export

Milestone: ChatGPT/Claude can create and modify a carousel.

## Phase 6 — Assets

- image provider abstraction
- uploads
- generated images
- screenshots
- asset library

## Phase 7 — Publishing

- social account OAuth
- publishing adapters
- scheduler
- retries
- approval workflow

Start with one platform and expand.

## Phase 8 — Analytics

- platform metrics
- dashboard
- post performance
- format performance

## Phase 9 — Billing

- plans
- metering
- checkout
- webhook handling
- quotas

## Phase 10 — Growth loop

- reusable brand kits
- campaign generation
- format discovery
- analytics-informed recommendations
- team workflows

## First shippable version

Do not wait for publishing.

The strongest early loop is:

`MCP → generate → editor → export`

If that loop feels magical, add publishing next.
