# User Flows

## Flow A: First carousel

Landing page → Sign up → Create workspace → Brand setup → Create project → Describe product → Select format → Generate → Review → Edit → Export.

## Flow B: Agent-driven creation

User connects Swiper MCP to an AI client.

User:
> Make a carousel explaining why our product is different from traditional solutions.

Agent:
1. Reads available brand context.
2. Selects a suitable format.
3. Creates a carousel.
4. Creates or requests assets.
5. Writes slides.
6. Runs quality checks.
7. Returns a project link.

User can continue:
- Make slide 1 shorter.
- Change the CTA.
- Make the tone more founder-like.
- Add one proof point.
- Replace the image.
- Reorder slides.

## Flow C: Reference a viral format

User provides a public post URL or manually describes a format.

System extracts only structural characteristics where permitted:
- slide count
- narrative pattern
- hook style
- pacing
- visual hierarchy
- CTA placement

Swiper creates an original adaptation. It must not blindly copy protected creative assets or text.

## Flow D: Review and export

Draft → quality check → user edits → preview → export PNG/JPG/PDF → download/share.

## Flow E: Publish

Draft → approval → platform-specific validation → schedule → publish job → result → analytics.

Publishing must be idempotent and retryable.

## Failure states

Every flow needs explicit UI for:
- generation failed
- asset generation failed
- export failed
- account disconnected
- rate limit reached
- platform rejected post
- invalid slide
- unsupported format
