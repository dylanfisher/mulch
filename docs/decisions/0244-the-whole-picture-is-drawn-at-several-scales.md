# 0244 — The whole picture is drawn at several scales, and a copy is a share of a grating

- **Date:** 2026-08-31
- **Status:** accepted, answering
  [0243](0243-the-fold-cuts-and-travels.md) and amending
  [0230](0230-depth-is-budgeted-across-the-picture.md), resting on
  [0143](0143-a-row-is-drawn-at-more-than-one-scale.md)

0243 ended by saying the fold does not make the picture fractal and that a decision after it should
say what does. This is that decision.

**`octaves` is the mechanism, and almost nothing could reach it.** Drawing one row at its pitch and
again at twice and four times it (`cutOctaves`) is the only thing in the instrument that puts the
same wave at several scales at once — real self-similarity, built into the rows rather than
composited over them. But one parameter in the whole registry claimed the dimension (`tape.feedback`)
and the only other route in was `grownOctaves`, which reaches an automator's own grown rows alone. A
picture with an automator in it is about fourteen rows; thirteen of them were drawn at exactly one
scale however busy the rack was. That is the flat lattice.

**So a run raises every straight row in the picture** (`spreadOctaves`, `src/lib/moireOctaves.ts`),
by what the rack is standing — the same summed presence the fold reads (`foldStanding`), so one run
drives both and there is no second answer to "how busy is this rack". A yard growing nothing earns
one scale and changes no row: the picture is exactly the picture it was, which is the property the
fold has and for the same reason (0243). Curved rows keep their one scale, the answer `grownOctaves`
already gives, because a curved copy needs a picture-sized tile of its own (0142). `grownOctaves` is
now the floor under a picture-wide claim rather than the only way in.

**Broad and shallow beats narrow and deep at the same cost.** Two scales on all fourteen rows is
fourteen extra fills; three scales on six rows is twelve. The broad one measures better, so
`DRIFT_SCALES_BUDGET` goes from 12 to 16 — enough for a second scale across a typical picture, where
twelve would have held the claim back to the deepest twelve rows and left the rest flat.
`DRIFT_OCTAVES_REACH` stays at 3: the marginal fourth scale is not worth its fill.

**A copy is a share of a grating and not a whole one.** This is the part that decides whether any of
it is visible. `gratingDepth` solves how deep each grating cuts from a count of them, so the picture
weighs the same whatever a yard holds — and `drawnGratings` counted every octave copy as a whole
grating, though a copy at octave _n_ cuts `depth / 2ⁿ`. That error cost nothing while `octaves`
reached one row in a rack. Picture-wide it is the difference between a spread and a wash: measured
on the fourteen-row picture given a second scale on every row, counting the copies whole lifted the
field's mean from its floor of 0.30 to 0.41 and _cut_ the structure surviving a coarse average by a
fifth. The spread paid its fills and returned a paler, flatter picture. `octaveShare` counts a row
drawn at _n_ scales as `1 + ½ + … + 2¹⁻ⁿ`, and the mean holds at the floor.

**What it buys, measured.** On that picture, going from no automator to one standing six places
(`src/lib/moireOctaves.test.ts`):

| block | no run | six places |
| ----- | ------ | ---------- |
| 2 px  | 23.7%  | 17.3%      |
| 32 px | 2.87%  | 3.61%      |
| mean  | 0.300  | 0.302      |

**It is a spread and not an addition**, and that is the honest shape of it: the fine scale gives
some of its structure up and the coarse scale gains, at one weight. There is no setting at which the
picture gets more structure everywhere — the total ink is fixed by `gratingDepth`, so the only thing
a run can move is where it is. That is what "the picture became self-similar" has to mean here, and
a measurement that showed structure rising at every scale would have been a measurement of extra
ink.

**And the fold now says one spiral per standing place.** 0240 seeded `foldRatio`/`foldTurns` off the
holding automator's id, so every effect one automator grew shared one spiral: six effects bought
depth and never variety, which is not what "the picture folds into itself, once per grown effect"
says. `FoldRun` carries each place's own id and `foldInto` iterates places, so six effects compose
six spirals across the passes. This is small and, as 0243 recorded, the fold remains a minor visual
contributor; it is here because the wiring should mean what it says.

Durable shape: none. Every number here is read per painting or per set build off populations nothing
stores (0070, 0204).
