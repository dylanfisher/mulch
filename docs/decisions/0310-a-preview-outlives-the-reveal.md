# 0310. A preview outlives the reveal

- **Date:** 2026-09-07
- **Status:** accepted, superseding the second paragraph of
  [0154](0154-a-latched-preview-does-not-outlive-the-reveal.md)

A lane preview, once open, stays open when Option comes up. A peek stays until the pointer leaves
the marker and the popup; a latch stays until the second press, Escape, a press outside or focus
leaving — the dismissals 0154 named, none of which is the modifier. The marker stays mounted for
as long as the preview it anchors is open, and only that: the ring and the `data-automation`
flag are still the reveal's, so the knob under an open preview with Option up is an ordinary
knob, and a drag on it is a plain move.

0154 closed the preview with the reveal so no span dial was reachable over an unarmed knob. The
popup now carries more than the span — the row that draws a lane and the count that redraws it
([0309](0309-a-motion-is-a-lane-drawn-as-if-recorded.md), [0311](0311-a-drawn-lane-is-drawn-again.md))
— and a hand working those cannot hold a modifier for the whole of it. The one thing 0154 leant
on the unmount for, the span drag committing when Option came up mid-drag, is not lost: the drag
goes on and commits where the pointer lets go, which is what every other drag does.
