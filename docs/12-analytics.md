# Product measurement

Updated 14 October 2026. This release measures the creation/review/download loop. It does not collect social impressions, likes, comments, shares or clicks.

## Current records

Local workspace events cover creation, saved edits, slide revisions, checks, successful exports and optional `useful`/`needs_work` draft feedback after download. Source separates model and local drafts. `/api/v1/metrics` returns counts and distinct draft counts by stage/source/value for an authenticated owner/admin.

The reporting window is 90 days. New activity prunes older events and caps each workspace at its most recent 10,000; pruning is activity-driven, not a scheduled deletion service. Dormant records can therefore remain longer than the reporting window. Events omit private content, contact details and credentials. Account deletion and host-log retention still need the operator's approved policy.

These counts describe observed activity since instrumentation began. They do not establish a user-cohort conversion rate, time to a human-approved download, repeat use or customer preference. A check is an automated action, not factual approval. Feedback is voluntary and can be biased. No real customer results are claimed.

## Beta measures

Observe setup, first draft, first correction, first reviewed download and a returning task. Record task completion/time, model versus fallback, correction effort, useful/needs_work feedback and stated reasons for choosing Swiper. Compare against the participant's existing workflow on a similar task. Use [the protocol](23-beta-and-release-checks.md) to collect actual evidence before changing positioning or limits.

Any future social analytics requires a separately approved platform integration with clear metric definitions. There are no social-performance promises in the current product.
