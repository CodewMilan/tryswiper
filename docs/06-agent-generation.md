# Agent Generation Pipeline

## Pipeline

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

Run deterministic checks plus an LLM critic.

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
