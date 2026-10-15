# Policy publication review

Prepared 2026-10-15 for MILAN SAMPATH, operator of Swiper. Contact: milan@cassettelabs.in.

This is an implementation inventory and decision packet, not a published policy or legal advice. No approved Privacy/Terms content or URLs have been supplied. The operator subsequently chose immediate erasure, with no recovery period, for account content on deletion. Do not publish this inventory as a customer policy.

## Ready to publish once content is approved

The site footer accepts `SWIPER_PRIVACY_POLICY_URL` and `SWIPER_TERMS_URL` as public HTTPS destinations. They can point to approved hosted documents or published pages on Swiper's own domain. Invalid/unset destinations are omitted, so the footer does not send people to nonexistent policy pages. No authentication should be required to read an approved policy. Verify both links anonymously before release. The new `/support` page provides an email action and a copyable address without requiring a mail application.

## Current implementation facts to reconcile with the policy

| Area | Current implementation | Operator decision or verification needed |
| --- | --- | --- |
| Identity | Clerk authenticates users; local user/workspace membership maps access. Signed webhooks and periodic checks can disable access and revoke keys. | Approve deployed providers, processor disclosures and identity handling. Configure and certify real webhook delivery. |
| Content | Database records include brand settings, carousel text/design, uploaded assets, saved formats and bounded edit history. | Immediate deletion is implemented for content in owned workspaces. Approve active/inactive retention, processor settings and production backup treatment. |
| Account deletion | `/account` provides typed confirmation and erases owned workspaces from active application storage. Assets, carousels/history, formats, brand, receipts and workspace events cascade away. Shared owned workspaces are erased with an explicit warning; memberships in other owners’ workspaces are removed while their content remains. | Approved choice: immediate erasure, no recovery period. Verify live Clerk removal and backups; review ownership boundaries before adding multi-workspace/team features. Minimal pseudonymous identity/provider mapping prevents restoration by stale events. |
| AI generation | Configured OpenAI/Anthropic providers may receive generation input assembled from the brand, brief, selected format and relevant carousel content. Requests can fall back to labeled local output. | Confirm actual production providers, their settings/contracts and required disclosures. Do not claim that a provider never retains/trains on data without verifying the applicable agreement. |
| Agents | Bearer keys grant workspace access. ChatGPT's accepted connection flow includes a private key in the connector URL. Key secrets are shown once; revocation stops future authenticated use. | Confirm hosted-client settings and infrastructure redaction/retention for URL logs. Decide support incident handling. |
| Payments | Dodo checkout and customer portal are implemented; Swiper records plan/customer/subscription/usage identifiers. Payment credentials are unset locally. | Deletion queues linked subscriptions for immediate cancellation. Failed cancellation stays in a durable content-free job, with webhook/CLI retry and a visible pending state. Approve billing/refund/tax terms and verify the actual provider flow. |
| Local browser storage | Brief/request recovery uses session storage. Local editor recovery and optional feedback reminders support interrupted sessions. | Review the final deployment's session/cookie/storage disclosures with Clerk's configuration. |
| Product events | Workspace stage/source/feedback events have a 90-day reporting window and prune on activity; capped at 10,000 per workspace. No private text, email or image bytes are stored in these events by this instrumentation. | Decide whether periodic deletion must run independently of activity and approve an overall analytics/operational retention policy. |
| Recovery history | Saved creation results expire after 30 days and are pruned on relevant activity; carousel edit history is bounded. These controls are not an account-wide deletion policy. | Specify schedules and the implementation work needed to meet them. |
| Hosting/backups/logs | Production provider, backup restore and realistic hosting behavior remain release checks. | Confirm hosting regions/providers, access controls, log/backup retention and deletion propagation. |

Source references: `apps/web/src/lib/session.ts`, `src/server/identity.ts`, `src/server/carousels.ts`, `src/server/product-events.ts`, `src/lib/dodo.ts`, `src/components/agent-configs.tsx`, and `packages/db/src/schema.ts`.

## Decisions needed before the legal gate can close

1. Approved Privacy and Terms text or their public URLs.
2. Confirm production backup/log/processor retention and the ownership boundary: immediate active-storage erasure is selected and implemented for owned workspaces; other owners’ workspaces remain theirs.
3. Approved billing cancellation/refund and support rules, consistent with the provider configuration and product behavior.
4. Verified production processor/hosting settings and contact information required in the approved documents.

Once decisions are supplied: reconcile any additional retention/deletion requirements, publish the approved documents, configure both URLs, inspect the anonymous footer links, then attach release evidence. Merely setting links does not certify the contents or close live identity/payment gates.

## Immediate erasure implementation — 2026-10-15

- An interactive session, same-origin request and exact typed `DELETE` confirmation are required for `DELETE /api/v1/account`; MCP keys cannot delete accounts. Only the signed-in account can be targeted.
- The self-service route confirms provider account removal, then erases local content synchronously. Verified Clerk `user.deleted` events and confirmed provider 404 checks use the same local erasure path. Webhooks are eventually delivered; public deployment configuration and delivery must be tested before making timing claims about externally initiated deletion.
- Owned workspaces are deleted transactionally, including carousels, uploaded image bytes, saved formats, brand, history, local events and recovery receipts. Their workspace foreign keys reject already-running writes after deletion. Disabled/locked accounts keep their content; disabling is not deletion.
- The name, email and profile image are cleared/pseudonymized and stored credential secrets are removed. Minimal local/provider IDs and deletion timestamps remain to fence stale identities. Pending subscription IDs remain only until cancellation is confirmed, then are cleared. These are implementation choices to disclose and review, not a claim that every processor record or backup has been erased.
- Self-service clears Swiper recovery storage on the current browser. Previously exported files and recovery storage on other devices cannot be remotely removed by this application.
- Failed payment cancellation returns a pending state and remains in `account_erasure`. Configure and monitor webhook retries and schedule `pnpm erasure:retry` with production database/payment credentials. That command operates only on accounts already marked for erasure, reports counts and exits nonzero when any selected job remains pending.
