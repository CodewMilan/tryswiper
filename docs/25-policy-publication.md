# Policy publication review

Prepared 2026-10-15 for MILAN SAMPATH, operator of Swiper. Contact: milan@cassettelabs.in.

This is an implementation inventory and decision packet, not a published policy or legal advice. No approved Privacy/Terms content or URLs have been supplied. Do not publish this inventory as a customer policy.

## Ready to publish once content is approved

The site footer accepts `SWIPER_PRIVACY_POLICY_URL` and `SWIPER_TERMS_URL` as public HTTPS destinations. They can point to approved hosted documents or published pages on Swiper's own domain. Invalid/unset destinations are omitted, so the footer does not send people to nonexistent policy pages. No authentication should be required to read an approved policy. Verify both links anonymously before release. The new `/support` page provides an email action and a copyable address without requiring a mail application.

## Current implementation facts to reconcile with the policy

| Area | Current implementation | Operator decision or verification needed |
| --- | --- | --- |
| Identity | Clerk authenticates users; local user/workspace membership maps access. Signed webhooks and periodic checks can disable access and revoke keys. | Approve deployed providers, processor disclosures and identity handling. Configure and certify real webhook delivery. |
| Content | Database records include brand settings, carousel text/design, uploaded assets, saved formats and bounded edit history. | Decide retention for an active, inactive and deleted account, including shared workspaces and uploaded images. |
| Account deletion | Access removal/revocation is implemented; it does not promise permanent removal of all local content, billing records or backups. | Decide who can request deletion, how to verify them, timing, exceptions and treatment of other workspace members. No self-service erasure promise is implemented. |
| AI generation | Configured OpenAI/Anthropic providers may receive generation input assembled from the brand, brief, selected format and relevant carousel content. Requests can fall back to labeled local output. | Confirm actual production providers, their settings/contracts and required disclosures. Do not claim that a provider never retains/trains on data without verifying the applicable agreement. |
| Agents | Bearer keys grant workspace access. ChatGPT's accepted connection flow includes a private key in the connector URL. Key secrets are shown once; revocation stops future authenticated use. | Confirm hosted-client settings and infrastructure redaction/retention for URL logs. Decide support incident handling. |
| Payments | Dodo checkout and customer portal are implemented; Swiper records plan/customer/subscription/usage identifiers. Payment credentials are unset locally. | Approve billing terms, cancellation/refund policy and tax/invoice disclosures; verify the actual product settings and supported plan-change process. |
| Local browser storage | Brief/request recovery uses session storage. Local editor recovery and optional feedback reminders support interrupted sessions. | Review the final deployment's session/cookie/storage disclosures with Clerk's configuration. |
| Product events | Workspace stage/source/feedback events have a 90-day reporting window and prune on activity; capped at 10,000 per workspace. No private text, email or image bytes are stored in these events by this instrumentation. | Decide whether periodic deletion must run independently of activity and approve an overall analytics/operational retention policy. |
| Recovery history | Saved creation results expire after 30 days and are pruned on relevant activity; carousel edit history is bounded. These controls are not an account-wide deletion policy. | Specify schedules and the implementation work needed to meet them. |
| Hosting/backups/logs | Production provider, backup restore and realistic hosting behavior remain release checks. | Confirm hosting regions/providers, access controls, log/backup retention and deletion propagation. |

Source references: `apps/web/src/lib/session.ts`, `src/server/identity.ts`, `src/server/carousels.ts`, `src/server/product-events.ts`, `src/lib/dodo.ts`, `src/components/agent-configs.tsx`, and `packages/db/src/schema.ts`.

## Decisions needed before the legal gate can close

1. Approved Privacy and Terms text or their public URLs.
2. Account/workspace deletion and retention rules: what is erased, when, backup treatment, billing exceptions and shared-workspace ownership.
3. Approved billing cancellation/refund and support rules, consistent with the provider configuration and product behavior.
4. Verified production processor/hosting settings and contact information required in the approved documents.

Once decisions are supplied: implement any retention/deletion differences, publish the approved documents, configure both URLs, inspect the anonymous footer links, then attach release evidence. Merely setting links does not certify the contents or close live identity/payment gates.
