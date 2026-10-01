# System Architecture

## High-level

```text
AI Client
   |
   | MCP
   v
Swiper MCP Server
   |
   v
Application API
   |
   +---- PostgreSQL
   +---- Object Storage
   +---- Redis / Queue
   +---- AI Provider Adapter
   +---- Image Provider Adapter
   +---- Publishing Adapters
   +---- Analytics Pipeline
   |
   v
Web Editor
```

## Services

### Web

Next.js application. Authentication, dashboard, editor, settings, billing, analytics.

### API

Owns authorization, project operations, generation orchestration, assets, publishing and analytics APIs.

### MCP server

Exposes safe, structured tools to AI clients.

### Worker

Handles expensive or asynchronous operations:
- image generation
- export rendering
- publishing
- analytics ingestion
- retries

### Renderer

Converts the canonical carousel schema into:
- browser preview
- PNG/JPG
- PDF
- future video formats

## Boundaries

The editor must not directly call AI providers.

The MCP server must not directly mutate the database without going through application authorization/business logic.

Workers should operate on durable jobs.

AI providers must be hidden behind interfaces.

Social platforms must be hidden behind publishing adapters.

## Recommended monorepo

```text
/apps/web
/apps/api
/apps/mcp
/apps/worker
/packages/carousel-schema
/packages/editor
/packages/ai
/packages/rendering
/packages/publishing
/packages/config
/packages/db
```

## Core rule

The canonical carousel JSON is the source of truth. The editor, MCP tools, export renderer and publishing layer all consume it.
