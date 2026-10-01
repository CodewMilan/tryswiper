# Product Specification

## One sentence

Swiper lets an AI agent turn a product, idea, or brief into a polished social carousel that can be edited, approved, exported, and eventually published.

## Problem

AI can generate copy, but a useful social post requires more than text. It needs a visual hierarchy, pacing, slide-level narrative, design consistency, a strong opening, and a clear but non-desperate product transition.

Users currently stitch these steps together manually across ChatGPT, Canva/Figma, image tools, and social platforms.

## Product promise

Describe the post you want. Swiper gives your agent the tools to build the actual carousel.

## Core objects

- Workspace
- User
- Brand
- Project
- Carousel
- Slide
- Template
- Asset
- Campaign
- Publish job
- Social account
- Analytics event

## MVP success criteria

A new user should be able to:

1. Sign in.
2. Create a workspace.
3. Add a product/site description.
4. Define brand colors, fonts, logo and tone.
5. Connect an AI agent through MCP.
6. Ask the agent for a carousel.
7. Watch the carousel appear in the editor.
8. Edit any slide manually.
9. Export the final carousel.
10. Save it as a reusable format.

## Product principles

### Agent-first

The agent is a first-class user of the system. Every important editor action should have an equivalent machine-readable operation.

### Human approval

Generated content is editable and reviewable. Automation should never remove user control.

### Structured output

AI should produce a typed carousel document, not a blob of HTML or an image that cannot be edited.

### Deterministic rendering

The same carousel document should render consistently in the editor and export pipeline.

### Format over randomness

Templates encode proven structural patterns. Generation should adapt a format to the user's product rather than inventing a layout every time.

## Non-goals for MVP

- Full Canva replacement
- Full social media management suite
- General-purpose video editor
- Autonomous posting without explicit user configuration
- Training a proprietary foundation model
