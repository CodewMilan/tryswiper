# Launch pricing and cost assumptions

Decision date: 14 October 2026. Currency: USD, confirmed by the operator. This is a planning model, not measured profit, a provider invoice or customer willingness-to-pay evidence.

## Offer

| Tier | Monthly price | Carousels | AI credits | Binary exports |
| --- | ---: | ---: | ---: | ---: |
| Free | $0 | 5 | 10 | 20 |
| Pro | $29 | 30 | 50 | 200 |
| Studio | $79 | 100 | 150 | 600 |

Each tier is one workspace, using the same brand/editor/MCP/saved-format workflow. Paid tiers add JPG and higher allowances; Studio is a volume tier, not seats, multiple brand kits, priority support, publishing or an enterprise SLA. Keep monthly billing only until annual products, retention and margins are verified. No invented annual savings or usage overage charges.

Prices and limits share `apps/web/src/lib/plans.ts`. The server meters accepted results and actual downloads. Pro and Studio map to distinct verified Dodo product IDs. No client-submitted price or metadata can select a higher entitlement. Checkout checks the provider product before opening payment: USD, monthly, $29/$79, tax-exclusive, no product discount/PPP/trial. Product mismatches are blocked. Provider setup and live payment certification are still required.

The old unpriced Pro draft limits (100/250/1000) were too generous for a $29 offer under sustained usage. This change defines launch limits; check any real existing customer commitments before deploying a reduction. No live provider prices/contracts were changed here.

## Verified inputs

- The app currently selects Claude Sonnet 4.5 when an Anthropic key exists, otherwise GPT-4.1. [Anthropic's published Sonnet 4.5 rate](https://www.anthropic.com/news/claude-sonnet-4-5) is $3 input / $15 output per million tokens; [GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1) is $2 / $8. Current [Claude pricing documentation](https://platform.claude.com/docs/en/about-claude/pricing) marks Sonnet 4.5 deprecated: certify the intended available model and its current rate before paid launch. This work does not silently migrate models.
- [Dodo pricing](https://dodopayments.com/pricing) lists 4% + $0.40 base processing, +0.5% subscriptions, +1.5% international payments and additional payment-method fees. The model reserves **8% + $0.40** for processing, plus a separate refunds/disputes allowance. PayPal/FX/recovery/payout charges can exceed this reserve; use the actual settlement statement and payment-method mix.
- [Railway](https://railway.com/pricing) charges for resources, not simply a flat subscription. Hosting, database image storage, history, backups, CPU rendering, memory and egress belong in operating cost. The per-workspace allowances below are reserves, not a measured host invoice. The deployment can use another provider; substitute its actual costs.
- [Clerk](https://clerk.com/pricing) includes 50,000 monthly retained users in the current free tier; paid plan/add-on/overage choices can create costs. Swiper uses its own database-backed MCP keys and Dodo billing, so do not also charge the model for Clerk Billing or Clerk machine-key verification that is not used.
- Rendering and uploaded image reuse are local operations. The product does not currently purchase AI-generated images or social publishing services. Domains, email/support, monitoring, backups, tax/accounting and dispute handling remain operating costs even without a per-click API fee.

## Scenarios

Use the more expensive configured Sonnet rate for planning, without assuming caching/batch discounts. A normal full-draft assumption is **4,000 input / 2,000 output tokens = $0.042**. Treat every successful credit as a full draft for this model even though many revisions are cheaper. Add **20% provider waste** for billed failures, races and discarded output. This is a reserve, not an enforced maximum.

Full-allowance contribution model:

| Monthly cost / result | Pro | Studio |
| --- | ---: | ---: |
| Successful AI plus 20% waste | $2.52 | $7.56 |
| Processing reserve: 8% + $0.40 | $2.72 | $6.72 |
| Hosting, database, rendering, storage and backups reserve | $2.00 | $4.00 |
| Support reserve | $1.50 | $3.00 |
| Free-user/acquisition subsidy reserve | $2.00 | $3.00 |
| Refund/dispute reserve | $0.50 | $1.50 |
| Total modeled cost | **$11.24** | **$25.78** |
| Contribution before unallocated overhead/tax/salaries | **$17.76** | **$53.22** |
| Modeled contribution margin | **61.2%** | **67.4%** |

At a deliberately heavy **$0.20 per successful AI credit**, still adding 20% waste and the same other reserves, costs become $20.72/$54.22 and margins become **28.6%/31.4%**. This is a stress scenario, not a guarantee: actual provider attempts, fee mix, retries, support and infrastructure can exceed the assumptions.

Calendar-month allowances and rolling provider billing periods differ. A first paid billing window can span two allowance resets, so short-lived heavy subscribers can exceed one bucket within one payment. Include that acquisition/boundary effect when calibrating reserves; the table above models a steady-state month, not a guaranteed minimum margin for every billing window.

Model inputs now cap the combined system/prompt/serialized output schema at **32 KiB of UTF-8** before contacting a provider. Outputs retain limits of 6,000 draft / 1,200 revision tokens, 60-second timeouts and no SDK retries. Oversized context returns the existing clearly marked local fallback, with no AI credit and no provider call. The byte guard is not an exact tokenizer or monthly spend cap. Existing rate/concurrency limits bound bursts; monitor cumulative provider spend separately.

For illustration only, an additional $60 of unallocated monthly overhead requires about four full-allowance Pro workspaces or two Studio workspaces at the normal modeled contribution. Founder time, marketing spend, corporate tax and exceptional disputes can move break-even substantially. Sales tax is displayed separately at checkout and is not assumed to be operator revenue.

## Calibration before scaling

Measure actual input/output tokens, failed paid provider attempts, export CPU/egress, database/backup growth, free-to-paid mix, disputes and support time. Compare one month's settlement and hosting/provider invoices to these reserves. Full use of Free credits creates real costs without revenue; the subsidy depends on conversion and average usage, and multiple-account abuse is not solved by a pricing card. Revisit free limits or acquisition spend if the reserve is exceeded.

Do not advertise guaranteed margins publicly. No actual paid customer usage, invoice-based margin or demand data was invented. Keep [the beta and release checks](23-beta-and-release-checks.md) open for real evidence.
