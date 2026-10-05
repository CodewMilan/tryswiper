# Swiper

Swiper is an agent-first social carousel platform. The primary product loop is MCP:

`Brief → Agent → Carousel → Quality checks → Editor link → Iterate`

The web app (sign up, brand kit, visual editor, export) exists so humans can connect an agent, review what it made, and finish the work. It is secondary to the MCP loop.

## Product thesis

People already use ChatGPT, Claude, Cursor, and other agents to generate ideas and copy. The missing layer is a structured visual editor that lets those agents create useful, coherent, post-ready social content.

## Suggested stack

Frontend: Next.js + TypeScript + Tailwind

Editor: React + a canvas/editor abstraction

Backend: TypeScript + Node.js (Next.js route handlers for MVP)

Database: PostgreSQL

Object storage: S3-compatible storage

AI: provider abstraction supporting OpenAI/Anthropic

MCP: TypeScript MCP server (`@swiper/mcp`)

Auth: Better Auth sessions for the web; hashed API keys for MCP

## Local development

```bash
pnpm install
pnpm db:up
cp .env.example .env
pnpm db:push
pnpm dev
```

Open http://localhost:3100, create an account, add a brand kit, then mint an MCP API key.

Connect Cursor (or Claude Desktop) with:

```json
{
  "mcpServers": {
    "swiper": {
      "command": "pnpm",
      "args": ["--filter", "@swiper/mcp", "start"],
      "env": {
        "SWIPER_API_URL": "http://localhost:3100",
        "SWIPER_API_KEY": "sk_swiper_..."
      }
    }
  }
}
```

Then ask the agent: “Make a carousel explaining why we’re different.”

## Deploy

The web app is one Node process plus Postgres. Export rendering uses native canvas, so run the container. Do not deploy this as a Vercel serverless function.

```bash
docker build -t swiper .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/swiper?sslmode=require" \
  -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  -e BETTER_AUTH_URL="https://your-domain" \
  -e APP_URL="https://your-domain" \
  swiper
```

The container applies `packages/db/drizzle` migrations, then starts the server. `GET /api/health` checks Postgres.

Set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` on the host if agents should write copy. Without either, generation uses the local planner.

MCP stays on the machine running the agent. Point it at the public origin:

```json
{
  "mcpServers": {
    "swiper": {
      "command": "pnpm",
      "args": ["--filter", "@swiper/mcp", "start"],
      "env": {
        "SWIPER_API_URL": "https://your-domain",
        "SWIPER_API_KEY": "sk_swiper_..."
      }
    }
  }
}
```

Images and logos are stored in Postgres. A database backup includes them. There is no separate object store in this release.

Local schema changes still use `pnpm db:push`. Production and CI use `pnpm db:migrate`. After a schema change, generate a migration with `pnpm --filter @swiper/db exec drizzle-kit generate --name <change>`.

## Repository docs

See `docs/` for the full specification. Build order for this repo: MCP loop first, web generation flow second.
