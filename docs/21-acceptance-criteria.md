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
- Undo/redo works.
- Autosave recovers after refresh.

## Reliability

- Generation jobs survive worker restarts.
- Publishing jobs are idempotent.
- Failed jobs expose actionable errors.
- Database migrations are reproducible.

## Quality

- Generated carousels do not contain unsupported claims.
- Text does not overflow.
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
