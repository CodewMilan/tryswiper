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
