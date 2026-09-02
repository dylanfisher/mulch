# 0276 — The ground bench asks how it moves, in words and not numbers

- **Date:** 2026-09-01
- **Status:** accepted, extending [0255](0255-the-ground-and-the-arrangement-have-their-own-benches.md) under [0254](0254-the-bench-argues-the-card-fold-by-fold.md)'s rule

**Which Ground is two questions, and the bench now asks both.** The eight readings of 0255's
successor ask _when_ the ground moves. Six new ones above them ask _what it does_ — whether the
loop moves on its own, how far, which way, and whether its own boundary grows or shrinks — which
is what the fold's Distance, Lean and Home dials say in numbers, plus the one fact they cannot
say at all.

**Every reading says four facts and no number.** A nudge, a bed, anywhere; back, either way, on;
shrinks, holds, grows; wanders or stays put. The bet is that a hand asks for "a little" or "a lot"
and never for twenty-three sixteenths, so three named reaches _are_ the amount. What the six
disagree about is only what the control is: a gesture on the picture (a leash, a puck on a pad, a
fence), or the words themselves (a sentence, a switchboard), with the tide standing for the one
fact that has no dial yet. Each draws the same next three windows off `windowsAhead`, so the
setting is seen as what it does and six pictures show one future.

**The stage is one for both benches.** `SketchGroundStage` became `SketchStage` with a `bench`
prop, and a `usePointOn` hook beside it reads a hand's place in the pinned box — the mechanism
0255 wrote for a chip drag, kept once. `sketchMove.ts` holds every gesture's reading and the
windows ahead, and `sketchMove.test.ts` pins them, because a static render never drags. The
cleared id `sentence` is reused by the move bench's own sentence, which is a different argument.
