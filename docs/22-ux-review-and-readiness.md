# UX review and consumer readiness

Reviewed 9 October 2026. The implemented workflow is documented in [How to use Swiper](02-user-flows.md), with an in-product version at `/guide`.

## Product direction

The working audience is creators, founders, and small marketing teams who already use an AI agent. This follows the repository's agent-first product thesis; it is not the result of customer interviews in this session. The primary loop is **brand context → connected agent → editable draft → human review → downloaded post**. Browser generation and manual creation provide an immediate alternative.

The existing product already had structured editable slides, brand-aware generation, deterministic exports, workspace isolation, and a durable autosave outbox. The refinement preserves those strengths and makes the steps, outcomes, and recovery paths visible.

## What changed

| Touchpoint | Friction found | Implemented refinement |
| --- | --- | --- |
| Landing and navigation | Formats linked back to their own section; ambiguous workspace labels; low-contrast hero copy | Formats now lead to creation; Create and Brand kit labels; readable hero text; public guide links |
| First visit | Empty library offered creation without explaining agent-first setup | Getting-started path with progress derived from saved brand details and actual key usage |
| Returning users | Text-only cards were hard to recognize; no search or sort | First-slide previews, slide counts, search, recent/title sorting, no-results recovery; setup collapsed once drafts exist |
| Brand setup | Advanced settings were all exposed; failed loading left an editable default form | Essentials first, advanced voice settings disclosed on demand, retry-only load failure, visible save action, unsaved-edit notice and navigation confirmation |
| Brand uploads | Invalid logo files needed a server round trip | File type and 8 MB checks before uploading |
| Agent setup | Three long configurations were shown together; no obvious first request or proof of connection | Radix client tabs, key copy action, first-prompt copy action, connection status/check, retained one-time-secret templates |
| Client instructions | Hosted Claude, Claude Code, and local Desktop configuration were mixed | Client-specific instructions checked against official references, separate Code and local-process instructions |
| Key management | Revoke immediately removed access | Radix confirmation dialog with consequences, busy state, and retryable errors |
| Browser creation | No explanation of the next screen or allowance cost; brief lost on refresh | Outline and next-step panel, format slide ranges, example briefs, character guidance, per-tab workspace-scoped brief recovery |
| Editor review | Content validation was available to agents but not discoverable in the web export flow | Check carousel in Export, version-aware results, and direct navigation to flagged slides |
| Export | JPG offered a request that Free would reject; generic Your formats link appeared after every notice | JPG upgrade path before requests, clearer file/upload instructions, refreshed usage after download, context-specific format notice |
| Pricing | Failed plan fetch could reject without UI recovery; checkout return assumed payment completion | Network error and retry handling, preserved session state, bounded confirmation polling, manual refresh, aligned plan actions |
| Authentication | Network/SDK errors could strand a callback or account-completion screen | Error handling and sign-in recovery; safe intended destination retained even when browser storage is unavailable |
| Accessibility and navigation | No global skip link or workspace transition fallback | Semantic main targets, skip-to-content link, Radix tabs with keyboard navigation, larger shared buttons, loading skeleton and page error recovery |
| Mobile | Longer workspace navigation labels overflowed narrow screens | Navigation can wrap; verified no page overflow at the tested widths |

## Design system

The UI keeps the existing neutral surfaces, orange accent, bundled typography, rounded panels, and Phosphor icons. It uses the project's Tailwind 4 and component styling rather than migrating frameworks. Added `@radix-ui/react-tabs` supplies tab semantics and keyboard behavior; existing Radix Dialog supplies focus-managed confirmations. Framer Motion remains the existing motion library, with reduced-motion behavior retained.

[Radix's Tabs reference](https://www.radix-ui.com/primitives/docs/components/tabs) informed the component implementation. The important changes are hierarchy, progressive disclosure, consistent controls, clear feedback, and fewer dead ends.

## Quality assessment

These are qualitative reviewer scores, not measured usability-study results or accessibility certification.

| Dimension | Score | Evidence and limit |
| --- | ---: | --- |
| Onboarding | 8/10 | Setup progress and a first prompt are visible; manual client configuration still takes effort |
| Core experience | 8/10 | Browser creation, editing, reusable formats, and actual downloads exercised end to end; hosted client generation not smoke-tested |
| Error handling | 8/10 | Brand load recovery, brief retention, autosave retry/conflict recovery, and plan gates tested; real identity-provider failures need live verification |
| Information architecture | 8/10 | Clear workspace destinations, searchable library, returning-user setup collapse, and a public usage guide |
| Visual polish | 8/10 | Screens inspected and responsive overflow checked at phone, tablet, and desktop widths; no separate visual-regression baseline |
| Performance | 6/10 | Skeletons, responsive local actions, and fewer simultaneous setup panels; no production latency or load benchmark |
| Accessibility | 7/10 | Keyboard tabs, focus-managed dialogs, labels, live feedback, skip navigation; comprehensive screen-reader and contrast audit still outstanding |
| Feature completeness | 7/10 | Core create/edit/export loop works; social publishing, redo, self-service account/billing management, and recovery import remain outside the implemented loop |
| Overall | 7.5/10 | Suitable for further beta validation; public launch depends on the remaining checks below |

## Verification

- Workspace TypeScript checks and ESLint.
- Six schema tests and eight rendering tests, including real PNG, JPG, PDF, uploaded-image, font, and logo rendering.
- Browser tests covering generation, editing gestures, undo, autosave refresh recovery, stale-write rejection, workspace isolation, formats, actual downloads, quotas, deletion, client configuration/clipboard behavior, Free/Pro handoff, references, and guest/member navigation.
- Added coverage for onboarding progress, brand-load retry, unsaved-edit confirmation, brief restoration and keyboard tabs, searchable library/previews, guide content, copy checks with slide recovery, and authentication recovery with safe destinations.
- Responsive assertions and screenshot inspection for 375 px, tablet widths, and desktop widths.
- Production compilation verified using Next's Webpack build. The default Turbopack build cannot bind its CSS worker port in this execution environment, including after an escalation attempt. This is an environment limitation; validate the default `pnpm build` in CI or the deployment container.

Local browser tests use synthetic users and the existing localhost-only test session. The root omits the real Clerk client only for this fixture mode; the production API authentication rules are unchanged. These tests do not certify live OAuth or payment completion.

## Remaining launch work

| Priority | Work | Release evidence needed |
| --- | --- | --- |
| Before public launch | Live Google and GitHub sign-in | New and returning users, intended-page redirect, missing-name completion, provider/network failure recovery on the public domain |
| Before public launch | Hosted client connections | A real key creates and edits a carousel from Cursor, Claude, and ChatGPT against public HTTPS, then revocation removes access |
| Before paid launch | Payment and subscription lifecycle | Price label matches the Dodo product; successful, failed, pending, canceled, and renewed payments update plan limits correctly; a documented cancellation/support path exists |
| Before public launch | Privacy, terms, and customer support | Publish operator-approved policies and a working support destination; these were not invented as part of the UI refinement |
| Before public launch | Live copy quality and latency | Representative briefs generated with the intended AI provider, verified claims, measured first-draft/export times, and recovery from provider failures |
| Before public launch | Production release checks | Default build in CI/container, migration, health check, HTTPS, backups, and realistic rendering concurrency |
| Before general availability | Accessibility pass | Screen-reader, keyboard, contrast, zoom, and touch checks on the live screens; include the real account menu and authentication provider |
| Subsequent iteration | Self-service account and billing controls | Account deletion/export and subscription management appropriate to the released plans |
| Subsequent iteration | Recovery/import and richer history | User-facing import of recovery JSON and redo/history, if required by beta users |

There is no automatic social publishing, scheduling, or analytics in this release. The workflow and copy describe manual sharing. Brand edits apply to new drafts; saved formats retain their saved content. The browser's back/forward navigation is not intercepted by the unsaved-brand link guard. Unfinished browser briefs are per-tab recovery, not server drafts. Generation is a synchronous request rather than a restart-safe background job.

## Beta usability check

Give a first-time user a product description and ask them to create one carousel without coaching. Observe whether they can find setup, connect their preferred client or choose browser creation, open the editor, make a correction, download the right file, and understand how to post it. Measure completion and time to first reviewed download. Use that evidence to prioritize the next iteration rather than treating these reviewer scores as customer validation.

## Follow-up — 14 October 2026

The assessment above records the earlier review. Subsequent audit repairs added faithful recovery import, preservation of manual edits during single-slide revisions, typed/versioned MCP edits, saved-format generation, model-visible previews, protected file resources, asset cleanup, bounded history/storage/concurrency and local product metrics. The browser now combines checking and handoff in Export; Pro's value is higher limits and JPG. A session-only billing portal and support/operator information are implemented. The shared account-menu view has keyboard and synthetic signed-in coverage.

These changes supersede the older missing-feature statements about recovery import and subscription management. Redo, account-deletion policy, live provider/host certification and real customer validation remain open. Use [the dated beta and release protocol](23-beta-and-release-checks.md) for the current gates; the earlier qualitative scores are not newly measured beta results.
