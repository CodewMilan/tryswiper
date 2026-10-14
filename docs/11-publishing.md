# Publishing

## Architecture

Use a platform adapter interface.

```ts
interface PublishingAdapter {
  validate(post: PublishRequest): Promise<ValidationResult>
  publish(post: PublishRequest): Promise<PublishResult>
  schedule(post: PublishRequest): Promise<ScheduleResult>
  getAnalytics(postId: string): Promise<Analytics>
}
```

## Platform support

Implement platforms independently.

Start with export/manual publishing if direct APIs are unavailable or restricted. Add official platform APIs only after verifying current API capabilities and terms.

The current product implements the first stage: Pro users approve a valid carousel, Swiper creates an idempotent manual publish job, marks the carousel approved, and returns PNG/JPG/PDF downloads. Direct platform adapters and stored OAuth credentials are not enabled yet.

Each preparation records the checked document version. Edits and undo reset draft approval. A retry reuses a job only for the same carousel and version, before checking another allowance; changed content needs a fresh key and validation. Final approval checks the version atomically. Returned download URLs contain `version`; changed drafts return a conflict instead of silently downloading newer unchecked content. Existing unversioned legacy jobs cannot be reused as current approval.

## Publish lifecycle

```text
DRAFT
→ APPROVED
→ SCHEDULED
→ PUBLISHING
→ PUBLISHED
```

Failure:
```text
PUBLISHING → FAILED → RETRY
```

## Idempotency

Every publish job gets an idempotency key.

Retries must not accidentally create duplicate posts.

## Approval

Default workflow:
- agent creates
- user reviews
- user approves
- system publishes

Autopublish can be enabled explicitly per campaign/account.

## Credentials

OAuth tokens must be encrypted at rest and never exposed to the MCP client.
