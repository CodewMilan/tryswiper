# Observability

Updated 14 October 2026. Current instrumentation is deliberately small and local.

## Implemented

Model operations emit structured source, duration, error category and successful token usage. A hashed request reference connects retries/logs without logging the supplied request ID. Provider timeouts and malformed model output are distinguishable from successful model drafts and local fallback. API internal failures expose an error ID while retaining a generic public message.

Workspace product events record created, edited, revised, checked, exported and optional usefulness feedback. These records contain event kind, workspace/carousel IDs, source/value and timestamp; no briefs, emails, images or credentials. See [analytics](12-analytics.md). Owner/admin session access to `/api/v1/metrics` reports the last 90 days of stage counts; content keys cannot read it.

Never log OAuth tokens, API keys, full private prompts or image bytes. There is no third-party analytics sender. Host log retention/access still needs an approved operational policy.

## Limits and later work

Token usage is input for a cost estimate, not a verified provider invoice. Events are stage counts, not cohort conversion or proof that a user reviewed every download. Return sessions, complete setup funnels, production percentiles, export failure rates and alerting need additional release/beta evidence. No queue, social publishing or social-performance metrics exist in this release.

Before launch, exercise timeout and failure paths on the deployed candidate, collect request IDs and inspect the relevant provider/host logs. Set alerts from measured beta traffic and actual cost data rather than claiming an untested monitoring system. Follow [the beta and release protocol](23-beta-and-release-checks.md).
