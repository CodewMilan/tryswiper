# Editor Specification

## Goal

The editor is the visual source of truth for a carousel.

## Layout

Left:
- slide navigator

Center:
- canvas

Right:
- selected element inspector

Top:
- project name
- undo/redo
- preview
- export
- publish
- save status

## Required interactions

- select element
- move
- resize
- edit text
- change font
- change color
- upload asset
- replace asset
- duplicate slide
- delete slide
- reorder slides
- add slide
- change layout
- undo/redo
- preview
- zoom

## Agent activity

Show agent actions in a lightweight activity panel:

`Swiper Agent changed Slide 3 headline`

Users can undo agent changes as a group.

## Collaboration

MVP: optimistic local editing + server persistence.

Later:
- realtime collaboration
- presence
- comments
- multiplayer cursor

## Performance

Do not rerender the entire editor on every property change.

Use normalized client state and selective rendering.

## Accessibility

Keyboard navigation, accessible controls, visible focus, semantic labels, and readable contrast are required for the editor UI.
