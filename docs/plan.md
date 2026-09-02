# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device. A performance stays editable, portable, reproducible through commands,
and identical through the live and offline signal paths.

---

## 1. Ordered next work

Finish one step, including its full gate, before starting the next. A step delivers a usable
vertical slice, not infrastructure for a feature nobody has asked for.

An entry says what durable shape it moves before the step is started. That is what makes a step
expensive, so it is the first thing to state. A step is written against §2, §3, and the standing
clauses in [subagent-prompt.md](subagent-prompt.md).

The fractal travels, flies, and folds the picture back into itself

Context

0246 made the fractal a row rather than a mask, and that was right: the structure is a grating now,
so every other row beats against it. What it did not give the structure is any life of its own.
Four things follow, and all four are visible on screen:

- The structure swaps. fractalShape (src/lib/moireFractal.ts:251) folds a word of every
  standing instance id into one 32-bit seed, so a population change hands the picture an
  uncorrelated one: cx, cy, ratio and turn jump to unrelated stops and the geometry may
  flip escape ↔ nested outright. An automator retires and lays a place roughly every twenty
  seconds by default, so this is the picture's normal condition and not an edge.
- The row's angle jumps with it. gratingTurns (src/lib/moireGrating.ts:66) reads row.shape,
  which is that same fold — so a turnover also swings both fractal rows around.
- It flashed off, and no longer does (0249, landed): fractalInto held the row only while
  runStanding > 0, so a crossfade took the structure out of the picture entirely; it now builds on
  the run's keys and holds both rows at nought depth through the trough, where washedDepth and
  drawnGratings both answer nought for them, and it claims no lens. The blank across the trough is
  gone, and so is what 0248 named as residue — order.slot carried the row's own at, so the place
  count re-slotted both rows at a turnover and the picture blinked at its edges. A fractal row's
  half of that slot is now where it stands among the structure's own rows (0262, landed), which the
  order may move under freely.
- It barely moved, and now it moves. fractalZoom is a cosine breath over the picture's window,
  twelve stops deep; the band that breath opens through is how long the yard has been sounding
  (`agedOpening`, 0251), the row travels with the ground the reference row, the wash and the
  module's tiers travel with (0235, 0251), and the picture now flies through its own structure
  while it plays — a motion of its own on the performance's own clock and not a wider band on the
  breath (`fractalFlight`, 0261).

The outcome wanted: the structure travels between the places a run stands rather than swapping; a
place fading out while another fades in reads as one continuous run and never as an ending; the
picture flies through its own structure while it plays; and the whole moiré is laid back into itself,
so the picture zooms into itself the way the fractal does. All four are landed
(`docs/decisions/0250-the-picture-is-fed-back-at-the-depth-the-run-earns.md`; the ground anchor and
the age's own opening in
`docs/decisions/0251-the-structure-stands-on-the-ground-and-opens-with-the-age.md`; the fly-through
in `docs/decisions/0261-the-picture-flies-through-its-structure-on-a-clock-of-its-own.md`), and so
is the fallback the turnover used to take with it
(`docs/decisions/0262-a-fractal-row-is-slotted-among-the-structures-own-rows.md`). Nothing is left
of this feature.

Decided before planning: all four in one plan; the picture's self-zoom is frame feedback; and the
fractal's motion may spend the bake budget for a fly-through.

---

The three things the whole plan turns on. All three are landed
(`docs/decisions/0248-the-structure-travels-and-its-identity-is-the-automators.md`), and so is the
no-flash-off that rests on them
(`docs/decisions/0249-a-run-standing-nothing-is-not-a-run-gone.md`) and the feedback that rests on
that (`docs/decisions/0250-the-picture-is-fed-back-at-the-depth-the-run-earns.md`), so the rest of
the plan is written against them as facts rather than as intentions: the picture's stops are on
`MoireRowSet`, the travel across them is `fractalTravelInto`, and what the two rows _are_ is
`fractalKind`.

1.  The seed is a row's and it should be the picture's. placeCurved refolds
    fractalSeedInto(place, row.shape, …) per row per frame. But what an escape field is a picture of
    is the whole population, which 0246 already says belongs to the field and to no row — and the two
    fractal rows are one structure on two periods. So the travelled seed moves onto MoireRowSet
    beside wash and age, where the set's own doc already says what that means.
2.  A fold has no between; a plane does. 0245/0246 wrote "what fades is the share and never the
    shape", which is true of a set — a set is the fixed point of its own maps and there is no half
    of one. It is not true of a view: cx, cy, ratio and turn are coordinates on a continuum,
    and a picture may be carried across them the way a ground is (0235). The travel is therefore split
    out of the fold: FractalStops (four fractions of their own bands) is what travels;
    fractalSeedInto denormalizes stops into a seed as it always did.
3.  Identity is not a coordinate, so it is folded off something that does not move when a place
    does. FractalRun is keyed by the holding automator instance (verified: rack.growth files a
    order.slot and keying on the row index
    alone is unsafe: on a rebuild, index n can be a different row entirely (removing a rack instance
    shifts every index after it) and a row would inherit a stranger's picture-sized tile — the failure
    src/ui/moireCanvasTiles.test.ts:240 guards. Stabilising the shape is the fix; the slot's own rule
    otherwise stays as written, amended only for the two rows the structure is cut at, which are
    counted among themselves rather than in the picture's order (0262).

---

Tests that must fail first

src/lib/moireFractal.test.ts — the travel's own arithmetic is written ("the travel", 0248): it
rests where the seed rests, moves every stop at one rate and arrives, stands on the population where
there is no window, folds its kind off the automators and not off the places, keeps every stop on
its own band, and keys a row by the stops its own coordinate reads.

The split is made. src/ui/moireRowsFractal.test.ts holds the fractal row's own cases — it was
split off src/ui/moireRows.test.ts, which is the file these cases took past the 800-line cap, and
it took the two cases that were about the fractal row with it. The remaining case to move is
moireRowsField.test.ts's "cuts the fractal row deeper under a resonant output", which is a move to
make when a later step needs the room rather than for its own sake. "holds the rows while the run
stands nothing and cuts nothing through them at wash: 1" is written (0249), and so is "asks the
picture to fold back into itself at the depth the run is standing" (0250), and "stands its rows on
the ground the yard is reading, and both of them on the one ground" (0251), and "flies its two rows
through the one structure at their own two rates" (0261). Nothing is owed there.

src/ui/moireCanvasTiles.test.ts — the ladder is written ("walks a travelling structure up that
same ladder"), and so is the age's own stop on it ("opens a fractal row's tile with the age, and
asks for none between two steps of one", 0251) and the flight's ("flies a fractal row's tile through
the structure as the yard sounds", 0261) and the slot's ("keeps a fractal row's fallback across a
seed step", 0262). Nothing is owed there.

src/lib/moireAge.test.ts — nothing is owed. "lays back what a standing run earns, over the band the
age has opened" is written (0250), and so are "opens the structure inside its own band at every age,
and never past the band" and "stands still between two steps of the age" (0251).

src/ui/moireCanvas.test.ts — "lays the whole field back into itself for the run the yard is
standing" is written (0250), beside the `fedRow` fixture rather than through it: the rows come out of
the one builder standing a run, and the lays are told from a curved row's own tile placement by their
composite. No claim here may rest on a whole-picture getImageData read —
the harness stub answers one pixel, and that is the fault that let 0245's compensation ship
(src/ui/moireCanvasPainted.ts:119-129).

Mechanical ripple: moireCanvasPainted.ts and moireScreen.test.ts take paintMoire's arguments as
they grow; the local refillRows wrapper at moireRowsField.test.ts:136 pins the ones it takes.

---

Verification

1.  Per step: ./scripts/fix, then git diff --stat to check the autofix took nothing else with it,
    then ./scripts/check read whole. Watch each new test fail before the change.
2.  The picture itself, per step — ./scripts/drive --dev --shot DIR on a yard with an automator
    running; read the {"shot":…} swing and a 1:1 crop, never the whole-canvas view. Four questions
    only a shot answers:
    - Does the travel read as a pan or as a crawl? The length it should finish inside is the
      automator's turnover, which the picture cannot see — shoot FRACTAL_TRAVEL at 1/2, 1/4 and 1/8
      of the window.
    - Do eight stops read as a pan or as a slideshow? If a boundary steps visibly the answer is a
      narrower FRACTAL_WANDER, not a stop count of the fractal's own.
    - At what depth does the feedback read as the picture zooming into itself rather than as a smear?
      A fed-back frame fills fringes back in, so confirm the field's mean holds near PICTURE_FLOOR
      while the coarse-block contrast rises.
    - Does the structure still read as a layer once it travels and is fed back? Answered yes on
      0251's own shot — broad arcs standing over a straight weave, on a yard six seconds into a
      run — which is why the ground anchor was taken, and asked again of the fly-through on 0261's.
3.  ./scripts/profile at the end of the feature and again inside the feedback step's own gate, against the
    ~10.4ms frame p95 band.
4.  A decision record per step, no longer than the decision is.

Risks

- 0211's kernel byte-gate: no exposure by construction. Nothing touches escapeTurns,
  nestedTurns, geometryTurns or DriftPlace's shape — the split is strictly upstream (stops →
  seed → place), and DriftPlace stays flat for the reason its own doc gives (the shop copies places
  by spread; a nested seed would be shared by reference). The one thing that would breach it is
  flattening fractalSeedInto's denormalize into the pixel loop to save the copy — do not.
- Cache pressure is bounded, not eliminated. CURVED_CACHE = 8 against two travelling rows means
  a travel evicts continuously, by design; the standing fallback carries the picture. If a shot
  shows a rack of curved rows stalling, the lever is BAKES_PER_PAINTING, which is a 0144 question
  about the hand and belongs in its own record.

Refused

Age widening octavesEarned. One dimension said twice: the run already drives it through
spreadOctaves and grownOctaves, and 0242 deleted agedFoldReach for exactly this (an age gating a
run's contribution made a fresh deck's automator worth nothing). 0244 measured that the spread is a
redistribution at fixed ink — "there is no setting at which the picture gets more structure
everywhere" — so more scales buy fills and return a flatter picture, most of which shareOctaves
takes straight back. 0251's record should name the refusal so it is not re-proposed.

Crossfading two whole fractal structures during a turnover. Richer, and it costs a second baked
tile per fractal row for the whole travel — twice what the fly-through spends. Worth revisiting once
0247's shot says what the budget actually bears.

---

# The bench names its corners, chews like a chipper, and argues the card fold by fold

## Context

0247 put six whole-surface arguments at `#/sketch` and said the directory is deleted the day one of
them wins. Nothing has won, and looking at the bench says why: it is arguing at the wrong two
altitudes at once.

- **The blend was one blend, and the pad did not name its own corners.** Both are landed
  (`docs/decisions/0252-the-blend-is-four-arguments-and-every-corner-is-named.md`): `SketchCast` is
  four blends of one cast — hexagon, barycentric triangle, six levers, wheel — side by side under
  one readout, each drawing its own corner names inside its own picture with the weight beside
  each, and each stating its own trade. The row underneath is gone. What the rule leaves owed is
  the rest of the bench: every blade and every planted spot still gets its name drawn on it.
- **Nothing on the bench was a mulcher.** Landed
  (`docs/decisions/0253-the-machine-is-on-the-bench.md`): the instrument is named for a machine that
  takes a whole thing in at the top, chews it, and throws the pieces out the side, and a hopper, a
  drum of blades and a chute is not decoration but a _layout argument_. `SketchChipper` works it
  from the top and `SketchChips` reads the pile at the output end, and both name every blade,
  ground and wood inside their own picture.
- **Every sketch argues the whole card at once.** `src/ui/PlayerCard.tsx` is five folds and a
  picture — `PLAYER_GROUP_LABELS` (src/lib/copy.ts:384) names them: Where It Lands, Which Ground,
  How It Sounds, How It Is Timed, How It Is Arranged, over `PLAYER_SCOPE_LABEL` "The Walk" — plus
  the song builder above them (src/lib/playerSongs.ts). A hand does not reach for "the card"; it
  reaches for one of those. Six whole-surface sketches can only ever be picked between wholesale,
  and the answer is almost certainly not one of the six but a walk from one, a ground from another
  and a song builder from a third. **A part sketch is what makes that answer sayable.**

**The outcome wanted:** the pad's argument is separable from the pad's arithmetic and every corner
says its name — landed, for the cast, in 0252; the machine the instrument is named after is on the
bench twice — landed in 0253; the bench is two lists and the walk has its own — landed in 0254,
which amends 0247's "pick one" to "pick one per fold"; the ground and the arrangement have benches
of their own — landed in 0255; and the song builder over the parts and the two folds that are only
dials have theirs — landed in 0256, which closes the feature: every region of the card now has its
own sketches, so a decision can be taken one fold at a time rather than one card at a time.

**Decided before planning:** the bench stays unwired to the letter of 0247 — no store, no command,
no sound, hand-written fixtures only; the parts bench and the surfaces bench are one route and one
page with two nav groups, not a second route; and nothing here relaxes the one-hue constraint (0236)
— a chipper drawn in orange would be arguing about the palette.

## The two things the whole plan turns on

1.  **A sketch's identity is its entry, and the entry list is two lists** — landed in 0254.
    `SKETCH_SURFACES` and `SKETCH_PARTS_LIST` are exported from SketchPage.tsx, one entry type and
    one `SketchFrame` across both, two headings and two nav groups with a rule between them, and
    the numbering restarts per list. Every part below is one more entry in the second array, and
    `SketchPage.test.tsx` mounts off the arrays themselves, so an entry with no section, a section
    with no entry and two entries sharing an id all fail.
2.  **Every fixture the parts need is hand-written and lives in one file.** `sketchWalk.ts` (297
    lines) holds `SKETCH_WALK` — carrying the source `slot` each landing reads — plus
    `SKETCH_REACH`, `SKETCH_PARTS`, `SKETCH_BEDS`, `SKETCH_SOURCE`, `SKETCH_SOURCE_BEDS`,
    `SKETCH_GROUND`, `SKETCH_GROUND_STANDING`, `SKETCH_ARRANGE`, `SKETCH_ARRANGE_ODDS`,
    `SKETCH_STANDING`, `SKETCH_CHARACTER_WEIGHT`, `characterInk`, `fixtureAt` and `SKETCH_CAST`,
    deterministic so two screenshots of one sketch are the same picture. Everything added below
    extends that file and nothing invents a second fixture module — a bench where two sketches draw
    different made-up walks is comparing fixtures rather than surfaces. It is 359 lines after
    0256's `SKETCH_SONGS`, `SKETCH_SONG_STANDING` and `SKETCH_SOUND`, so the next fixture splits the
    file rather than joining it.

---

## Tests that must fail first

`src/ui/sketch/SketchPage.test.tsx` (194 lines) mounts the bench off its own two lists and reads
the whole `src/ui/sketch` tree off disk to check it imports nothing from `src/state`, `src/app` or
`src/audio` — both landed in 0254. Nothing is owed:

- **every corner, blade, lever and planted spot names itself, and the amount beside the name is
  pinned with it.** The cast's half is written (0252) and so is the machine's (0253), the walk's
  (0254), the ground's and the arrangement's (0255), and the song builder's and the two dial folds'
  (0256 — every song named with the rounds it plays in both pictures, the cursor standing in one
  round of one song in both, each of the sound fold's six at one amount on the axis and on the dial
  beside it, and every grid cell's repeats and rest at what the grid itself comes to). Each case
  slices the one `renderToStaticMarkup` by the picture's own attribute — `data-blend`,
  `data-machine`, `data-reading`, `data-ground`, `data-arrange`, `data-songs`, `data-sound`,
  `data-timed`, through the one `pictureOf` helper — and asserts every name inside a `<text>` there,
  bounded by that picture's own `</svg>` so it cannot pass on its neighbours; a fold drawn as the
  dials it already is has no `</svg>`, so it is bounded by the region that follows it instead
  (`foldOf`). Any surface added later extends that shape to its own corners; it is what stops a
  picture shipping unlabelled.

Sizes: the parts bench's cases are `src/ui/sketch/SketchParts.test.tsx` (328 lines), split off at the
400-line cap in 0256 rather than shaved — `SketchPage.test.tsx` keeps the bench's own shape and this
one keeps what the second list draws. `SketchPage.tsx` is 270 lines and each further part is one
entry — if a later step crosses 400 the split is the entry lists into
`src/ui/sketch/sketchEntries.ts`, not prose shaved out of the theses. `sketchWalk.ts` is 359 lines,
so the next fixture splits the file rather than joining it.

`src/ui/sketch/sketchGround.ts` and `src/ui/sketch/sketchSongs.ts` hold their drags' own arithmetic
with a test beside each, and `SKETCH_VIEW` (SketchFrame.tsx) is the box every part sketch draws in, the shape `sketchPile.ts` took: a part sketch whose picture is a gesture
puts the gesture's numbers where a test can reach them, because `renderToStaticMarkup` never drags
(0253, 0255, 0256).

**Cleared by the block below**, which deleted all thirteen entries and their files: the paragraph
that follows is what the parts bench was, and `SketchParts.test.tsx`, `sketchPile.ts`,
`sketchSongs.ts` and `src/ui/sketch/parts/` are in git rather than in `src/`. The rule it states —
a further sketch is a file of its own with its own `@role`/`@instead` header and its own written-out
waiver — is what carried into `src/ui/sketch/ground/`.

`src/ui/sketch/parts/` held `SketchPartWalk.tsx` (370 lines — 30 short of the soft cap),
`SketchPartGround.tsx` (339), `SketchPartArrange.tsx` (269), `SketchPartSongs.tsx` (321) and
`SketchPartSound.tsx` (279), so any further part is a file of its own and never an addition to one of
these: each file needs the `@role`/`@instead` header, and the 0247 `max-lines-per-function` waiver
carries to each part sketch for the same stated reason, written out at each site rather than referred
to.

## Verification

1.  Per step: `./scripts/fix`, then `git diff --stat` to check the autofix took nothing else with
    it, then `./scripts/check` read whole.
2.  **The bench is a picture, so the shot is the proof and not a nicety.** `./scripts/drive --shot
DIR` on `#/sketch`, per step, at both themes. Two traps this feature walks straight into:
    - New Tailwind classes in a new directory are stale on the dev server — shoot the built `dist/`,
      and the shot needs its `{"wait":1}`.
    - Never judge a labelled corner from the whole-page view; read the 1:1 crop, which is the whole
      question decision 0252 exists to answer.
3.  Three questions only a shot answers, and they decide what the next step is:
    - At four blends across a card's width, is a corner label still readable? **Answered yes**, on
      0252's own shot, once the pad's box spilled past its square and the pad shrank to `h-40` so
      four of the wider boxes fit a row: the names set the width and the geometry follows. The trap
      the shot caught twice is that a clipped label reads as a smaller number — `stutter 38` drawn
      as `stutter 3` — so it is legible and wrong.
    - Does the chipper read as the machine or as an illustration sitting on top of a card? If it is
      an illustration, 0253's `chips` is the one to keep and `chipper` is deleted in its own record.
    - Does the parts bench make the surfaces bench redundant? If a hand picks a walk, a ground and a
      song builder without looking at the eight, say so in the record of whichever step finds it —
      that is 0247's "the day one of them wins" arriving in a shape 0247 did not predict. Open, and
      now askable: all five parts are on the bench (0256), so the question wants a hand rather than
      another step.
    - **The harness has no theme switch.** 0254 took its shot light only and said so: the theme is a
      `localStorage` choice and `./scripts/drive` cannot set it, so "at both themes" costs an edit
      to `scripts/` that the gate forbids. Every step below inherits that, and every one of them is
      drawn in the tokens the bench already uses at both.
4.  A decision record per step, no longer than the decision is. No `./scripts/profile` gate on this
    feature: the bench is off the frame path entirely and mounts nothing the instrument runs.

## Refused

**A second hue for the chipper.** 0236 gives the instrument one, 0247 already argued that a sketch
needing a second was never going to ship, and a machine drawn in a wood colour would be a mock of a
palette rather than an argument about a layout.

**Wiring one part sketch to the real store "just to feel it".** This is the one thing 0247 forbids
outright and the reason is stated there: nothing on the bench can be half-adopted by accident. A
surface that has to be wired before it can be judged has already told you it is not a sketch — it is
the next feature, and it gets a plan of its own.

**A seeded fixture.** Two screenshots of one sketch must be the same picture. Every fixture added
here is written by hand in `sketchWalk.ts` for the reason that file's own `@role` already gives.

# The rack gets the three axes it has none of: dirt, modulation, pitch

## Context

Nine entries stood in `EFFECTS` when this was planned, and between them they covered the spectrum
(`filter`, `eq`), the envelope (`compressor`, `pop`), time (`delay`, `tape`), the room (`reverb`)
and the buffer (`scatter`). Three families were missing, and each was missing entirely rather than
thinly:

- **Something aliases now** (0263, landed): `crush` is a sample-and-hold and a quantiser in one
  processor, and its row is the first stepped wave in the picture. Every other entry is still
  either linear or softly saturating; `pop`'s air is the hardest edge left among them.
- **Something modulates a delay now** (0264, landed): `sway` is one `DelayNode` a slow oscillator
  carries, so vibrato, chorus and flanging are one graph set three ways. `delay` still holds its
  time and `tape` still wanders around its own by design; neither is a swept one.
- **Something changes pitch now** (0265, landed): `shift` is two read heads walking one circular
  capture at the rate the interval sets, crossfaded so neither is heard arriving. `scatter` still
  reads its capture at the rate it wrote it and the deck's own rate still moves time with pitch;
  this is the one entry that transposes what passes through it.

Weighed and not here: a freeze (`scatter`'s capture held rather than re-triggered), a rhythmic gate,
a wavefolder, a width-and-Haas spread (`pop` already owns width), and a tuned comb. Each is a real
effect and each is a variation on a reading the rack already has; these three each open an axis it
has no reading of at all.

**The outcome wanted:** three entries, each of which sounds, is automatable, draws a row nothing
else draws, and renders identically through the offline path. All three are landed
(`docs/decisions/0263-a-crushers-wave-is-its-own-quantiser.md`,
`docs/decisions/0264-a-swaying-crest-wanders-on-its-second-harmonic.md`,
`docs/decisions/0265-a-shifted-crest-is-two-harmonics-a-fifth-apart.md`). Nothing is left of this
feature.

**Decided before planning:** three steps, one entry each, in the order below; and
nothing here relaxes one declaration per parameter and one value per (instance, parameter)
([0030](decisions/0030-effects-are-instances.md)) or the reserved profiles.

## The two things every step turned on

1.  **A new entry is a new wave, and there are none spare.** `DRIFT_PROFILES`
    (src/lib/moireProfiles.ts) lists fourteen, two of which no effect may claim (0145), and all
    twelve of the rest are taken: slope/filter, peak/eq, flat/compressor, twin/delay, lobe/reverb,
    split/tape, swarm/automator, swell/pop, grain/scatter, stair/crush, sway/sway, fifth/shift.
    Each step added one name to that list and one wave to `PROFILE_WAVES`, whose mean is exactly a
    half and which is a family of its own rather than another wave at a depth ratio — the trap
    `swell`'s own comment spells out (0122). The file is over two hundred lines now; the profile
    count is what will eventually split it, and that is a later step's problem.
2.  **A worklet writes every range twice, and shift wrote them.** Shift
    added a processor, so each range is written again as a `parameterDescriptors` entry and pinned
    against the declaration in the processor's own test, exactly as crush/pop/scatter/tape are, and
    it added a registered name to src/audio/worklet.ts and its `?url` to `MODULES`. Sway needed none
    of that: it is a `DelayNode`, an `OscillatorNode` and gains, and no second copy of anything.

The order was cost. Crush's processor was the smallest one that proves a new wave and a new
processor together, and it paid for that pattern (0263); sway proved the same entry shape with
no processor at all, and its own trap was the ratio case rather than the audio (0264); shift was the
only one whose correctness is a claim about a frequency, so its
proof is an offline render through `buildDeckChain` rather than a knob (0265), and it was worth the
most once the other two had paid for the rest.

## Tests that had to fail first

- **src/lib/moire.test.ts needed no new case and failed per step anyway.** Its profile case
  iterates `DRIFT_PROFILES` for the mean, for two waves that are one string, and for two that are
  one wave at a depth ratio (moire.test.ts:450, :526, :534). A wave added to the list without a
  wave in the record is a compile failure, because `PROFILE_WAVES` is total.
- **src/audio/effects/registry.test.ts, likewise.** The duplicate profile, the unclaimed value, the
  unschedulable presence and the silent-at-default cases all run over `EFFECTS` at load, so an
  entry that forgets a `driftUnreached` reason throws in every file that imports the registry.
  Nothing new was owed in either file, and that was the point of both.
- **src/audio/worklets/shift.test.ts**, in the shape scatter.test.ts and crush.test.ts
  have: the declaration against `parameterDescriptors`, the input written straight back out at the
  presence's silence, and the one thing the processor is for — a shifted block's dominant bin is
  where the interval says it is.
- **One case per entry in src/audio/effects/rackPlugins.test.ts:** built, moved, disposed, and
  heard. That file and the fake context every entry is built against (rackFake.ts) split off
  rack.test.ts, which is the rewiring matrix and holds no per-entry case. The worklet fake a
  processor entry needs is the one crush's own case installs beside it.
- **scripts/smoke.d/renderShift.js**, which is shift's own proof and no other step's: a tone
  rendered through `buildDeckChain` offline, decoded out of the file that render wrote and scanned
  for where its energy stands, against the same rack at the mix of nothing it declares as silence.

## Verification

1.  Per step: `./scripts/fix`, then `git diff --stat` to check the autofix took nothing else with
    it, then `./scripts/check` read whole. Each new test was watched failing before the change.
2.  The picture, per step — `./scripts/drive --dev --shot DIR` on a yard holding the new entry,
    read from the `{"shot":…}` swing and a 1:1 crop. One question: does its row read as a family of
    its own beside the entry nearest it — shift beside `grain`? The ratio case
    answers the arithmetic; only a shot answers whether the eye agrees. Crush's own shot said yes:
    beside a compressor's even bars its row is flat-topped bands of varying width, and the strip's
    alpha doubled.
3.  `./scripts/profile` at the end of the feature, against the ~10.4ms frame p95 band: two more
    processors on the audio thread, in a rack that holds every entry.
4.  A decision record per step, no longer than the decision is. Next free is 0266.

## Refused

**A separate chorus, a flanger and a vibrato.** One graph and three settings of it. Three entries
would be three profiles, three icons and three presences for one piece of arithmetic, and the rack
is a list a hand reads.

**A pitch shifter built on playback rate.** An `AudioBufferSourceNode`'s rate moves time with pitch
and a chain entry is handed a stream rather than a buffer, so the read-head worklet is not an
optimisation of a simpler thing — it is the only shape the effect has here.

**The other five effects in the same feature.** A freeze, a gate, a wavefolder, a spread and a comb
are each a step of their own later. They queue behind these three because none of them opens an
axis, and a feature that adds eight entries is a feature nobody can shoot.

---

# The picture travels its ink, blows with the tail, opens like a lattice, and shatters on the odds

## Context

Four things the drift did not do, each of which a listener can hear and the picture cannot say. All
four are landed, and each is left here as what the next reading of the field is read against:

- **Colour arrived and never travelled, and now it travels** (0266, landed). `stepped` rounds hue,
  fringe and disperse onto `DRIFT_STEPS` = 8, which is what keeps the tile's pixel loop off the frame
  path (0129, 0142) and was never the problem. The problem was above it: each of the three is
  `boldest` over the rows, so an automator retiring the instance holding a claim handed the picture
  another ink between two frames and a knob dragged across a stop cut to it. The travelled value is
  now what `stepped` rounds — `inkTravelInto` walks `MoireRowSet.ink` toward the claim at a whole
  reach in `DRIFT_INK_SECS`, in `easedToward`'s shape, and `carryInk` keeps that travel across the
  rebuild a knob touch is — so the staircase is walked and the drag stays immediate at the knob.
- **Nothing read how long the rack takes to fall silent, and now the wind does** (0267, landed).
  Every entry declares `settle` over its own values — reverb's is decay plus predelay
  (src/audio/effects/reverb.ts:114), delay's is `feedbackSettleSecs` (src/audio/effects/delay.ts:74)
  — and nothing outside scheduling read one, so three reverbs and two delays deep the picture was
  the picture a dry yard draws. `rackTail` is the longest heard tail in the standing rack, weighted
  by each entry's own presence and normalised onto one band; it buys a one-way drift on
  `inkThrough`'s own axis and a direction folded off the population, and nothing else reads it.
- **The structure opened four-fold and read as a swell, and now it is a lattice** (0268, landed).
  The reference the human brought is `#home-hero-gp` at gpuworld.org: a coarse cell lattice — five
  by five across the whole picture — where every cell redraws the same field at the cell's own
  scale and every cell's boundary is drawn as a lit contour. Ours had the family and spent it
  entirely on filigree. Three levers took it: `FRACTAL_OPENING` doubled to eight on the rung it
  always had, since `4 ** (1 / 12)` and `8 ** (1 / 18)` are one number; the fly-through remade as a
  travel through the row's own coordinate rather than a second scale that returns, whose wrap is
  exactly invisible because a whole level is a whole number of fringes; and `FRACTAL_LEVEL_CYCLES`
  cut from a dozen to four with the level boundary itself lit by the row's own fringes crowding
  onto it (`fractalRule`), which is what amends 0246 — the boxes came out of the interference
  deliberately, and the contour is cut as a grating rather than laid over the picture.
- **Scatter's whole claim on the picture was one row's pitch, and now the odds shatter the field**
  (0269, landed). `scatter.odds → pitch` (src/audio/effects/scatter.ts:143), geometry `linear`: six
  scatter instances were six straight rows at six pitches, so the yard at its most broken drew the
  picture at its most orderly. `rackScatter` is how much of the standing rack is scatter, summed
  over each instance's own odds by its own gate across one whole scatter to six, and it buys the one
  thing the picture had never done — a share of every piece of the finished field drawn from
  somewhere else along it, through the slices the lens already bends the field in, bounded at
  `SHATTER_CEILING` for the feedback's reason (0250). In whole eighths of the width and never a share
  of every slice: a tear one pixel deep reads as a smear, and two `destination-out` draws of one band
  compose as a product rather than as a crossfade — which hazed every window in the picture evenly,
  worst at exactly the half the ceiling stands at.

**The outcome wanted, and reached:** ink travels between its stops instead of cutting to them; a rack
with a long tail blows the whole field in a direction, smoothly, and the direction moves with what
else is standing; the structure reads as the picture zooming into its own lattice; and a rack of
scatters reads as a picture coming apart.

**Decided before planning:** four steps in that order, one decision record each, all four
landed. No list anywhere of which effects are washy — the reading is `settle`, which every entry already
declares and which a new entry gets for free. The wind and the shatter belong to the field and to no
row, the way the wash does (0213) and `runStanding` does; neither is a parameter and neither is
durable (0145, 0128).

## The two things every step turned on

1.  **A tile is a bake and a frame is a `fillStyle`.** Everything named here is keyed into either the
    screen tile (src/ui/moireScreen.ts, `build`) or a curved row's (src/ui/driftTiles.ts). A term
    may move per frame only on the free side of that line — the pattern's transform, which
    `inkThrough` (src/ui/moireScreen.ts:651) already sweeps four terms through, or the one
    `fillStyle` (0070). Anything else moves a stepped key, and a stepped key that moves every frame
    is the pixel loop 0129 exists to refuse. The ink tween is therefore a rated travel of the
    _claim_, so the staircase is walked rather than jumped and each stop is baked once and cached;
    it is not a finer ladder, and it is not an unstepped hue — which is what the landed ink travel
    is, and what the drift below is a second term on.
2.  **A reading of the population is the field's, and it goes where the field's readings live.** The
    scatter weight is one more of the kind `wash` and `age` already are, so it rests on
    `MoireRowSet` (src/ui/moireRowsField.ts) beside them and no registry entry declares it — which
    is where the rack's own tail landed, beside them and read at the rebuild rather than per row,
    because what it is read off is what the rack is set to (0267). An effect that reaches these
    through `driftFrom` would be a second value for one fact (0030, principle 1).

## Tests that had to fail first

- **src/lib/moireSound.test.ts** — `rackScatter`: silence is not one, `odds` and `gate` are read per
  instance over its own values and never off a default, and it answers inside its stated band at
  every input.
- **src/ui/moireShatter.test.ts** — the reading rests on the set beside `wash` and `age`, and is
  computed once for a whole read rather than per row. Its own file rather than the field's, in the
  shape `moireWind.test.ts` already took: the reading and the rows it rests among are two subjects.
- **src/ui/moireCanvas.test.ts** — the shatter's displacement is a slice of the field and not a
  second fill over it, and its share is bounded at the ceiling the record states. Beside the lens's
  own case, which is the pass it shares, rather than in the tiles file, which is about bakes.

## Verification

1.  Per step: `./scripts/fix`, then `git diff --stat` to check the autofix took nothing else with
    it, then `./scripts/check` read whole. Each new test was watched failing before the change.
2.  The picture, per step — `./scripts/drive --dev --shot DIR`, the `{"shot":…}` swing and a 1:1
    crop, never the whole-canvas view. One question: does a six-scatter yard read as broken rather
    than as noisy. It does, and only at the crop: the strip's swing _falls_ under a shatter, and
    read alone that number would have accepted the fine tear the crop refused. A yard needs a source
    loaded before an automator grows anything, so the fixture is a `deck.load` and a loop before the
    `effect.add` — driven without one the strip draws nothing, and the shot is byte-identical
    whatever the change was (0268).
3.  `./scripts/profile` at the end of the feature and again inside the shatter's own gate, against
    the ~10.4ms frame p95 band: 10.4ms both times, and the profiler samples an idle page, so what it
    prices is the slice loop's presence and never a scattering yard. The wind spent no bake at all:
    its drift is a term on the transform and nothing in the tile's key (0267).
4.  A decision record per step, no longer than the decision is. Next free today is 0270.

## Refused

**Tinting the screen tile at fill time instead of at the bake.** `build` multiplies every pixel by
one row ink (src/ui/moireScreen.ts:611), so the tile is separable in its colour and a composite pass
could recolour it per frame with no bake at all. It is a second full-canvas pass on the frame path to
save bakes that are already cached and already stepped, and it puts the ink somewhere other than
where the tile says the ink is. Revisit only if a shot says eight stops still read as a
staircase now that they are walked (0266).

**A `washy` flag, tag or list on the effect registry.** Which effects wash out is a fact about their
tails, and their tails are declared. A list would be that fact said twice and wrong the first time an
entry is added (principle 1) — 0267 names the refusal, since it is the obvious thing to propose.

**Giving scatter a `driftFrom` into the new shatter.** The displacement is the whole field's and a
`driftFrom` is one row's (0030). Six instances each displacing their own row is six broken rows in an
otherwise orderly picture, which is the picture the step exists to stop drawing.

---

# The bench is cleared, and asks two questions: when the ground moves, and how a song is played

## Context

The bench at `#/sketch` held thirteen entries — eight whole surfaces and five parts — and every one
of them argued about the mulcher card as a whole or about one of its folds. They had been drawn,
read and decided against or absorbed; what was left on the page was a record of finished arguments,
and a bench nobody clears stops being a bench. Two questions were open and neither had a drawing
anywhere. Both are drawn now, in two sections of eight (src/ui/sketch/SketchPage.tsx):

- **When the ground moves. Landed.** The bench is cleared and eight readings of that one seam are on
  it: the lap, the queue, the ratchet, the ladder, the cut, the lane, the throw and the count. Each
  is drawn against the unit `bedPer` has none of — _every N times the walk finishes its sequence_ —
  which src/ui/sketch/sketchGround.ts now holds the arithmetic of and every one of the eight lights
  the standing ground off. Whether that fourth clock is worth being one is now a question a hand can
  answer by looking, and taking it is still a step of its own against src/lib/playerBed.ts (Refused,
  below).
- **How a song is played. Landed.** The tier over a part is a run and a cursor over it
  (src/lib/playerSongs.ts), drawn today as a list (src/ui/PlayerSong.tsx). Playing one is the thing
  the instrument is for and it was the least visual surface on the card. Eight readings of it are
  now the bench's second section, under a rule and a heading of its own: the track, the hand, the
  wheel, the grid, the route, the spend, the spindle and the strip. Each draws the cursor standing
  somewhere, because a song is a run and a cursor over it, and src/ui/sketch/sketchSong.ts holds the
  one unfolding of the two tiers all eight are drawn off.

**The outcome wanted, and had:** sixteen drawings, in two sections, that make either question
answerable by looking. Fun, simple and intuitive was the brief, and on this bench that is a
measurable thing: a drawing that needs its caption read twice has failed.

**Decided before planning:** the thirteen are deleted rather than kept below the new ones — done,
and their files with them; git remembers (principle 6) and the arguments they made are in 0257–0259.
Nothing here is wired to the store, a command, or a real deck (0247), which is what lets sixteen of
them cost what they cost. Eight per section, each varying a direction and not a detail: two that are
the same picture with a different palette are one sketch and a wasted slot.

## The two things every step turned on

1.  **A bench entry is an argument or it is wallpaper.** `SketchEntry` carries a `thesis` and a
    `trades` beside the drawing, written in the same file that mounts it, so the argument cannot
    drift from the picture. Sixteen new entries are sixteen honest `trades` lines, and the one that
    cannot write its own is the one to cut before it is drawn. `SketchPage.test.tsx` reads both
    sentences off every entry of the list it mounts, so an entry with an empty one fails.
2.  **The fixtures are shared and the drawings are not.** src/ui/sketch/sketchWalk.ts holds the one
    made-up walk, the file, the grounds, the crawl the eight read back, and `SKETCH_SONGS` /
    `SKETCH_SONG_STANDING` — the run the playback eight are two more readings of, not two more
    fixtures. Two sketches disagreeing about what the walk did is the one failure that makes a bench
    useless. It is 251 lines after the cleared sketches' fixtures went with them, so the playback
    eight extend it rather than starting a second fixture module; their arithmetic goes beside
    src/ui/sketch/sketchGround.ts in a file of its own, the way the ground eight's does.

## Tests that had to fail first

- **src/ui/sketch/SketchPage.test.tsx** — the nav names every entry in both lists and no entry the
  page does not mount; the second section is under its own heading and its own rule. Both lists are
  read as one bench, so a case written over one half cannot go quiet on the other.
- **A case file per section**, in src/ui/sketch/SketchGrounds.test.tsx's shape: each drawing renders
  from the shared fixture, sliced by its own `data-` attribute to its own `</svg>` through that
  file's `pictureOf`, and the playback eight all draw the cursor at the same place in one run — as
  the ground eight all light one standing ground and all state one count. Named plural
  (src/ui/sketch/SketchSongs.test.tsx): a `SketchSong.test.tsx` beside a `sketchSong.ts` differs
  only in case, and the type-aware linter then resolves neither and goes quiet.
- **The arithmetic the eight share** lives beside the pictures and never in them, the way
  src/ui/sketch/sketchGround.ts holds the ground eight's count of completed sequences, which ground
  the Nth move landed on, and where a throw comes down (principle 1).

## Verification

1.  Per step: `./scripts/fix`, `git diff --stat`, `./scripts/check` read whole.
2.  The page itself — `./scripts/drive --shot DIR` against a build and not the dev server, since new
    files mean new Tailwind classes, and `#/sketch` is a hash route, so shoot `dist/` with a wait and
    reap the server after. Read each drawing at 1:1: the question is whether the caption is needed,
    and a drawing that needs it is the one to redraw.
3.  A decision record per step only where a drawing changes what a fold _is_. Neither step wrote
    one: both ask whether a surface should exist rather than deciding it, and the clearing itself is
    not a decision — it is a bench doing what a bench is for.

## Refused

**Keeping the thirteen below the new ones.** A bench with twenty-nine entries is a gallery, and a
gallery is the thing this page was built instead of. The arguments are recorded; the drawings are in
git.

**Wiring any of the sixteen to a real deck.** Still 0247's rule, and it is the rule that makes a
sketch cost an afternoon instead of a feature. A fourth clock, if one is taken, is a step of its own
against src/lib/playerBed.ts with its own decision, its own validator case and its own dial.

**Sixteen sketches in one step.** Two sections are two arguments and two gates. Sixteen drawings
landed together is one review nobody can hold in their head, which is the same reason the rack's
three effects are three steps.

**Re-using the id of a cleared sketch.** The playback bench wanted `stack` and took `spindle`
instead: `SketchPage.test.tsx` names the thirteen the bench was cleared of so a re-mount has to say
so, and an id come round again on a different argument is a record that stops being one.

---

## 2. Rules for every feature

- `src/app` remains the only writer of session state. UI, workers, keyboard, and agent JSONL call
  `send()` with serialisable commands.
- Scheduling stays on `Envelope.at`. Command shapes do not grow independent time fields.
- Parameter facts derive from the parameter and effect registries. A new parameter is declared once
  and bound once, and a value lookup is (instance, param)
  ([0030](decisions/0030-effects-are-instances.md)).
- Raw files, audio nodes, functions, and browser permission objects never enter commands or the
  durable session.
- `buildDeckChain(BaseAudioContext)` remains the one production signal path for live, headless,
  offline, fingerprint, and export hosts.
- Durable edits participate in bounded history, persistence, portable archives, and graph restore
  unless a decision proves why they do not.
- Per-frame playheads, meters, cursors, and gesture drafts use refs and the existing frame loop,
  never React state or another RAF loop.
- Async work carries source or operation identity, so a stale completion cannot overwrite newer
  state.
- Analysis is not a pure function of stored bytes: `decodeAudioData` may resample to the device's
  rate, so onsets differ across machines. Nothing durable may rest on derived analysis.
- A view preference, such as snap, theme, or whether the debug console is open, is not session
  state: no command, nothing durable, no history entry.
- Durable shape changes freely while pre-release. Stored data that no longer validates is
  discarded, never migrated ([0026](decisions/0026-pre-release-has-no-migrations.md)).
- No new dependency is added without approval and a statement of what it replaces.

## 3. Proof and delivery

`./scripts/check` is the full gate. It may get slower as the instrument gets bigger, but no single
feature may move its mean by more than 250ms without asking the human first
([0012](decisions/0012-no-one-feature-jumps-the-gate.md)). Each feature adds the cheapest proof at
the layer that owns the behavior:

- pure normalization, analysis, and DSP assertions in colocated Vitest tests;
- command, event, history, and failure atomicity through `createInstrument` and its manual clock;
- graph scheduling and sound through the existing live and offline browser run;
- UI focus, pointer, and file handling in the existing preview smoke;
- export parity by comparing every encoded sample with the shared graph buffer.

One fact has one emitter. `probe()` reports durable and session state, the event log reports
discrete behavior, and `peek()` and `peaks()` stay allocation-free continuous and sample-derived
reads. A UI ring drop is loud. A sequence gap in `./scripts/drive` is always a bug.

**The gate's headroom is not where it looks, and 0012's line applies to about one step.**
`./scripts/check` runs eleven steps concurrently and its wall clock is one of them. Measured over 35
runs at `88173b2`, `drive` costs 7425ms of a 7471ms mean, and the second-slowest step, `test`,
finishes 4747ms earlier. Everything that is not a browser scenario therefore has about 4.7s of slack
before it moves the gate at all, so a feature may add two seconds of Vitest and cost nothing. A
browser scenario's cost lands on the mean one for one. Inside `drive` the chain is `vite build`
(465ms, serial) then the 41 scenarios of `scripts/smoke.d/browser.js`, driven in order on one page
(5967ms). The six parallel `./scripts/drive` subprocesses beside it are free, the slowest finishing
3.5s early.

Measure a change by stashing it and comparing means across several runs, **interleaved**. A single
run's spread is wider than most features cost, one lucky measurement has already produced a wrong
figure twice, and fourteen pristine runs of one unchanged commit, split into two windows fifteen
minutes apart, read 7506ms and 7920ms. That is a 414ms drift, 1.7 times 0012's own step size. Never
quote a mean measured in a different window from the one it is compared against.

The smoke was long thought to sit near a non-linear cliff, where browser work added _before_
`persistenceSmoke`'s `page.reload()` stalled the reloaded page's audio clock. It did not reproduce
at `88173b2`, at 4 times the threshold that was supposed to stall nearly always. The ordering rule
below is kept for a stall nobody can currently find, and the mechanism still needs Chromium-side
tracing.

A popover the driver clicks through is the other measured trap. Playwright waits out a popup's enter
and exit animations before it may click, which cost one scenario about 450ms after the reload and
1.68s before it. A popup whose entries `./scripts/drive` presses opens instantly
([0056](decisions/0056-an-effect-carries-its-own-icon.md)).

Offline `render()` calls are the cheap place to prove sound. They join underneath the deck fixture's
real-time waits and cost close to nothing. New browser work that cannot be a render picks one of the
browser half's three lanes and states what that lane's page must already hold in its prelude, rather
than reading what a neighbouring scenario happened to leave
([0238](decisions/0238-the-browser-smoke-runs-in-lanes.md)). The reload ordering rule above is a rule
about the chain lane, which is the only one that reloads.

When a feature changes a data boundary, graph lifecycle, or ownership rule, write the decision and a
failing seam-level test before broad UI work. Do not turn the driver into a second application by
teaching it feature semantics.

A step run by a subagent gets the standing clauses in
[subagent-prompt.md](subagent-prompt.md): report to a path, watch the test fail, print no new
warnings, waive at the site, four review lenses, interleave base and head. Each is there because a
run paid for its absence, and the cost is named beside it. Paste them. A paraphrase drops the
sentence that made the clause work.

## 4. Not taken

Everything abandoned, narrowed, or landed with a known cost, one paragraph each. Nothing here is
scheduled by being here.

**Crush's loaded factor, measured and kept.** Landing crush (`4f16805`) dropped `./scripts/profile`'s
loaded factor from 26.4x to 16.0x — a flat ~395ms on the 16s loaded render, reproducible across three
interleaved BASE/HEAD pairs with no overlap. It is not the kernel and it is not the node. `scripts/bench`
prices the crush stage at 52ms per three minutes of stereo, the cheapest of the four shipped worklets;
a rack of eight crushes renders faster than a rack of eight pops; and an automator that can draw
nothing but crush is the cheapest pool member after the filter. The whole delta is the draw: HEAD with
`auto.crush` weighted to nought renders in exactly BASE's time, because a ninth entry in
`drawWeighted`'s weight list changes what every later pick selects (`drawWeighted`, src/lib/effectGrowth.ts:156),
and the profile samples one fixed seed. Across sixteen seeds, interleaved in both orders, BASE means
1.236s against HEAD's 1.244s — the same to within 0.6%, on a per-seed spread wider than the delta
itself. So the profile's fixed seed landed in the cheap tail before crush and the heavy tail after it.
Accepted as the new baseline with that reason recorded in `.profile-history.jsonl`, per
[0051](decisions/0051-the-profiler-remembers-its-own-runs.md)'s own rule for a cost that was measured,
attributed, and decided against fixing. Sway and shift each added a pool entry after it and re-rolled the same draw again, this time into a
lighter population: the 16s loaded render is ~110ms faster at `0146628` than at the accepted point,
reproducibly and interleaved, which is the same artefact reading the other way and is why no second
baseline reset was taken. The shift kernel's own price, for the record, is 186ms per three minutes of
stereo — under half of pop's, which already ships. The observation underneath it — that a loaded factor resting on
a single seed's draw will re-roll under any pool change, and so measures the population as much as the
code — is about `scripts/profile` rather than about crush, and is not taken here.
