# Billing

Updated 14 October 2026. Pro adds higher monthly allowances and JPG downloads. Checking and file handoff are part of Export; there is no separate paid Prepare files action in the browser.

| Allowance | Free | Pro |
| --- | ---: | ---: |
| Current-month carousels | 5 | 100 |
| Successful AI generations/revisions | 10 | 250 |
| Binary exports | 20 | 1,000 |
| PNG and PDF | Yes | Yes |
| JPG | No | Yes |

Limits reset on the first day of the UTC month. Deleting a current-month carousel frees its slot; AI/export usage remains. Local model fallback spends no AI credit. Usage admission and result persistence are transactional under a workspace lock. Actual binary downloads are metered, not merely obtaining download links. Expensive work happens outside short commit locks, with separate concurrency limits.

## Subscription state

Checkout requires the Dodo API key, intended product ID and signing secret. A checkout return URL never grants Pro. Signed subscription webhooks are deduplicated by event ID, ordered by provider event time and reconciled with the authoritative subscription endpoint. Different events sharing a timestamp can apply a fresh snapshot; duplicate IDs cannot. Subscription identity, product, verified time and billing period govern access; ordinary successful payments, including zero-value card verification, do not grant a plan.

Active paid time and a bounded, periodically verified past-due grace lease can grant Pro. Pending, failed, paused, on-hold, expired and immediate cancellation do not. Scheduled cancellation retains access until the verified period ends. Superseded subscriptions and older verification snapshots cannot overwrite newer state. Periodic refresh uses an integer revision guard. During an outage, previously verified unexpired paid time can remain valid; unverifiable legacy Pro records do not silently grant access.

The deployment must reconcile any legacy billing records lacking a verified subscription. Test actual provider states, renewal configuration, trial/cancellation policy and prices before charging. `PRO_PRICE` controls the display label; the Dodo product determines the charged price.

## Management and support

Interactive owners/admins can open **Manage subscription** on Pricing when a provider customer is linked. The server creates the customer portal session for that workspace's stored customer, with a return URL and email sending disabled. Content API keys cannot open it. Existing unresolved subscriptions require management/reconciliation rather than another checkout.

Support: [milan@cassettelabs.in](mailto:milan@cassettelabs.in). Operator: **MILAN SAMPATH**. Approved privacy and terms pages, and the account-deletion/retention policy, remain launch requirements; no business policy has been invented.

The legacy `/publish` endpoint remains for compatibility, with version-bound validation and idempotency; it is not a marketed Pro benefit. Team plans, social posting and image generation are not implemented billing features. See [release evidence](23-beta-and-release-checks.md).
