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
  gone; what 0248 named as residue — order.slot (src/ui/moireCanvas.ts:328) carries the row's own
  at, so the place count re-slots both rows at a turnover — is what still blinks at its edges, and
  moireCanvasTiles.test.ts's "keeps a fractal row's fallback across a seed step" is where the rest
  of it is owed.
- It barely moves — less so than it did. Its one motion is fractalZoom, a cosine breath over the
  picture's window, twelve stops deep; the band that breath opens through is now how long the yard
  has been sounding (`agedOpening`, 0251) and the row itself now travels with the ground the
  reference row, the wash and the module's tiers travel with (0235, 0251). What is left is the
  fly-through: the picture flying through its own structure while it plays, which is a motion of
  its own and not a wider band on the breath.

The outcome wanted: the structure travels between the places a run stands rather than swapping; a
place fading out while another fades in reads as one continuous run and never as an ending; the
picture flies through its own structure while it plays; and the whole moiré is laid back into itself,
so the picture zooms into itself the way the fractal does — the last of which is landed
(`docs/decisions/0250-the-picture-is-fed-back-at-the-depth-the-run-earns.md`) — as are the ground
anchor and the age's own opening
(`docs/decisions/0251-the-structure-stands-on-the-ground-and-opens-with-the-age.md`), leaving the
fly-through as the one item of the four still open.

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
    stays as written.

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
the ground the yard is reading, and both of them on the one ground" (0251). Nothing is owed there
until the fly-through has a step of its own.

src/ui/moireCanvasTiles.test.ts — the ladder is written ("walks a travelling structure up that
same ladder"), and so is the age's own stop on it ("opens a fractal row's tile with the age, and
asks for none between two steps of one", 0251). Still to write: keeps a fractal row's fallback
across a seed step.

src/lib/moireAge.test.ts — nothing is owed. "lays back what a standing run earns, over the band the
age has opened" is written (0250), and so are "opens the structure inside its own band at every age,
and never past the band" and "stands still between two steps of the age" (0251).

src/ui/moireCanvas.test.ts — "lays the whole field back into itself for the run the yard is
standing" is written (0250), beside the `fedRow` fixture rather than through it: the rows come out of
the one builder standing a run, and the lays are told from a curved row's own tile placement by their
composite. No claim here may rest on a whole-picture getImageData read —
the harness stub answers one pixel, and that is the fault that let 0245's compensation ship
(src/ui/moireCanvasPainted.ts:119-129).

Mechanical ripple: moireCanvasPainted.ts:179 and moireScreen.test.ts:172 take paintMoire's new
argument; the local refillRows wrapper at moireRowsField.test.ts:136 pins the two new ones.

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
      run — which is why the ground anchor was taken. Ask it again of the fly-through.
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
which amends 0247's "pick one" to "pick one per fold"; and each of the card's _remaining_ regions
has its own sketches, so a decision can be taken one fold at a time rather than one card at a time.

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
2.  **Every fixture the parts need is hand-written and lives in one file.** `sketchWalk.ts` (148
    lines) holds `SKETCH_WALK` — now carrying the source `slot` each landing reads — plus
    `SKETCH_REACH`, `SKETCH_PARTS`, `SKETCH_BEDS`, `SKETCH_STANDING`, `SKETCH_CHARACTER_WEIGHT`,
    `characterInk` and `SKETCH_CAST`, deterministic so two screenshots of one sketch are the same
    picture. Everything added below extends that file and nothing invents a second fixture module —
    a bench where two sketches draw different made-up walks is comparing fixtures rather than
    surfaces. It has room to grow by half again before the 400-line soft cap.

---

## Step 0254 — The ground and the arrangement

`docs/decisions/0255-the-ground-and-the-arrangement-have-their-own-benches.md`.

`src/ui/sketch/parts/SketchPartGround.tsx` — Which Ground, whose five knobs (`bed`, `bedEvery`,
`bedDistance`, `bedBias`, `bedHome`) are the song's and never a part's (0184), which is itself the
thing to draw:

- the waveform with planted chips on it (`SKETCH_BEDS`), dragged and resized directly;
- the ground as a _deck of cards_ one per bed, with `bedEvery` as how often the deck is cut;
- both under one readout naming which is standing, since "the loop walks the source once, under
  every part in turn" is the fact a hand keeps losing.

`src/ui/sketch/parts/SketchPartArrange.tsx` — How It Is Arranged, the eight `arrange*` knobs, which
are the hardest fold on the card because they are all odds and none of them is a thing:

- the ladder — `arrangeGrow`, `arrangeSpan` and `arrangeApart` as a shape a part climbs, so growth is
  seen rather than set;
- the dice tray — `arrangeChance`, `arrangeKeep` and `arrangeReturn` as three visible odds with a
  hundred pips each, which is the one fold where the drawn-score sketches of 0247 explicitly gave up
  ("a drawn score says what happens, not what tends to happen") and so is the fold most worth a
  surface of its own.

Fixture: `SKETCH_ARRANGE` in sketchWalk.ts — a hand-written run of what the arrangement did over
sixteen passes, so the ladder has something to climb and the tray has something to have rolled.

## Step 0255 — The song builder, and the two folds left

`docs/decisions/0256-the-song-builder-is-the-tier-a-hand-actually-works.md`.

`src/ui/sketch/parts/SketchPartSongs.tsx` — the tier over a part (src/lib/playerSongs.ts): named
songs in an order a hand chose, each carrying how many times it plays, over `SKETCH_PARTS`.

- the timeline — songs as segments on one bar, length is plays, drag to reorder;
- the tracker — a numbered list, one row per song, which is the only one where a long arrangement
  stays readable;
- both showing the cursor standing somewhere, since what a song _is_ is a run and a cursor over it.

`src/ui/sketch/parts/SketchPartSound.tsx` — How It Sounds and How It Is Timed together, one sketch,
because they are the two folds that are already just dials and the argument is whether they need to
be anything else: the honest control (the fold as it stands) beside one alternative (the sound fold
as a single "chew" axis, the timing fold as a subdivision picker), so the bench can conclude "leave
these two alone", which is a real and likely outcome and one no bench currently lets anyone say.

Fixture: `SKETCH_SONGS` in sketchWalk.ts — three named songs with plays and a standing cursor.

---

## Tests that must fail first

`src/ui/sketch/SketchPage.test.tsx` (231 lines) no longer hardcodes any list of ids, and reads the
whole `src/ui/sketch` tree off disk to check it imports nothing from `src/state`, `src/app` or
`src/audio` — both landed in 0254. What each step after it still owes:

- **every corner, blade, lever and planted spot names itself.** The cast's half is written (0252)
  and so is the machine's (0253) and the walk's (0254 — "names the distance, the bias and the home
  inside the roll's own picture"): each case slices the one `renderToStaticMarkup` by the picture's
  own attribute — `data-blend`, `data-machine`, `data-reading` — and asserts every name inside a
  `<text>` there, bounded by that picture's own `</svg>` so it cannot pass on its neighbours. Every
  surface added below extends that shape to its own corners; it is what stops a picture shipping
  unlabelled.

Sizes: SketchPage.test.tsx has room. SketchPage.tsx is 229 lines and each further part is one entry
— if a later step crosses 400 the split is the entry lists into `src/ui/sketch/sketchEntries.ts`,
not prose shaved out of the theses.

`src/ui/sketch/parts/` exists (`SketchPartWalk.tsx`, 378 lines — 22 short of the soft cap, so the
next part is a file of its own and never an addition to this one): each file needs the `@role`/`@instead` header,
and the 0247 `max-lines-per-function` waiver carries to each part sketch for the same stated reason,
written out at each site rather than referred to.

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
      that is 0247's "the day one of them wins" arriving in a shape 0247 did not predict. Open: one
      part is on the bench, which is not enough to pick from.
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
