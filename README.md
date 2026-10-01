# Swiper

Swiper is an agent-first social carousel platform. It gives AI agents a visual carousel editor, reusable formats, brand context, and publishing capabilities.

The core loop is:

`Idea → Agent → Carousel → Edit → Approve → Publish → Learn`

## Product thesis

People already use ChatGPT, Claude, Cursor, and other agents to generate ideas and copy. The missing layer is a structured visual editor that lets those agents create useful, coherent, post-ready social content.

Swiper focuses on swipeable posts first. The system should produce content that feels authored, not like generic AI output.

## Primary user

Founders, indie hackers, marketers, agencies, creators, and product teams that want to consistently promote a product through social carousels.

## MVP

1. User authentication
2. Workspace and brand kit
3. Carousel project creation
4. Agent/MCP connection
5. Structured slide generation
6. Visual editor
7. Templates/formats
8. Image generation or image asset support
9. Export
10. Draft/review workflow
11. Publishing integration where APIs permit
12. Basic analytics
13. Usage limits and billing

## Repository docs

- `docs/01-product-spec.md` — product requirements and UX
- `docs/02-user-flows.md` — end-to-end user journeys
- `docs/03-system-architecture.md` — technical architecture
- `docs/04-data-model.md` — database model
- `docs/05-mcp-spec.md` — MCP interface and tool contracts
- `docs/06-agent-generation.md` — generation pipeline and agent behavior
- `docs/07-carousel-schema.md` — canonical carousel representation
- `docs/08-editor-spec.md` — editor requirements
- `docs/09-template-system.md` — template and format system
- `docs/10-brand-system.md` — brand kit and visual consistency
- `docs/11-publishing.md` — publishing abstraction
- `docs/12-analytics.md` — analytics and feedback loop
- `docs/13-auth-security.md` — authentication and security
- `docs/14-billing.md` — plans, quotas, metering
- `docs/15-api-spec.md` — application API
- `docs/16-testing.md` — testing strategy
- `docs/17-observability.md` — logs, metrics and tracing
- `docs/18-deployment.md` — environments and deployment
- `docs/19-content-quality.md` — quality rules and evaluation
- `docs/20-build-plan.md` — implementation phases
- `docs/21-acceptance-criteria.md` — definition of done

## Suggested stack

Frontend: Next.js + TypeScript + Tailwind

Editor: React + a canvas/editor abstraction

Backend: TypeScript + Node.js

Database: PostgreSQL

Object storage: S3-compatible storage

Queue: Redis + BullMQ

AI: provider abstraction supporting OpenAI/Anthropic and future providers

MCP: TypeScript MCP server

Auth: managed auth or secure application sessions

Deployment: Vercel for web, container platform for API/workers

Do not couple core business logic directly to a single AI provider or social platform.
