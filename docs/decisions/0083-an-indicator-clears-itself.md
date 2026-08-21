# 0083. An indicator clears itself

- **Date:** 2026-08-20
- **Status:** accepted

The master clip indicator latched on the first peak at full scale and stayed lit until it was
pressed. A latch existed because nobody is watching the meter at the instant a peak arrives — but a
signal that never clears itself stops being about now, and the second time somebody sees it they
cannot tell whether it means the last bar or the last hour.

A signal gains a wait long enough to be read and short enough to still be true. The toast's was
never a defect — Base UI's provider dismisses at 5s unless told otherwise — but it was a number
this repo had not said, so it is now one: `TOAST_TIMEOUT_MS` in `src/ui/App.tsx`, at the one
provider every surface that says a finished thing goes through, with the close control for sooner.
A wait that matters is declared where it is owned rather than inherited from a dependency. The
clip indicator holds for `CLIP_HOLD_MS` after the peak that lit it, goes dark, and is re-lit from
the later peak rather than the first, with the press that clears it kept for someone who has
already seen it.

The frame loop lights it and does not darken it. `createClipHold` takes the peak the loop already
reads and arms one timeout; a later peak re-arms that same timeout rather than adding another, and
the attribute is written only on the edges, so a clipping passage costs one DOM write and no
allocation per frame (0070). Nothing about the hold is React state and nothing about it is
scheduled while the bus is under full scale.

The decay is off the loop because the loop is shorter-lived than the hold. It runs only while
something is sounding and lets go `SETTLE_FRAMES` — about a tenth of a second — after the last
sound, while the hold is a couple of seconds long, so a decay written from the loop would have to
keep the loop running over a silent page to reach the end of its own hold. Measured, that is 133
frames where an idle page ran 9: per-frame cost, on every page that ever peaked, bought for a fact
that changes twice. `framesUntilSettled` in the test runs those frames rather than arguing about
them, and fails if a clip ever buys the loop another frame of life. One timeout per peak is the
cheaper half of that trade, and "never a second timer per frame" is satisfied by there being no
timer per frame at all.
