# 0147 — The loop lands where the hand let go

- **Date:** 2026-08-24
- **Status:** accepted; amends [0053](0053-a-loop-is-dragged-by-its-handles.md) and supersedes
  [0066](0066-shift-is-the-loop.md), which it removes rather than narrows.
  [0114](0114-a-capture-lost-is-a-gesture-over.md) and
  [0123](0123-a-release-is-a-position.md) stand unchanged and were both refuted as causes.

A gesture on a deck's peaks is one gesture, decided on release: it travelled far enough to be a
drag and drew a span, so it is a `deck.loop` from the press to the release; or it did not, so it
is the `deck.seek` its press asked for. There is no modifier, the press commits nothing, and
there is no third outcome — every press whose release the page sees is answered. A release nobody
saw still commits nothing at all, which is [0114](0114-a-capture-lost-is-a-gesture-over.md) and
the one thing the press used to slip past by seeking before the gesture was over.

Snapping starts off. It stays as the toggle beside the peaks and does exactly what it did; it is
simply not what the instrument does to a person who never asked for it.

**Why it took five attempts.** Four decisions and four passing browser scenarios covered this
surface while it was still wrong in the hand. Reproduced in `./scripts/drive` as a person
performs the gesture, three defects were real and each was a _rule_ rather than a bug:

- Snapping was on by default and pulled each edge up to `SNAP_TOLERANCE_PX` = 10px onto an onset
  candidate that nothing on the page draws. A sweep aimed at 0.4916–1.5084s committed
  0.5000–1.5000s. The correction was drawn — the draft and the overlay both show the snapped
  position while the button is down — but its _cause_ was not, so the surface read as one that
  would not follow the hand. And it was intermittent by construction: the same-looking gesture
  aimed 15px from a candidate lands exactly where it was let go, which is the "isn't consistent"
  in the complaint.
- `event.shiftKey` was read once, at `pointerdown`, and the seek was sent from there. Shift then
  press swept; press then Shift seeked — one gesture in the hand, two outcomes, one of them
  moving the playhead. Confirmed: the playhead went from unset to 0.5s and no loop was made.
- A gesture under `MIN_DRAG_PX` = 4 returned without committing and without saying anything, so a
  short loop, a Shift-click and a dead surface were the same thing.

`scripts/smoke.d/sweep.js` aimed at `onset ± SNAP_TOLERANCE_PX / 2` and asserted the onset. That
is a test agreeing with the implementation rather than with the gesture, and it is why four
attempts could each end green. Every loop scenario now aims where a person aims and asserts the
second the pointer was let go at.

**What was taken away, and nothing was added.** The modifier is gone. The seek-on-press path is
gone. The two silent returns are gone: a gesture that drew no loop seeks. `MIN_DRAG_PX` survives
as the one thing that tells the two apart, and it is no longer silent in either direction —
below it you get the seek, above it the draft that the release will commit. The draft is painted
from the same predicate the release reads, so what is on screen while the button is down _is_
what letting go does.

The strip's own 4px deadzone was left alone deliberately: it is visible (the overlay does not
move either) rather than silent, and removing it would make every press on a handle a durable
`deck.loop` identical to the one already set.
