# 0403 — A picture scrolled off screen stands, and paints the moment it is back

- **Date:** 2026-09-22
- **Status:** accepted, amending [0399](0399-pictures-share-the-frame-and-slow-together.md)'s
  count of pictures animating

**A drift picture whose canvas is off screen is not animated and not counted.** An
`IntersectionObserver` on the picture's root says when it leaves and comes back (`observeShown`,
src/ui/canvasSurface.ts), asked of the window the canvas is in (0138). Off screen, the picture takes
no frame subscription and no `standUp`, so it paints for nobody and does not slow the pictures
that are seen. A tile landing or a tuning moving does not paint it either (`useDriftSurface`,
src/ui/driftSurface.ts).

**Coming back, it paints at once and past the frame's share** (`repaintStale`). What the canvas
holds is the frame it was left at, and a refused share would show that frame. The observer's
margin is a quarter of the viewport, so the paint lands before the canvas is in view. Nothing
drifts across the gap: every phase is read off the deck's position, and every travel arrives at its
reading across any gap (`refill`, src/ui/MoireStrip.tsx), as a strip under its own overlay already
did.

**This is not 0399's refused candidate (b).** Every yard on screen still animates. Only a yard
nobody can see stands.
