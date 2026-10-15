# Billing

Updated 14 October 2026. Pro and Studio add higher monthly allowances and JPG downloads. Checking and file handoff are part of Export; there is no separate paid Prepare files action in the browser.

| Allowance | Free | Pro | Studio |
| --- | ---: | ---: | ---: |
| Monthly price (USD) | $0 | $29 | $79 |
| Current-month carousels | 5 | 30 | 100 |
| Successful AI generations/revisions | 10 | 50 | 150 |
| Binary exports | 20 | 200 | 600 |
| PNG and PDF | Yes | Yes | Yes |
| JPG | No | Yes | Yes |

Limits reset on the first day of the UTC month. Deleting a current-month carousel frees its slot; AI/export usage remains. Local model fallback spends no AI credit. Usage admission and result persistence are transactional under a workspace lock. Actual binary downloads are metered, not merely obtaining download links. Expensive work happens outside short commit locks, with separate concurrency limits.

## Subscription state

Checkout requires the Dodo API key, intended product ID and signing secret. A checkout return URL never grants Pro. Signed subscription webhooks are deduplicated by event ID, ordered by provider event time and reconciled with the authoritative subscription endpoint. Different events sharing a timestamp can apply a fresh snapshot; duplicate IDs cannot. Subscription identity, product, verified time and billing period govern access; ordinary successful payments, including zero-value card verification, do not grant a plan.

Active paid time and a bounded, periodically verified past-due grace lease can grant Pro. Pending, failed, paused, on-hold, expired and immediate cancellation do not. Scheduled cancellation retains access until the verified period ends. Superseded subscriptions and older verification snapshots cannot overwrite newer state. Periodic refresh uses an integer revision guard. During an outage, previously verified unexpired paid time can remain valid; unverifiable legacy Pro records do not silently grant access.

The deployment must reconcile any legacy billing records lacking a verified subscription. Test actual provider states, renewal configuration, trial/cancellation policy and prices before charging. The shared catalogue in `apps/web/src/lib/plans.ts` controls public prices and enforced allowances. `PRO_PRICE` is no longer used. Pro and Studio need distinct Dodo products; verified product identity selects the tier, never client metadata. Checkout verifies the configured product is tax-exclusive USD recurring monthly at 2900/7900 cents, without a trial, PPP or automatic price discount, before opening a session. A mismatch cannot charge a different advertised amount.

## Management and support

Interactive owners/admins can open **Manage subscription** on Pricing when a provider customer is linked. The server creates the customer portal session for that workspace's stored customer, with a return URL and email sending disabled. Content API keys cannot open it. Existing unresolved subscriptions require management/reconciliation rather than another checkout.

Support: [milan@cassettelabs.in](mailto:milan@cassettelabs.in). Operator: **MILAN SAMPATH**. Approved privacy and terms pages, and the account-deletion/retention policy, remain launch requirements; no business policy has been invented.

The legacy `/publish` endpoint remains for compatibility, with version-bound validation and idempotency; it is not a marketed Pro benefit. Team plans, social posting and image generation are not implemented billing features. See [release evidence](23-beta-and-release-checks.md).

## Pricing revision — 14 October 2026

The former unpriced Pro allowance (100/250/1000) was replaced by the explicit launch catalogue above. This environment has no configured Dodo credentials/products; paid cards show prices and working email access requests until checkout is configured. Paid customers use the existing portal for invoices/payment/cancellation and contact support for tier changes, avoiding duplicate subscriptions. Before deploying changed limits, reconcile any actual legacy customer promises; local product readiness does not establish that existing contracts can be reduced. No provider product was created/changed and no public price or subscription was deployed by this change.

The internal [cost model](24-pricing-economics.md) includes token costs, provider waste, processing, hosting/storage/rendering, support, refunds and Free-user subsidy. Its margins are scenario estimates; calibrate against invoices and actual usage.
