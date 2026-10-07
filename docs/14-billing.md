# Billing

## Example plans

Free (implemented monthly limits):
- 5 carousels
- 20 exports
- 10 AI generations
- PNG and PDF export

Pro (implemented monthly limits):
- 100 carousels
- 1,000 exports
- 250 AI generations
- JPG export
- 100 approval-first manual publishing handoffs

Team:
- multiple seats
- shared brand kits
- approval workflows
- higher limits

Team remains a future plan. Revisit the implemented limits after usage-cost analysis.

## Metering

Track:
- carousel generations
- slide generations
- image generations
- exports
- published posts
- storage

Use server-side usage records. Never rely on frontend counters.

The monthly carousel allowance counts remaining carousels created during the current UTC month.
Deleting a current-month draft releases its carousel slot; deleting an older draft does not
change this month's count. AI generations and exports remain metered after deletion.

## Cost control

AI and image generation can create unpredictable costs.

Set:
- workspace quotas
- per-operation limits
- provider fallbacks
- max generation size
- retry limits

## Billing webhooks

Treat billing provider webhooks as authoritative for subscription status.

Handle:
- subscription created
- renewed
- canceled
- payment failed
- plan changed

Webhook processing must be idempotent.
