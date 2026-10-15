# Beta validation and release evidence

Prepared 14 October 2026. This is an execution protocol, not evidence that a beta or public release has happened. Record the candidate commit/image, environment, date, tester and redacted result for each check. Never include live keys, private prompts or payment details in committed evidence.

## Current candidate

The local implementation preserves edits during agent iteration, supports generation with saved designs, provides image previews and protected MCP exports, bounds expensive work, and exposes subscription management/support. Local tests simulate identity/model/payment providers. These changes need live-client and customer evidence before public or paid certification.

Operator: **MILAN SAMPATH**. Support: **milan@cassettelabs.in**. Approved privacy-policy and terms URLs have not been supplied. Operator chose immediate account-content erasure with no recovery period. The local flow is implemented; production backup/log/processor retention and approved policy publication still need review. Do not publish invented policies.

## Beta task

Working audience hypothesis: founders or small teams who already use an agent and repeatedly create branded educational/product carousels. This has not been validated. Test a recurring job: turn a product brief into a reviewed branded carousel, then reuse the design for a second topic.

Recruit five appropriate participants when authorized; no outreach has been sent. Let each use their preferred advertised client and compare a similar task with their existing workflow. Keep coaching separate from unassisted completion.

1. Save a real brand, connect the client, and create a draft from a specific brief.
2. Make a manual copy/design correction, add an image, then ask the agent to revise a different slide. Verify the saved correction survives.
3. Inspect the rendered preview, verify facts, make necessary corrections and download the required file.
4. Save the design and generate new copy into it. Note which fixed labels/captions stay saved and whether that meets the task.
5. Return for a second real task. Ask what would make them continue or switch back.

Record unassisted completion, elapsed time to first reviewed download, fallback/model source, correction effort, visual/copy defects, retrieval problems, willingness to repeat, and the reason they choose either workflow. Collect optional usefulness feedback. Stage events and token logs supplement observation; they do not replace it.

Test the paid decision explicitly: ask the participant to explain Pro's benefit in their own words. They should understand higher allowances and JPG downloads, and the manual sharing step. Record whether those benefits are worth paying for; no willingness-to-pay claim is assumed.

Revisit positioning using demonstrated edit preservation, reusable design quality or review speed. Agent/MCP support alone overlaps competitors' advertised capabilities. Do not rewrite marketing around an unproven advantage or expand into a social suite without customer evidence.

## Public release checks

| Gate | Evidence required | Current status |
| --- | --- | --- |
| Google/GitHub sign-in | New and returning accounts, intended redirect, name completion, error recovery on public domain | Live check pending |
| Identity lifecycle | Signed profile update, disable, re-enable and deletion; content keys revoked; old profile response cannot reopen access | Local lifecycle/erasure fixtures cover permanent fences and cancellation retries; deployed subscriptions/secret and live delivery pending |
| Cursor, Claude, ChatGPT | Discover tools, create, guarded edit, image preview, protected file retrieval, appropriate mutation approvals | Local MCP checks pass; each advertised host pending |
| Credentials | Workspace isolation, no content-key credential/billing management, immediate revocation, no secret URLs except documented ChatGPT connection URL | Local checks pass; hosted revocation pending |
| Legal and support | Approved privacy/terms pages and retention policy; support links work | Operator/contact supplied and links implemented; policies pending |
| Accessibility | Account menu, dialogs, auth, keyboard, screen reader, zoom, contrast and touch on live screens | Shared menu keyboard fixture passes; live accessibility review pending |
| Models and content | Representative intended-provider drafts, token/cost/latency review and timeout/fallback recovery; human factual review | Simulated-provider checks pass; live quality pass pending |
| Deployment | Built image boots, HTTPS/public origin, migrations before traffic, health/native fonts, rollback procedure | Local builds/migration replay pass; hosted boot/HTTPS/rollback pending |
| Data recovery | Backup of representative deployed data restored into isolated database, verify assets/drafts/billing/identity, record recovery time | Production restore evidence pending |
| Resource capacity | Repeated usage and concurrent render/model/upload load on intended hosting, memory/latency observed, admission/recovery works | Budgets and local rejection/release fixtures pass; hosting benchmark pending |

## Paid release checks

Use the provider's intended test environment first. Test correct price/product, successful/pending/failed checkout, zero-value verification payment, pause/resume, renewal failure/recovery, cancellation now/at-period-end, expiry, stale/duplicate/out-of-order events, equal event timestamps, provider outage and a superseded subscription. Confirm webhook limits and retries with deployed configuration.

Verify Manage subscription, card/invoice/cancellation actions, return URL and support from the customer account. Reconcile legacy unverified Pro records. Confirm the operator's trial, cancellation and grace policies agree with the provider product configuration. Local signed/mock-provider tests establish server behavior; real provider journey and approved policies remain required before charging.

## Evidence record

For each gate record:

```text
date / tester:
candidate commit or image digest:
environment / client / provider mode:
steps and expected behavior:
observed result and redacted artifact:
remaining issue / owner:
```

Do not mark a gate complete because its code exists or a mock passed. Capture actual beta outcomes before calling the product differentiated, useful or commercially validated. Automatic social posting remains outside this release.
