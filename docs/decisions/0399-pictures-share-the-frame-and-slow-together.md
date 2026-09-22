# 0399 — Pictures share the frame, and slow together past a few

- **Date:** 2026-09-22
- **Status:** accepted, amending [0284](0284-a-long-chain-paints-half-as-often.md) for the cadence
  a picture is asked at, and answering candidate (c) of the Step 18 reading in plan §4.

**At most `pace.perFrame` pictures paint inside one frame.** Every picture keeps its cadence on its
own budget (`paced`), so seven yards on one cadence come due on the same frame and spend seven
picture-sized paintings on it. That was the 69.6 ms p95 at seven yards. The budget now asks for a
share of the frame as well as its gap (`perFrame`, src/ui/frame.ts). A picture that is due but gets
no share stands, and paints on the next frame. The count is a tunable at 2.

**Past `pace.strips` animating, each picture is painted in proportion less often, down to
`pace.loadHz`.** The count is of animating pictures, the page's and not a yard's
(`standUp`, src/ui/driftTiles.ts). A paused yard holds its frame and costs nobody's cadence.
It is counted and not timed, for 0284's reason: a clock would slow the picture for whatever else the
machine did that second. The stretch is also what makes the share fair. At the whole rate, eight
pictures want more paintings a second than two a frame gives, and the first asked would always win.

**The tile shops guard a round of paintings, not the last two.** Every canvas's painting is a
generation of one shop. With seven pictures, a tile guarded for two generations was evicted before
its own picture came round again, and was rebaked every round with nothing touched. The guard is now
two paintings for every picture animating (`wantedLately`, src/ui/driftTiles.ts). It is counted by
pictures and not timed: a guard of every painting in a window grows with the paint rate, and lets a
fast picture hold whole-picture tiles far past the cap. This amends [0144](0144-the-picture-may-fall-behind-the-hand-may-not.md)'s
cap reasoning only: the cap still evicts whatever no picture is using.

**Refused:** only the focused yard animating, and a fold taking the picture with it (candidates (b)
and (a)). Each yard's picture still moves. It moves less often when there are many.
