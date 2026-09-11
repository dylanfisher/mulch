# 0365 — A knob turned is a fill, and only the ink's own ladder is a bake

2026-09-11. Checkpoint C of the block that plays the lattice (docs/plan.md §1).

## What was measured

The budget's setting: the picture popped out (0138) into a real window of 2560 × 1440 CSS pixels at
two device pixels each — a canvas measured at 5120 × 2880 — a full rack (eq, panner, sway, two
automators on `auto.stays` 5, a full-wet reverb) on two yards, headed Chromium on the real GPU,
every launch `--mute-audio`, eight-second windows after an eight-second settle. Base is `0fbbbd5`,
checkpoint B's commit, stood up in a `git worktree` with a Vite dev server of its own on a port and
a cache dir this run started and removed; head is the working tree. Base and head **interleaved**,
three pairs.

**The audio device came back.** 0354's and 0358's stall is gone — a headless `AudioContext` on
`about:blank` reads 0.789 s after 800 ms of wall clock — so unlike every earlier checkpoint in this
block **the walk was really playing**: the deck clock ran, the landings landed, the sparks flashed
and the ground crawled, all on the player's own schedule and nothing driven by hand. The
attribution is still per-function accumulators compiled identically into both trees and taken out
before the gate, beside a `longtask` observer and a rAF-gap histogram; the CDP `Profiler` still
wedges the renderer at this setting (0353).

The machine's display switched between 120 Hz and 60 Hz across the session, which is why the frame
rates below come in two families. Interleaving is what makes them readable: every conclusion here
is drawn from a base and a head run taken minutes apart, never from all of one and then all of the
other.

|                            | base ×3               | head ×3               |
| -------------------------- | --------------------- | --------------------- |
| frames a second            | 115.3 / 109.5 / 60.1  | 107.3 / 60.0 / 109.7  |
| rAF gap p95                | 10.3 / 9.3 / 17.6     | 10.3 / 17.5 / 9.3     |
| rAF gap worst              | 26.7 / 33.5 / 17.7    | 34.9 / 34.0 / 40.9    |
| gaps over 50 ms            | **0 / 0 / 0**         | **0 / 0 / 0**         |
| long tasks                 | **0 / 0 / 0**         | **0 / 0 / 0**         |
| paintings, mean ms         | 1.78 / 1.85 / 1.80    | 1.75 / 1.97 / 1.92    |
| the stamp, mean ms         | 0.986 / 1.055 / 1.011 | 0.991 / 1.106 / 1.078 |
| the cut, mean ms           | 0.581 / 0.579 / 0.568 | 0.552 / 0.611 / 0.596 |
| bakes in the window        | **0 / 0 / 0**         | **0 / 0 / 0**         |
| 480 moves, gaps over 20 ms | 36 / 5 / 0            | 33 / 11 / 4           |
| 480 moves, bakes           | **0 / 0 / 0**         | **0 / 0 / 0**         |

**Nothing rebakes.** At the budget's own setting, with a full rack on two yards and the walk
playing, the screen tile is baked during the settle and never again — zero bakes in every
eight-second window, base and head alike, and zero across a 480-move drag on the panner's own
Position. A bake time therefore has no sample here at all, so it was taken separately, with one
tunable on the stamp's key walked three times a second (cpA2's and cpB's walk), in two more
interleaved pairs: **72 bakes a window in every one of the four, 75.4 ms mean and 206 ms worst at
base against 57.9 and 144.1 at head in the first pair, 58.3 and 146.1 against 67.0 and 144.4 in the
second**. That is the same term 0354 and 0358 left over the budget, unchanged by steps 9–14, off the
frame, and higher than 0358's 42–46 ms only because the walk is now really playing under it. Two
earlier pairs are not quoted and the reason is an artefact worth recording: the walk reached the
tuning registry by importing `src/lib/moireTuning.ts` from the page, and a tree the dev server has
seen edited is served at a timestamped URL, so on head that import built a _second, empty_ registry
and moved nothing — base baked 72 and head baked 0, twice, for no reason in the code. The
instrumentation was then extended, identically in both trees, to publish the app's own registry on
`globalThis`, and the two pairs above are the runs where both sides walked the same handle.

## Which claims cost a rebake and which a fill

This is the table the next block's author needs before writing a claim.

**There are two tile shops and not one, which is what makes this table worth writing.** The
screen's own tile (`screenOf`, src/ui/moireScreen.ts, 110 px across at two device pixels) and the
picture-sized curved tile a non-linear row is drawn through (`curvedOrder`,
src/ui/moireCanvasCurved.ts, the whole field). Both are keyed, both are baked off the frame (0354,
`driftWorkerPort`), and a claim is a fill only when it reaches neither key.

**A fill — read on the frame, in the draws the painting already pays for, and reaching no field of
either key.** Most of what steps 9–14 minted: the panner's three stage toggles as the stagger's
`count`, `spacing` and `size` and `comp.output` as the squash's `lift` (0359); the automator's six
as the shards' terms and its `waits` as the tear's phase (0360); the master's two sides as the
stamp's lift and the crawl's lean (0361); the step's `rest` as `depth` and its `reversed` as the
crawl's sign (0362); a spark as one more lift on the boxed read (0363); the ground's move as whole
cells on the transform (0364). Three of the group's reaches are **not** in that list and are priced
below: the walk's `ratchet` and `voice`, and the armed hand 0363 already said is a rebake.

**A bake — a field of a key, rounded onto a ladder first.** On the screen's tile: the ink's four
terms (`fringe`, `disperse`, `hue`, `saturate`), the rack's lattice fold, the alphabet the standing
part picks and the hand a queued part arms (0356, 0363). **On the curved tile: a row's `centre`, its
`period` and its `pitch`** — `stepped(row.centre, DRIFT_CENTRE_REACH)` and the rings the pitch is
read into, `steppedRings`, on a ladder of four (0142, 0248). A claim on any of these is rounded
before it may key a tile, so a hand crossing a whole reach pays that ladder's stops and not one a
pointer move (`stepped`, src/ui/moireScreenInk.ts).

**Two of the group's reaches are bakes, and the step that landed them said otherwise.**
`PLAYER_REACH` (src/lib/playerDrift.ts) sends the walk's `ratchet` to `fringe` and its `voice` to
`hue`, both of which `boldest` reads off the reference row into the ink and `screenOf` keys the tile
through — so a ratcheting step is one bake per rung of the fringe's ladder and a voice changing is
one per rung of the hue's finer one. 0362's paragraph in plan §1 says "no term reaching a tile key",
and that is corrected here rather than left standing. It costs nothing at the budget's setting,
where a part change is already one bake (0358) and the walk's own claims move at the rate parts
change, but it is the kind of thing this table exists to say out loud.

**And the geometry decides whether a place is free.** `into: "centre"`, `into: "period"` and
`into: "pitch"` are fills on a linear row and picture-sized bakes on a curved one. The panner's
Position is `into: "centre"` on `geometry: "linear"` (src/audio/effects/panner.ts), which is why the
checkpoint's own 480-move drag on it bakes nothing; the automator's `auto.stays` → `period` and
`auto.drift` → `pitch` are on `geometry: "fan"`, which is curved, so those two are on the curved
tile's ladder. The wall clock over their own drags is clean — no long task and at most one gap over
20 ms in the sweep windows for either — because that bake is the worker's and not the frame's
(0354).

**The hue is the one term on a finer ladder** — `HUE_STEPS` is four times `DRIFT_STEPS`, because it
is read along a ramp of five stops (0301) — so a hue claim is four times the bakes of the same move
on any of the other three.

**What holds the two halves in the gate.** `src/ui/moireScreenRung.test.ts` is the step's first
named boolean, scoped to the screen's own tile: a claim moved inside one rung bakes nothing, the
next rung is one bake, and a frame-side claim on a linear row dragged across its whole reach in
twenty places bakes nothing. The curved tile's own ladder is not restated there — 0248's case in
`src/ui/moireCanvasTiles.test.ts` walks a travelling `centre` up it stop by stop already. The step's
second named boolean, that a spark stamps through the frame's own passes and adds none, stands where
0363 put it, in `src/ui/moireCanvasMarks.test.ts` ("flashes one big mark where a spark reads…",
asserting `stampPasses` is `GLYPH_COUNT` and `stampDraws` is `STAMP_PICTURE_DRAWS` with a spark lit).
Neither of this checkpoint's cases is red at `0fbbbd5` and neither could be: **this step changed no
source at all**, so both are characterisations of what already holds, and what was watched failing is
the source inverted — the key's rounding removed, and a frame-side dimension written into the key.

The rule this leaves: **a claim is free to the bake unless it lands on the ink, the hand the marks
are written in, or a curved row's place, period or pitch.** Everything else a hand turns is read on
the frame and costs the draws the painting already pays for. A claim that does land on one of those
costs one bake per rung of its own ladder, however fast the hand moves — never one a pointer move,
which is what every one of those ladders exists for.

## Against the budget

- **No long task the picture is the cause of** — 0 in every run, base and head. **Met.**
- **rAF p95 under 20 ms and nothing over 50** — p95 9.3–10.3 ms at 120 Hz and 17.5–17.6 at 60 Hz in
  every window of both trees, **met**; the worst gap is 40.9 ms in a still window, and **one head
  drag window of the six carried a single gap of 58.2 ms**, which base's three never did, so the
  second half is **not strictly met at head**. One gap in one window of six on a machine changing
  refresh rate mid-session, reproduced by nothing, is recorded and not attributed.
- **A tile bake under 4 ms mean and 8 ms worst** — 58–75 ms mean, 144–206 ms worst, base and head
  alike. **Not met**, where 0354 and 0358 left it, off the frame and untouched by this group. Step
  18 owns it.
- **A knob drag of 480 moves drops no frame** — all 480 moves landed every time and **no drag baked
  a tile in either tree**, but gaps over one frame still occur: 36, 5 and 0 at base against 33, 11
  and 4 at head. **Not met in either tree**, and this group did not make it worse. One deviation to
  flag: the compressor the sweep needs is added immediately after the still window and before this
  drag, so the drag's own rack is the budget's plus a compressor — the same rack in both trees, but
  not the rack the other three numbers stand on.

## What the knob sweep can and cannot say

Every knob of yard A's **whole rack** — the budget's six entries and the compressor added for it,
forty-one knobs — was dragged sixty moves at sixty a second with the walk playing, each drag
preceded by a window with nothing touched. **This half was run on head alone and once**, so it
prices head's claims and is not a comparison; the base/head comparison is the six interleaved budget
runs. Across the thirty knobs of the panner, the compressor and the two automators the control
windows baked 66 tiles and the knob windows 43, with no knob more than three over its own control;
across all forty-one it is 78 against 59, ten knobs above their control, thirteen level and eighteen
below. The one entry clear of that scatter is the EQ's Freq, seven over, which moves what the rack
is heard to be presenting rather than what a knob claims.

Four things this reading cannot carry, all of them recorded rather than smoothed over. **It is
n = 1 and un-interleaved**, against this block's own rule. **Earlier sweeps of the same knobs, run on
both trees without control windows, totalled 4, 130 and 214 bakes at base and 4, 114 and 251 at
head** — a sixtyfold spread, because a generated source runs out after four seconds and a yard that
has stopped paints on commits, so those windows are measuring whether the walk was alive and not
what the knob did. That is what the control windows exist for and why only the run that has them is
quoted. **The two windows are not the same length**: the control is 3.5 s of standing and the knob
window is about 1 s of dragging and 2.5 s of standing, and the knob window draws about a quarter
more paintings — which runs against the conclusion rather than for it. And **the counter is the
screen shop's alone**: it was compiled into `moireScreenShop.ts` and not into `driftTiles.ts`, so a
curved tile the automator's Stays or Stray rebaked was never counted. What stands for those two is
the wall clock over their own windows, which is clean — no long task, at most one gap over 20 ms,
none over 50.

**And the sweep runs' own still windows diverged, head-only and un-interleaved.** Two of five head
sweep runs opened with a still window at 42–45 frames a second, p95 66.6 ms and 28–33 gaps over
50 ms; all three base sweep runs were at 9.1–9.3 ms p95 with none. The sweeps were run base-then-head
rather than alternated, which is exactly the shape this block's own clause says measures the machine;
the interleaved budget runs, taken minutes apart in both directions, show head clean in every still
window. It is recorded here and attributed to nothing.

## No lever landed

The numbers name no cost this checkpoint could lever. The one term over the budget is the bake,
which runs in a worker on a path no gesture awaits and which 0354 already priced against 0058's bar
and found does not qualify — and which no knob the sweep touched asked for at a rate the budget's
own window could see. No refusal of an earlier
step was revisited, no scenario under `scripts/smoke.d/` was added or retargeted — both halves of
this checkpoint's boolean are counts a unit case holds, which is the cheaper place for them (0050) —
and no new block was opened in §1.
