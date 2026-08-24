# 0066. Shift is the loop, and the snap is the toggle's alone

- **Date:** 2026-08-16
- **Status:** superseded by [0147](0147-the-loop-lands-where-the-hand-let-go.md), which removes the
  modifier entirely — a drag on the peaks sweeps and a press seeks, both decided on release. Its
  other half stands: the Snap toggle is still the deck's one declaration of whether edges land on
  onsets, and it now starts off. So do the two the peaks still show: the IN and OUT handles draw
  their boundary down through the peaks in the loop's own colour token, and the readout beside the
  Snap toggle advertises the gesture whether or not analysis has answered. Amended [0053](0053-a-loop-is-dragged-by-its-handles.md)

Shift means one thing on a deck's timeline — its handle strip and its peaks: address the loop. (On a knob it is still the fine-drag scale, which is a different control and not a gesture on the timeline.) Holding it and dragging on the peaks sweeps a loop from the press to the release — one `deck.loop` on release, snapped by the same analysis and the same `MIN_DRAG_PX` a handle drag obeys, creating the loop if the deck had none — so a boundary can be taken anywhere on the surface and not only from the strip; a press with no Shift is still a `deck.seek` and nothing else (0041, 0053). Shift therefore stops meaning "override the snap" during a handle drag: the Snap toggle beside the peaks was already the deck's one declaration of whether edges land on onsets, and a modifier that overrode it was a second, undiscoverable copy of that choice — the waveform's own readout now advertises the surviving meaning instead. The IN and OUT handles draw the boundary they hold down through the peaks in the loop's own colour token, so the strip and the waveform can never disagree about where an edge is.
