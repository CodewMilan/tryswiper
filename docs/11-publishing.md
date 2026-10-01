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
