# 0358 — A landing costs the stamp nothing, and a part change costs one tile a canvas

2026-09-11. Checkpoint B of the block that plays the lattice (docs/plan.md §1).

## What was measured

The budget's setting: the picture popped out (0138) into a real window of 2560 × 1440 CSS pixels at
two device pixels each — a canvas 5120 × 2880 — a full rack (eq, panner, sway, two automators, a
full-wet reverb) on two yards, headed Chromium on the real GPU, `--mute-audio`, eight-second windows
after an eight-second settle. **Base is `8bfff65`, checkpoint A2's commit, and not checkpoint A's,
which is what the entry's own words asked for**: A2 landed between A and step 6, so A2 is the tree
that isolates steps 6, 7 and 8 and A would have measured 0354's own move a second time. The head
figures below are therefore not comparable to 0353's (86–88 frames a second); they are comparable to
0354's. Base was stood up in a `git worktree` with a Vite dev server of its own that this run
started and stopped; head is the working tree. Base and head interleaved, with a run of head at no landing and a run of head at a section changing every
two seconds beside each pair. The attribution is per-function accumulators compiled identically into
both trees and taken out before the gate, beside a `longtask` observer and a rAF-gap histogram —
the CDP `Profiler` still wedges the renderer at this setting (0353).

|                             | base, landing | head, landing | head, no landing | head, part changing |
| --------------------------- | ------------- | ------------- | ---------------- | ------------------- |
| frames a second             | 120.1 / 120.1 | 120.1         | 120.0 / 120.1    | 119.9               |
| rAF gap p95 / worst         | 9.2 / 10.4    | 9.2 / 10.4    | 9.2 / 10.4       | 9.2 / 10.3          |
| gaps over 20 ms, over 50 ms | 0 / 0         | 0 / 0         | 0 / 0            | 0 / 0               |
| long tasks                  | **0**         | **0**         | **0**            | **0**               |
| paintings, mean / worst ms  | 270, 1.53/2.8 | 269, 1.53/2.7 | 273, 1.51/2.9    | 270, **1.89**/3.2   |
| the stamp, mean ms          | 0.863         | 0.858         | 0.851            | **1.196**           |
| the lift, mean ms           | —             | **0.0004**    | 0.0000           | 0.0007              |
| bakes, mean / worst ms      | 72, 42.8/109  | 72, 43.6/112  | 71, 61.0/163     | **78**, 45.7/127    |
| a knob drag, frames dropped | 36 / 38       | 22            | 26 / 507         | 18                  |

**A landing costs the frame nothing that can be measured.** Head under a landing every 125 ms paints
in 1.53 ms, which is base's 1.53 ms and its own 1.51 ms with no landing at all; the lift itself is
four ten-thousandths of a millisecond, three orders under the stamp it is inside. The gate's own
count says why: the lift is `CELL_PUSHES` fills on the boxed read, one pixel a cell, before a band is
cut — so a frame at a landing's edge pays **the picture-sized draws a frame with no landing pays**,
which is `STAMP_PICTURE_DRAWS` and no more.

**A landing does not put the bake back on the frame.** The push is spent after the tile, on the read
the stamp thresholds, and reaches no field of the key a tile is held under — so no rung of a bake is
anything a frame waits for, and the bake count under a landing is base's count exactly.

**A part change costs one tile a canvas, and 0.34 ms a painting while it lands.** At a section
changing every two seconds — fast for a song, though **not the fastest the player allows**:
`PLAYER_PART_MIN` is one jump, so a part can change on the walk's own step — the paintings cost
1.89 ms against 1.53, and all of it is in the stamp: `readMarks` mints the alphabet's ten mark tiles
on the frame that first needs them, and the ten `sheetOf` blits after a mint are laying surfaces the
engine has not seen before. Across the window that is about **a tenth of a second** of extra
frame-side work for its four part changes, spread over the paintings after each and never one task —
no long task and no gap over 20 ms in any run. The bakes are 78 against 72: **one tile a canvas per
change and not one a painting**, because the shop holds the key in flight and the canvas draws the
section it was standing on until the new one lands; and the section it left is still held, so a song
coming back round pays nothing at all. The ten fresh keys the checkpoint's entry feared are one key
a canvas, the alphabet being one field of it.

## What this decides

**Nothing is landed as a lever, because the numbers name nothing to lever.** What is landed is the
two booleans a checkpoint leaves behind: a frame at a landing's edge pays the picture-sized draws of
a frame with no landing (`src/ui/moireCanvasMarks.test.ts`), and a part change is one tile a canvas
whose predecessor is still held, so a song coming back round bakes nothing
(`src/ui/moireScreenAlphabet.test.ts`, where 0356 already asserts the first half through the key
`screenOf` actually writes — a second case against a key a test composes for itself would have been
the same fact restated). Both are counts, which is what the gate can keep; the timings above are the
profiler's and are kept here, because the gate counts things and the profiler measures them (0050).

**The mint stays on the frame.** Moving the ten mark tiles off it would be a cache keyed on the bit,
the ink and the alphabet, held across canvases, for a third of a millisecond a painting that neither
a gap nor a long task shows at the budget's own window size. Principle 4 and the budget's own
sentence — a cost is a lever when the numbers say so — leave it where it is, and this record is
where the next hand looks when a section change is felt.

**The tile bake still stands over the budget.** 42.7 to 46.1 ms mean and 109 to 127 ms worst
against 4 and 8, base and head alike — with **one head run at 61.0 ms mean and 163 ms worst**, a run
with no landing at all and so with nothing of this step in it, which is the bake's own queueing
noise and not a term anything here moved. Where 0354 left it, in a worker on a path no gesture
awaits. Nothing in steps 6 to 8 touched it, and step 18 still owns it.

**And the knob drag still drops frames, fewer at head than at base.** At 120 frames a second a gap
over 20 ms is a frame dropped, and the drag beside the popped picture dropped **36 and 38 at base
against 18, 22 and 26 at head**, none of them over 50 ms in either tree. So the budget's fourth
number — a drag that drops none — is **not met**, at base as much as at head; what this checkpoint
can say is that steps 6 to 8 did not make it worse. (One head run dropped 507, on a drag taken while
the machine dipped; its own eight-second window is clean and is the row above.)

## What the machine could not say

This machine's **audio output device is gone** — the same fact 0354 recorded, and the reason
`./scripts/check`'s `drive` step is red at base. Three things were therefore driven by hand,
identically in both trees, and the report of this checkpoint names each:

- **The frame loop.** Without a deck that reaches `playing` the picture paints on commits, so the
  paintings a playing yard drives were driven by the measurement instead. The accumulators count
  every canvas the opener draws — the popped picture, and the strip of the yard that did not pop —
  so the **267 to 273 paintings** in an eight-second window are their sum and not one canvas's own
  cadence, which `DRIFT_PAINT_HZ` caps at 24 a second apiece. The same count on both sides, which is
  what makes the per-painting means comparable.
- **The landing.** A strike every 125 ms at a level cycling a quarter to one, its centre stepping an
  eighth of the picture each time, fed in where `joltWalked` is read.
- **The part change and the rebakes.** The alphabet cycled among its three names every two seconds,
  and the rack's reading walked three times a second through one tunable, which put 72 bakes in every
  window on both sides.

And one thing that leaves unmeasured: **the fall**. The step the pushes decay on is the master
clock's elapsed, which is stuck, so every landing taken up stays up and the ring is four live pushes
for the whole window. That makes the measurement the **most** a lift can cost and not its average —
which is the right way round for a budget — but it says nothing about whether the flare reads as a
fall. plan §4 already holds that, from 0355.

## What this is not

Not a governor and not a change to what the picture says: no file under `src/` that the picture is
drawn through was edited by this checkpoint at all. And not a reading taken on a steady machine —
the machine drifted six-fold under memory pressure across the runs, and every degraded run degraded
at base too, which is why the numbers above are the runs where base and head both stood at 120
frames a second and why the attribution is read from head against head as well as head against base.
