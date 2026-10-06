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
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` — from the Clerk dashboard. The publishable key is read when the image is built (`docker build --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`). Enable Google and GitHub under SSO connections.
- `APP_URL` — public origin, no trailing slash. Production must be `https://`. Read at runtime.
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` — optional. Without them, generation uses the local planner.

`NEXT_PUBLIC_APP_URL` is optional. Leave it unset in the image so the browser uses the origin it loaded.

The server refuses to start in production when the secret or the public origin is missing.

## Release

```bash
docker build -t swiper .
```

Run one container first so migrations finish, then add replicas. Startup takes a Postgres advisory lock around migrations.

CI (`.github/workflows/ci.yml`) installs, typechecks, tests, lints, migrates a fresh Postgres twice, and builds.

CI also runs Chromium workflows against the compiled production server: brand visuals and logo,
manual creation, editor gestures and undo, image replacement, workspace formats, PNG/PDF downloads,
refresh recovery, stale-write rejection, and workspace isolation. Failed runs retain traces and screenshots.

The native `@napi-rs/canvas` package must be a direct web-app dependency as well as an external
server package. Otherwise Next may try to bundle its native binary. Fonts (Inter, Lora, IBM Plex Mono)
are bundled with their licenses; building and rendering do not require Google Fonts or system fonts.

The editor's save protocol requires migration `0002_clean_red_shift.sql` (`carousel.last_mutation_id`).
Apply migrations before serving the new application. Existing local databases created through schema
push should use `pnpm db:push` as described below.

## Schema changes

1. Edit `packages/db/src/schema.ts`.
2. `pnpm --filter @swiper/db exec drizzle-kit generate --name <change>`
3. Commit `packages/db/drizzle`.
4. Local databases that were created with `db:push` are not tracked by the migration journal. Keep using `pnpm db:push` locally, or recreate the local database and run `pnpm db:migrate`.

## Not in this release

Preview environments, independent render workers, and S3 are described in the architecture doc and are not required to run the current app.
