# Deployment

## What ships

One container (`Dockerfile`) runs the Next.js app. Route handlers are the API. Postgres is managed outside the container. The process applies SQL migrations on startup, then listens on `PORT` (default 3000).

`GET /api/health` returns `{ "ok": true }` when the database answers.

MCP is a stdio process on the agent machine. It is not part of the container. Set `SWIPER_API_URL` to the public origin.

Images and logos live in Postgres (`asset.data`). Back up the database. There is no object store, queue, or worker in this release.

## Environments

| | Local | Production |
| --- | --- | --- |
| Web | `pnpm dev` on port 3100 | Container, `PORT` |
| Database | `pnpm db:up` then `pnpm db:push` | Managed Postgres, `pnpm db:migrate` on boot |
| Secrets | `.env` and `apps/web/.env.local` | Host environment variables |

## Required environment

See `.env.example`.

- `DATABASE_URL` — include `sslmode=require` for managed Postgres. Use the pooled URL when the host has one. The driver disables prepared statements so transaction poolers work.
- `BETTER_AUTH_SECRET` — at least 32 random characters. The placeholder in `.env.example` is rejected when `NODE_ENV=production`.
- `BETTER_AUTH_URL` and `APP_URL` — public origin, no trailing slash. Production must be `https://`. These are read at runtime, not baked into the image.
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` — optional. Without them, generation uses the local planner.

`NEXT_PUBLIC_APP_URL` is optional. Leave it unset in the image so the browser uses the origin it loaded.

The server refuses to start in production when the secret or the public origin is missing.

## Release

```bash
docker build -t swiper .
```

Run one container first so migrations finish, then add replicas. Startup takes a Postgres advisory lock around migrations.

CI (`.github/workflows/ci.yml`) installs, typechecks, tests, lints, migrates a fresh Postgres twice, and builds.

## Schema changes

1. Edit `packages/db/src/schema.ts`.
2. `pnpm --filter @swiper/db exec drizzle-kit generate --name <change>`
3. Commit `packages/db/drizzle`.
4. Local databases that were created with `db:push` are not tracked by the migration journal. Keep using `pnpm db:push` locally, or recreate the local database and run `pnpm db:migrate`.

## Not in this release

Preview environments, independent render workers, and S3 are described in the architecture doc and are not required to run the current app.
