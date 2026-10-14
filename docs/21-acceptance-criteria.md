# Acceptance Criteria

## Product

- A new user understands the product within one screen.
- A carousel can be created without an AI connection.
- An agent can create a carousel through MCP.
- Agent-created content is editable.
- A user can export a carousel.
- Brand settings consistently affect generated output.

## MCP

- Authenticated clients can list projects.
- Clients can create a carousel.
- Clients can modify individual slides.
- Clients can regenerate individual slides.
- Clients can validate a carousel.
- Clients can request a preview/export.
- Unauthorized workspaces are inaccessible.

## Editor

- Text can be edited.
- Elements can be moved and resized.
- Slides can be reordered.
- Assets can be replaced.
- Undo restores retained saved snapshots; redo is not implemented.
- Autosave recovers after refresh.

## Reliability

- Committed generation results can be recovered and retried without duplication. In-flight synchronous model work is not a restart-safe background job.
- Identical creation/revision retries are idempotent; legacy manual preparation binds approval to the checked version.
- Failed jobs expose actionable errors.
- Database migrations are reproducible.

## Quality

- Automated heuristics flag known unsupported-claim patterns; users verify every factual claim.
- Native export measurements flag clipping and unsupported visuals; users review the rendered result.
- Images are not stretched incorrectly.
- Templates produce structurally coherent stories.
- Product CTAs are relevant.

## Definition of done

A feature is not done until:
1. typed implementation exists
2. authorization exists
3. tests exist
4. loading/error states exist
5. logs exist
6. documentation is updated
7. production configuration is documented

Public and paid release require dated live evidence in [the release checklist](23-beta-and-release-checks.md), in addition to local regression tests.
