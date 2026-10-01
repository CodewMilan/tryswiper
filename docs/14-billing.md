# Billing

## Example plans

Free:
- limited projects
- limited exports
- limited AI generations

Pro:
- higher generation limits
- more assets
- advanced templates
- publishing
- analytics

Team:
- multiple seats
- shared brand kits
- approval workflows
- higher limits

These are placeholders. Validate pricing after usage-cost analysis.

## Metering

Track:
- carousel generations
- slide generations
- image generations
- exports
- published posts
- storage

Use server-side usage records. Never rely on frontend counters.

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
