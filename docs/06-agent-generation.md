# Agent Generation Pipeline

## Implemented pipeline and boundaries

The diagram below is a design target. The current server loads owned brand/format context, asks the configured model for typed copy, renders into the supported document schema, and runs deterministic checks. It does not automatically create image assets, run a second LLM critic, or iterate repairs until a draft is approved. Users/agents review native previews and decide corrections. Saved-format generation keeps design/assets and changes semantic copy slots; single-slide revision changes current target text only.

Model calls have 60-second budgets with retries disabled. Invalid output or provider failure returns a visibly marked local scaffold without an AI credit. Durable request IDs recover committed results and prevent duplicate creation/revision; in-flight work is synchronous, not a restart-safe background queue.

## Intended pipeline

```text
Brief
 ↓
Understand product
 ↓
Choose narrative
 ↓
Choose format
 ↓
Create outline
 ↓
Generate slide copy
 ↓
Assign visual treatment
 ↓
Attach/create assets
 ↓
Validate
 ↓
Render
 ↓
Critique
 ↓
Repair
 ↓
Return
```

## Separate reasoning from rendering

The model should decide:
- audience
- promise
- hook
- narrative
- proof
- CTA
- slide content
- visual intent

The renderer decides:
- exact coordinates
- typography
- safe areas
- image cropping
- export dimensions

## Generation stages

### 1. Product context

Build a compact product context:
- product name
- category
- target user
- problem
- differentiator
- proof
- CTA
- forbidden claims

### 2. Narrative

Select a format such as:
- problem → insight → solution
- listicle → examples → CTA
- misconception → explanation → product
- story → lesson → product
- before → after
- comparison
- tutorial
- teardown
- founder story

### 3. Copy

Every slide should have one primary job.

Avoid:
- walls of text
- generic AI phrases
- repetitive claims
- fake social proof
- unsupported statistics

### 4. Visual plan

Each slide gets:
- layout
- hierarchy
- media type
- background treatment
- emphasis words
- optional annotation

### 5. Critique

Run deterministic checks. A separate LLM critic is a future option, not implemented.

Checks:
- text overflow
- missing assets
- low contrast
- duplicate content
- weak hook
- unclear CTA
- unsupported claims
- inconsistent brand usage

### 6. Repair

Regenerate only the failed component where possible. Do not regenerate the entire carousel for a one-slide problem.

## Quality target

The system should optimize for:
- clarity
- curiosity
- narrative coherence
- visual hierarchy
- product relevance
- originality
- brand consistency
- factual integrity
