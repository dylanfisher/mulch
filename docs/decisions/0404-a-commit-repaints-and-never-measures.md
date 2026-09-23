# 0404 — A commit repaints a canvas and never measures it

- **Date:** 2026-09-22
- **Status:** accepted

**A new `paint` repaints with the size and colour the canvas already holds** (`useCanvasSurface`,
src/ui/canvasSurface.ts). Reading the element's size and its computed colour both force a layout,
and a drag commits a new `paint` on nearly every pointer move. The canvas measures on mount, when
its element resizes, when the display's density or scheme flips, and when an explicit theme choice
renders — and at no other time.

**So a canvas's size and colour move only through those four.** A surface that changed its canvas's
`text-*` class from a prop would keep drawing in the old colour: give it a watcher of its own, or
remount it.
