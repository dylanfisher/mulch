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

A block that adds N of one thing — a look per effect, a sketch per question, a worklet per entry —
names the file layout before its first step: one file per thing from the first, with its `@role`
line and its map.md row, rather than one file that hits the 800-line cap and pays a split on four
consecutive steps.

## Context

One thing a hand found on the structure bench (`#/structure`, uncommitted,
[0295](decisions/0295-the-structure-bench-is-its-own-route.md)): of the seven ways to make the
automator's mark on the picture plain, **The Shards** is the one that reads. Its picture is the
Bite torn along the escape count's own cross-section — every horizontal slice slid across by a
cosine of the count read at the picture's centre column at that slice's height, every column slid
down by the same read along the centre row a quarter turn off. Shot off the running dev server
(canvas 4, 480×160): where the filigree is dense the throws are unrelated slice to slice and the
picture reads as torn; where the plane is open the throw is one slow wave and the weave reads as
bent. The tear reaches every straight row without a bake, and its shape is the structure's own.

What the research found, and what the step stands on:

- **The automator's look is the fold, and a look has one landing.** `look: "fold"` at
  src/audio/effects/automator.ts:186, `LOOKS.fold = { at: "bake", terms: {} }` at
  src/lib/moireLook.ts:578; `Look` is a union keyed on `at` (src/lib/moireLook.ts:143), and the
  registry refuses a look two entries share (src/audio/effects/registry.ts:116-141). 0295's own
  review found the fold reads as a faint bend in two curved rows under an unmirrored weave. Its
  whole footprint: `looksFolds` (src/ui/moireLooks.ts:196), `foldsOf`/`steppedFolds`
  (src/lib/moireFold.ts), `DriftPlace.folds` and the fold branch of `curvedField`
  (src/lib/moireGeometry.ts:148-153, 190-240), the `folds` param and `|${place.folds}` key
  segment of `placeCurved` (src/ui/moireCanvasCurved.ts:89,113,125), `folds` through
  `cutGratings` (src/ui/moireCanvas.ts:299,371,576,590), `folds: 0` at
  src/ui/moireCanvasPattern.ts:89. `foldPlane`, `kaleido` and `FOLD_CAP` are also the bench's
  Kaleidoscope's, and stay until `src/ui/sketch/structure/` goes.
- **The cut already reads the field back in slices, and takes a column pass only when warped.**
  `cutField(context, field, rows, looks, shape, veer, clock)` (src/ui/moireCanvasField.ts:143)
  slides each of `LENS_SLICES` bands by the lens, the warp's first sine and the shatter's
  whole-piece offset, wrapped into one width; `between` is made only when `bent > 0` and the
  column pass slides by `warpSlideY(...) * height`. `cutAcross`/`cutDown` cover any offset inside
  one width or height with the copy either side of the edge.
- **The seed the tear reads is already resolved once a painting.** `roamed` is a module-level
  `FractalStops` (src/ui/moireCanvas.ts:144) filled by `fractalRoamInto` inside `cutGratings`
  (line 310) and never handed to the cut; `fractalSeedInto(out, stops, zoom, fly)`
  (src/lib/moireFractal.ts:299) denormalises it; `escapeTurns(u, v, cx, cy, zoom, fly)`
  (src/lib/moireFractal.ts:619) is 120 iterations a read; `geometryRef(width, height)` is the
  radius the bench reads against too (`FIELD_REF`, src/ui/sketch/structure/sketchStructure.ts:40).
- **Whole looks live in files of their own.** src/lib/moireLook.ts is at 679 lines and
  `moireBand.ts`, `moireSquash.ts`, `moireDouble.ts` and `moireEchoes.ts` each hold one look's
  terms, constants, maths and declaration together (0287-0289, 0294).
- **Every reduction of the rack is allocation-free and travelled.** `looksShatter` fills a kept
  list in place (src/ui/moireLooks.ts:251-270); an automator's presence is `none` and so stands at
  one (src/ui/moireLooks.ts:57-67), travelled into `at` over `SHAPE_SECS` and drained through
  `carryLooks`.
- **The scatter's own shatter is a separate reduction** (`looksShatter`, `shatterSlide`), and 0279
  forbids one dial on two hands; 0269 says every band is drawn once at one alpha, from where it
  belongs or from elsewhere, never a blend.

**Decided before planning** (2026-09-02): one step. The fold is replaced and not kept beside the
shards — a look has one landing, and pre-release deletes are free. No bench step first: the bench
already made the one-automator argument, and several automators are proved by the shot on a real
yard holding two. structure-01 landed as
[0296](decisions/0296-the-automator-shards-the-picture.md) on 2026-09-03; the zoomed picture went
unphotographed (the headless smoke starves on the run's ghosts and no real browser was reachable),
and the strip's crops carried the proof. The next free decision number today is 0297.

1.  **The automator shards the picture, and every automator standing is a tear of its own.**
    _(structure-01)_ **Durable shape moved: none.** A new look, declared whole in
    `src/lib/moireShards.ts` beside src/lib/moireBand.ts: `shardsLook = { at: "cut", terms: {} }`
    — no terms, for the fold's reason, how much is torn being how many automators stand. Its
    numbers, each its own (0279): `SHARD_CAP = 4` tears summed at most; `SHARD_REACH = 0.08`, one
    automator's throw as a share of the **height** both ways, as the bench (`SHARDS_DIAL.rest`) —
    height and not the wobble's width, because the strip is 32 px tall and thousands wide and a
    width share thrown down it would wrap the strip several times; `SHARD_CEILING = 0.25`, the
    most any slice is thrown summed, three whole reaches, bounded for 0250's reason and not
    derived from `SHATTER_CEILING`; `SHARD_RATIO = 1.5`, the k-th standing automator reading the
    count at zoom `SHARD_RATIO ** k` (the Beat's `BEAT_DIAL.rest`) so two cross-sections' contours
    cross everywhere and the second tear is a different tear rather than the first one deeper;
    `SHARD_PHASE = 0.25`, a quarter turn per automator on the throw's cosine, because zoom alone
    leaves the slow middle slices nearly in step; `SHARD_TURN = 16`, moved here from the bench's
    `STRUCTURE_TURN`, which the bench's `wave` then imports; `SHARD_DOWN = -0.25`, the down throw a
    quarter behind the across. `shardsInto(out: Float64Array, seed, ref, width, height, presences,
standing)` fills `out[0..LENS_SLICES)` with each slice's across throw and
    `out[LENS_SLICES..2·LENS_SLICES)` with each column's down throw: per automator, per slice, the
    count at the slice's middle on the centre column (or the centre row) in reference radii,
    `presences[i] · SHARD_REACH · cosTurn(count / SHARD_TURN + i · SHARD_PHASE [+ SHARD_DOWN])`,
    summed and then **clamped** to ±`SHARD_CEILING` — clamped and never normalised, so a second
    automator adds to the first and only the peaks flatten. `fly` is nought: the roam is
    continuous and is the plane the picture already stands on, so the tear moving with it is the
    field moving under it and no motion of its own (0126); the breath is the rows' baked ladder,
    and a frame-side read of it would be a second scale (0261). At most 4 × 128 kernel reads a
    painting, no allocation (0070), no read-back (0129).
    The reading is `looksShards(looks, into: Float64Array): number` in src/ui/moireLooks.ts,
    replacing `looksFolds`: every `shards` look's travelled `at` in rack order, stopping at the
    cap. The cut (src/ui/moireCanvasField.ts) takes an eighth argument, the painter's `roamed`
    stops, keeps one `Float64Array(2 · LENS_SLICES)`, one `Float64Array(SHARD_CAP)` and one
    `fractalRest()` as module scratch, and where anything stands seeds them with
    `fractalSeedInto(thrown, stops, 1, 0)` and fills the table; its early-out gains `standing <= 0`,
    `between` is taken when `bent > 0 || standing > 0`, the across slide gains
    `throws[slice] · height` before the shatter's wrap (taken whenever `off > 0 || standing > 0`),
    and the column pass adds `throws[LENS_SLICES + slice] · height` to the warp's sine. Every band
    is still cut once at one alpha (0269). src/ui/moireCanvas.ts passes `roamed` at the cut and
    drops `folds`. src/lib/moireLook.ts: `LOOK_NAMES` gains `"shards"` and loses `"fold"`,
    `LOOKS.shards = shardsLook`, `LookAt` loses `"bake"`, and every comment that counts "three of
    the four kinds" is rewritten (moireLook.ts, moireLooks.ts `looksPaintMs`, moireCanvasField.ts,
    moireShape.ts). src/audio/effects/automator.ts declares `look: "shards"`. The fold is deleted
    across the footprint listed above; src/lib/moireFold.ts keeps `kaleido`, `foldPlane` and
    `FOLD_CAP` for the bench and says so in its `@role`. The bench loses the entry whose argument
    won (0247): `SketchStructureShards.tsx`, `shardsField`, `SHARDS_DIAL`, `SHARD_SLICES`, the
    `shards` entry in src/ui/sketch/StructurePage.tsx and its test block; the route's uncommitted
    files land with this step. Decision
    `docs/decisions/0296-the-automator-shards-the-picture.md`, amending 0278 and 0279 inside
    0269's rule and standing on 0295: one cross-section per automator, the sum clamped in shares
    of the height, one automator visible where one scatter is nought and why (an automator's
    presence is `none` — it is in the rack or it is not), fly held at nought, the table filled once
    a painting off the roamed stops, the column pass taken for the shards as for the warp, the
    fold's bake ladder gone, and the shot's numbers.

**The outcome wanted:** a yard holding one automator whose straight rows visibly break across a
tear the shape of the structure's own cross-section, and a yard holding two whose picture reads as
two tears at different pitches crossing — never one tear drawn twice as far — with nothing baked
for it and the fold's ladder of bakes gone.

## The two things every step turns on

1.  **A fact is derived once, and the step moves it where it is derived.** The throw table is filled
    once a painting inside the cut off the stops the painter already roams; `SHARD_TURN` is the one
    turn the bench's remaining entries read; the cap, the reach, the ceiling, the ratio and the
    phase are each one constant in src/lib/moireShards.ts and nowhere else.
2.  **A whole-field move is a declaration on the entry and a draw of the field, never a fill over
    it** (0279, 0269). The shards are the automator's declared look at the cut, drawn as slices of
    the finished field slid by a table, and every band lands once at one alpha.

## Tests that must fail first

- **src/lib/moireShards.test.ts** (new): nought standing fills nought; one automator's across table
  is non-zero, bounded by `SHARD_REACH` and has many distinct values (a tear, not a shift); the
  down table differs from the across; index 1 alone differs from index 0 alone; two together are
  the elementwise sum where under the ceiling; `SHARD_CAP` automators never pass `SHARD_CEILING`;
  half a presence halves its term; the same inputs fill the same table.
- **src/ui/moireLooks.test.ts**: `looksShards` fills one per automator in rack order, a bypassed one
  in none, stops at the cap, 0.5 half-way through `SHAPE_SECS`; the rack at line 117 reads
  `"shards"`.
- **src/ui/moireCanvasField.test.ts** (harness at 145-217): one `look("shards")` with no lens, warp
  or shatter takes the column pass, slides 64 bands by distinct amounts all under
  `SHARD_CEILING × height`, cuts every band once at alpha 1 with `fills` equal to plain; two shards
  keys throw differently from one and at least one band further; no shards look draws the field
  once, whole. Line 226's `look("fold")` leaves the "steps over" rack — the shards are a cut.
- **src/lib/moireLook.test.ts** / **src/audio/effects/registry.test.ts**: `LOOKS.shards.at ===
"cut"` with no terms; the automator declares it; `"fold"` and `"bake"` are gone (fixture at
  registry.test.ts:42, the claimed set at 392).
- **src/ui/moireCanvasTiles.test.ts**: the fold's bake case (686-720) and `folding` helper go; a
  curved key carries no fold field. **src/lib/moireGeometry.test.ts** "curvedField folded"
  (552-610) and `folds:` fields go; **src/lib/moireFold.test.ts** `foldsOf`/`steppedFolds` (82-92)
  go; **src/ui/driftTiles.test.ts:61** `folds: 0` goes.
- **src/ui/sketch/structure/sketchStructure.test.ts**: the shards block goes with the entry.

## Verification

- `./scripts/fix`, `git diff --stat` for collateral, then `./scripts/check` read whole.
- Browser proof: a JSONL like fixtures/deck-smoke.jsonl (`deck.load` click-train, `deck.loop`,
  `deck.play`, wait) through `./scripts/drive --shot DIR` with no automator, one (`effect.add …
automator`, as scripts/smoke.d/narrow.js:40 does) and two, interleaved; read each `{"shot":…}`
  mean and swing and the 1:1 crop, and the zoomed drift via scripts/smoke.d/drift.js. What must be
  seen: at one automator the straight rows break across the tear; at two, two tears at different
  pitches crossing. Written up in 0296 as 0290 did, saying what the shot cannot isolate — an
  automator also grows effects, so the yard's rows change with it; the count's own effect is
  proved at the cut.
- `./scripts/profile` at the end: frame p95 stays in the 9–11 ms band.

## Refused

**Keeping the fold beside the shards.** A look has one landing and one draw (src/lib/moireLook.ts:137-145);
two draws off one declaration is the dishonest declaration 0279 was written to refuse, for a fold
0295 already found illegible.

**Normalising the sum to the ceiling.** It would shrink the first tear as a second automator
arrives — the picture _less_ torn for a moment by more automators, the opposite of the step.

**Reading the flight or the breath into the tear.** Both are stepped ladders on the tiles; a tear
that stepped with them would snap where the rows crossfade (0126, 0261). The roam is continuous
and is enough.

**A bench step with a count dial.** The two numbers it would pick by eye (`SHARD_RATIO`,
`SHARD_PHASE`) are picked by the shot on a real yard instead, which is the proof the step needs
anyway.

**Shares of the width for the throw.** The wobble's unit, and right for a sideways swim; a down
throw in it wraps the thirty-two-pixel strip several times over.

---

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

**picture-01 leaves a long unlooped file's rack rows on the pitch floor, and hands the number to
picture-02.** The reference row is now the file, so `moireWindowSecs` multiplies the file's own
length by `MOIRE_CYCLES` and the window a rack row is measured across grows with it. At a 2208
device-pixel strip, rack rows at 0.75s, 3s and 12s are drawn at 12.4, 17.5 and 24.8 px on a 4s file
and at 7.0, 7.0 and 9.6 px on a three-minute one — the two short ones pinned to the same
`gratingFloor`, where two rows on one pitch do not beat (0131). It is not a regression: a _looped_
three-minute yard already read exactly those numbers, and an unlooped one drew no rows at all, so
the state that got worse does not exist. It is the band's own behaviour at a long reference, which
is 0278's and picture-02's, and no picture-sized number was added here to bend it.

**picture-02 proved its two sizes by eye, and left the popout unmeasured by the smoke.** The claim
is about the _size_ of the structure the picture draws, and the two numbers a browser reading gives
— the mean and the swing across wide blocks — cannot see it: `gratingDepth` solves the picture's
weight for the count of rows, so the mean is the same by construction, and the coarse swing read
0.049 at 720×480 and 0.049 at 1280×1400 on base and on head alike. A metric that could see the cell
would be the lattice's own maths written a second time in scripts/smoke.d/, which is what principle 1
refuses. So the proof is the photograph: the popped-out window shot at both sizes, base and head
interleaved, hand-looked at 1:1. The other half of the reason is cost — the same reading taken on
the _shaped_ rack (a sway and two automators ghosting feedback rows) starved headless SwiftShader at
1280×1400 and had to be killed after fourteen minutes, which is the ghost-free rule in the harness
notes. What the smoke still asserts about that window is what it asserted before.

**picture-02 left the bake queue at 1280×1400 argued rather than timed.** The step asked for the
queue to be measured at that size. What there is: `./scripts/profile` inside this gate reads a
frame p95 of 10.3ms against the ~10.4ms band with nothing regressed, at the profiler's own window;
and the reasoning, which the state lens checked independently — the lattice's order carries no
picture size (its key is `geometry|profile|rim|LATTICE_TILE_PX`), so a cell of a new size costs a
matrix and no bake, and the curved key already carried `WxH` and so was invalidated by a resize
either way. What there is not is a stopwatch on a 1280×1400 window: the reading that would have
taken one starved, above.

**picture-02 normalised the width and not the window, so a long file still pins its short rows to
the floor.** picture-01 handed over a three-minute unlooped file whose 0.75s and 3s rack rows are
drawn at `gratingFloor`, and that is the window's number: `moireWindowSecs` multiplies the reference
by `MOIRE_CYCLES`, and no reference width changes what a period is a share of. The rows are off the
_ceiling_ everywhere now, which is the half of the band this step was about; the floor at a long
reference stands where 0292 left it.

**picture-03 left the quarter thin on the three entries that read their wet knob twice.** Reverb,
pop and shift each declare `presence.param` on their mix and then map that same knob into the
look's share (`reverb.wet → amount`, `pop.mix → amount`, `shift.mix → amount`), so what reaches the
ceiling is the knob squared: a quarter mix draws a sixteenth of the pass's own ceiling. The shot
says it is thin and not absent — at a quarter, reverb's rows carry a visible halo the dry yard has
not, shift's crop carries a second faint diagonal family and pop's is measurably crisper — and the
crush, the sway and the delay, whose share is a knob of its own, fade evenly across the three
settings. So the step's own condition was not met and `weighed` was not reshaped: bending the
travel there would have driven the five passes whose share is a separate knob as well, on evidence
that only three entries have, and the step's own text refuses the other repair (adding or removing
`mix → amount` squares or un-squares a knob 0287 and 0288 already argued). What is owed, if the
quarter ever reads as nothing, is one entry's declaration and not the shared share.

**songs-01 landed the clear as a file of its own, and paid for it twice.** The heading's row put
src/ui/PlayerGrid.tsx at 402 lines against a 400-line warning, so the control and the press it
sends are src/ui/PlayerSongsClear.tsx, and the foot line's `partNamed` moved out of PlayerGrid into
src/lib/copySongs.ts beside `standingSaid` and `playsSaid` — its two siblings — which is what put
the file back under. The step also promoted `EFFECTS_CLEAR_LABEL` to `CLEAR_ALL_LABEL`: two
headings saying "Clear All" is one word, not two declarations (principle 1), and the rack's own
sentence and confirm stay effects-specific. No decision was owed for the gesture key on its own —
`gesture.end` before a clear is what the rack already does — but the neighbour's pick and the
focus that follows it constrain every list after this one, so 0291 says all three.

**A shared confirm popover is owed and was not taken.** src/ui/PlayerSongsClear.tsx is the third
`Popover` → trigger with no command → `PopoverTitle` counting what goes → `variant="destructive"`
confirm, after src/ui/DeckRemove.tsx and src/ui/EffectRack.tsx, and the `Confirm ${label}` name is
spelled in all three. songs-01 copied it because its own step text said to copy it; the next
destructive question is the one that should land a shared component instead, and the three call
sites are already the same five values.

**picture-04 shared the ceiling on a weighted crowd, and the whole count it was written with was
wrong.** The step's first cut counted the standing looks of a kind whole, and the review named the
failing frame: `looksCrowd` sees a look the frame its instance enters the set, when its own ladder
draws nothing, so the delay already standing was dimmed to two delays' share for the whole six
seconds the newcomer took to travel in — whiter than one delay, in the one direction the step
forbids, and invisible to a shot of the settled state. `looksCrowd` now weighs each look by `at`,
which is `looksWarp`'s own shape, and neither end of a travel steps. What is left unshot is the
travel itself: every reading in this block is of a settled yard, and the claim that the union holds
_through_ an add or a remove is argued from the arithmetic and pinned by
src/ui/moireLooks.test.ts, not photographed.

**picture-04 opened the spacing band and left the top of it argued from one fixture.** The top went
from a twelfth of the width to a sixth on a short-against-long shot of one yard at one size (a swing
of 0.094 against 0.14, the diagonals countable at the crop). 0282 narrowed the same band on a shot
of the same shape, so the number is as well-founded as the one it replaces and no better: what a
long delay reads as on a wide popout, or against a rack whose other looks have already displaced
the field, is unshot. `ECHO_SPACING[1] * ECHO_CAP` is still under half the field, which is the
property the cases pin.

**knob-01 (0307, 0308) leaves the rack's cards re-rendering together, and names two stutters that
are not the knob.** The plan's fifth step — memoising each rack card so one move re-renders one
card — was held back for the measurement, and the measurement left it nothing to take: on the dev
server, a 480-step drag over a ten-effect yard went from six or seven long tasks of up to 60ms to
none, with the whole yard still re-rendering in the transition. What that drag does not touch:
the automator builds effect graphs on a ten-second timer on the main thread, including a reverb
whose impulse is generated synchronously (src/audio/effects/reverb.ts, src/lib/impulse.ts) — a
stutter every ten seconds in a session like the one that raised this is that, not the hand — and
a 900-point lane re-arms as ~900 AudioParam calls every four seconds (src/audio/ramp.ts) while
its dial scans the lane linearly every frame (src/lib/automation.ts). A cursor per lane is a step
of its own; neither is scheduled by being here.
