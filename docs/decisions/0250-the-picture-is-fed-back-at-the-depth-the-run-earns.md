# 0250 — The picture is fed back at the depth the run earns

- **Date:** 2026-09-01
- **Status:** accepted, extending
  [0143](0143-a-row-is-drawn-at-more-than-one-scale.md) and
  [0246](0246-the-fractal-is-a-row-and-not-a-mask.md), on
  [0249](0249-a-run-standing-nothing-is-not-a-run-gone.md)

"The structure shouldn't be a layer on top" and "zoom into the moiré the way it zooms into the
fractal" are one ask, and the mechanism for it is already in the painter: `feedFrame` lays the
previous whole field back in, scaled by `1 + FEEDBACK_ZOOM * feedback` and turned by
`FEEDBACK_TURNS`, compounding once per frame of the deck's own clock and settling under
`DRIFT_FEEDBACK_CEILING` (0143). It is taken off `boldestRow`, so it composes with the whole field
rather than sitting beside one row — the picture fed through its own structure instead of a
structure drawn over a picture.

**What was missing was a way in.** Exactly one parameter claims the dimension (`delay.feedback`), so
thirteen rows of a fourteen-row picture could never reach it. `runFeedback(runStanding(grown), age)`
on the fractal row is the floor under it: the same hole 0244 found in octaves and the same answer
`grownOctaves` gave — a floor under a picture-wide claim rather than the only way in. `boldestRow`
takes the max and never a sum, so a rack holding a delay wound past halfway still wins outright and
nothing is said twice (0139). (The step's own text said `tape.feedback` there; `tape.feedback` goes
`into: "octaves"` (src/audio/effects/tape.ts:129) and never into this dimension, so the hand that
outbids a run is the delay's.)

**It is an age band, so it lives in `src/lib/moireAge.ts`** beside `agedHue` and `agedPitch`, spent
through the one `spent()` floor those two already spend. Half the dimension at the whole of the age
(`DRIFT_RUN_FEEDBACK = 0.5`) and half of that on a picture that has just begun: a run may ask for as
much of the picture's own history as a hand that turned a knob halfway, and the rest stays something
only a hand asks for.

**The ramp is `fractalCut` and never a second one.** What a rack is standing already fades a place
in and out, so a curve on top of it would be a fade the eye reads twice — which makes `moireAge`
import `moireFractal` and not the other way about. That direction is now the rule for these two:
what an age spends is a coefficient on somebody else's ramp, and a fractal term that wants an age
takes it as an argument at its call site rather than reaching back for it.

**And the fourth reader of "is the structure there" agrees for free.** 0249 made the depth, the wash
and the lens all answer nought while a run stands nothing; the share is taken off that same
`runStanding`, so a held row asks for no ghost across the trough and a yard growing nothing lays
nothing back and is exactly the picture it was — an age widens a claim and may not invent one (0141).
`runStanding` is walked once per fractal row read and its answer used three times, because it is the
one number "how busy is the rack" has.

Left as it was: `feedFrame` keys its ghost on the bold row's own turn, so when two rows trade the
claim between frames the stack's rotation steps. Two delays in one rack could already do that and
this makes the pairing ordinary rather than new; naming it is enough until a picture shows it. And
a repaint that is a commit rather than a frame returns before laying the ghost at all, so a halted
yard's picture is a hair thinner than the frame before it — 0126's rule working exactly as written,
reachable before this only with a delay knob up and ordinary after it. Both are `feedFrame`'s to
answer if a shot ever asks, and neither is this step's one line.

Cost: two picture-sized blits per painting wherever a run is standing — the ghost in and the copy of
the field out — and nothing reaches a tile key, so no bake. Measured on this step's own gate, base
and head interleaved: a frame p95 of 10.4ms both ways, twice each, at the top of the 9.3–10.4ms band
0240–0242 record and not moved by this. On the strip, a yard six seconds into an automator's run:
the field's mean fell from 0.35 to 0.29 — still at `PICTURE_FLOOR`, which is what says a fed-back
field fills its own fringes rather than filling to opaque — while the coarse-block contrast rose from
0.102 to 0.119.

Durable shape: none.
