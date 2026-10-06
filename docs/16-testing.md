# Testing Strategy

## Unit

Test:
- carousel schema validation
- layout calculations
- text fitting
- template selection
- brand validation
- permissions
- usage metering
- publishing adapters
- idempotency

## Integration

Test:
- API + database
- MCP + API
- generation + persistence
- asset upload
- export pipeline
- publish queue

## E2E

Critical path:

Sign up → create workspace → brand → project → generate → edit → export.

Second path:

MCP connection → agent creates carousel → editor opens → edit → export.

Workspace format path:

Create or edit carousel → save as workspace format → open New carousel → select saved format →
create an independent draft with fresh slide and element IDs.

## Automated browser verification

Run `pnpm --filter @swiper/web exec playwright install chromium` once, then
`pnpm --filter @swiper/web test:e2e`. The suite starts a separate webpack development server on
port 3101, uses the configured development database, and creates unique QA accounts.
To test the release bundle: `pnpm build`, then `E2E_PRODUCTION=1 pnpm --filter @swiper/web test:e2e`.

The suite verifies brand color/font/logo persistence; manual creation; pointer drag and resize;
undo; slide reordering; image replacement; format capture and independent reuse; PNG and PDF
downloads; layouts at 1440/768/375 pixels; interrupted-save recovery after refresh; retry idempotency;
version conflicts; and cross-workspace access denial. Artifacts are in `apps/web/test-results`.

## Visual regression

Render representative templates at fixed dimensions and compare snapshots.

Test:
- long text
- missing image
- large image
- Unicode
- different fonts
- dark/light backgrounds
- extreme CTA lengths

## AI evaluation

Create a fixed benchmark of briefs.

Score:
- hook quality
- coherence
- factuality
- brand fit
- visual intent
- CTA relevance
- originality

Store model/version and prompt version with evaluations.
