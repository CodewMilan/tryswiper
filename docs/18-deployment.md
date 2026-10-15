# Deployment

## What ships

One container (`Dockerfile`) runs the Next.js app. Route handlers are the API. Postgres is managed outside the container. The process applies SQL migrations on startup, then listens on `PORT` (default 3000).

`GET /api/health` returns `{ "ok": true }` when the database answers.

Remote agents call the streamable HTTP endpoint at `/mcp` on this app. Cursor and Claude send `Authorization: Bearer` with a key minted at `/connect`. ChatGPT uses `/mcp?key=` because it does not send a custom header. The stdio process in `apps/mcp` still works for a local Cursor or Claude Desktop install; set `SWIPER_API_URL` to the public origin.

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
- `CLERK_WEBHOOK_SIGNING_SECRET` — configure `/api/webhooks/clerk` for `user.created`, `user.updated`, and `user.deleted`. Signed events sync linked profiles and revoke content keys on account removal/disable. Session/key access also checks current identity state at least every two minutes, so webhook delivery is not the only revocation path. Disabling access retains local content and billing records; data-deletion/retention policy remains an operator decision.
- `APP_URL` — public origin, no trailing slash. Production must be `https://`. Read at runtime.
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` — optional. Without them, generation uses the local planner.
- `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_PRO_PRODUCT_ID`, `DODO_PAYMENTS_STUDIO_PRODUCT_ID`, and `DODO_PAYMENTS_WEBHOOK_SECRET` — optional until you charge. Checkout uses the test API unless `DODO_PAYMENTS_ENVIRONMENT=live_mode`. Point the Dodo webhook at `https://<origin>/api/v1/billing/webhook`.
- Pro and Studio products must be distinct recurring monthly USD products at $29/$79 respectively, tax-exclusive, without trials, PPP or automatic discounts. `DODO_PAYMENTS_PRODUCT_ID` remains an alias for Pro. Public prices/limits come from `src/lib/plans.ts`; `PRO_PRICE` no longer controls the page. Checkout preflights the provider product and refuses mismatches.

`NEXT_PUBLIC_APP_URL` is optional. Leave it unset in the image so the browser uses the origin it loaded.

The server refuses to start in production when the secret or the public origin is missing.

## Release

Checkout requires the API key, signing secret and the selected tier’s product ID. Subscription events are verified, deduplicated, and reconciled against `GET /subscriptions/{id}`; ordinary payment successes do not grant a plan. Paid access follows the product, provider state, and period end. Grace-period access is periodically reverified. Keep the subscription product's renewal configuration and the operator's trial/cancellation policies aligned with Dodo. Live lifecycle certification is still required before charging.

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

The 14 October repairs add migrations `0005` through `0012`. Apply them before serving the new code. `0007` preserves redundant same-user provider mappings in `account_identity_archive`, then adds uniqueness; it refuses to merge identities that point to different users. Review/reconcile any such conflict before retrying deployment. Archived mappings remain internal and are removed if the local user is deleted. CI and the browser regression suite exercise migration replay, preservation, and conflict rollback on isolated databases.

1. Edit `packages/db/src/schema.ts`.
2. `pnpm --filter @swiper/db exec drizzle-kit generate --name <change>`
3. Commit `packages/db/drizzle`.
4. Local databases that were created with `db:push` are not tracked by the migration journal. Keep using `pnpm db:push` locally, or recreate the local database and run `pnpm db:migrate`.

## Not in this release

Preview environments, independent render workers, and S3 are described in the architecture doc and are not required to run the current app.

## Bounded resources and packaging

Uploads are limited to 8 MiB, 4,096 pixels per side and 12 megapixels before decoding. Animated PNG/WebP are rejected. A workspace can retain 200 images / 200 MiB and make at most 30 retained uploads per hour. Rendering limits combined input to 24 megapixels / 32 MiB. Asset cleanup is explicit and reference-aware. Documents/history/request payloads have a separate 512 MiB workspace budget. Undo retains 100 snapshots, formats cap at 100, and library queries are paginated rather than loading all full documents. Successful request payloads expire after 30 days and are pruned on subsequent mutations; tombstones preserve retry safety.

Postgres-backed leases admit up to eight concurrent model calls and four renders across instances, with at most two of either kind per workspace. Per-minute workspace admission is 10 generations / 30 renders. Leases expire after 120 seconds and release on completion/failure. These are admission limits, not production capacity measurements; benchmark the actual deployment. Generic API/webhook bodies cap at 1 MiB, asset multipart at 8 MiB plus bounded overhead, and MCP at 12 MiB.

The Docker context excludes private `problems.md`, agent directories, credentials, local environments, test output and dependency/build caches. Next traces include bundled font assets on all carousel routes, including creation, validation, preview and export. Confirm native libraries and font files in the deployed artifact.

Migrations 0009–0012 add preparation versions, resource budgets, local product events and billing verification revisions. Run migration replay/rollback checks and reconcile legacy identities/billing before release. Approve retention and legal pages; the code does not define the business's account-deletion policy. Use [the release evidence checklist](23-beta-and-release-checks.md) for live authentication, MCP, payments, backups and load.

## Public policy destinations

After operator approval, set `SWIPER_PRIVACY_POLICY_URL` and `SWIPER_TERMS_URL` to their public HTTPS URLs. The server-rendered footer exposes configured, valid destinations; unset/invalid URLs are omitted. Do not point them to drafts or authenticated documents. The technical inventory and remaining decisions are in [Policy publication review](25-policy-publication.md). `/support` is public and offers email and clipboard contact actions.
