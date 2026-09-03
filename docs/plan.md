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

Six things a hand found in one sitting, in two places. Two are the song list: it has one bin per
song and no word for the lot, and taking a song away leaves the hand holding nothing. Four are the
picture: a yard playing a sample straight through has no picture at all; the popped-out window
grows the picture with itself until the beats are gone; two delays wash the strip to the ground
colour and the Time knob barely moves the echoes; and a wet knob should be, visibly, how much of a
look is standing — all the way to none.

What the research found, and what each step stands on:

- **Songs have no command of their own.** A song is a tier of `PlayerSpec.songs`
  (src/lib/playerSongs.ts:83) and every gesture rebuilds the spec and sends one `deck.player`
  (src/ui/PlayerGridPick.tsx:250). Removing one is `songRemove` (src/ui/PlayerGridPick.tsx:278),
  which filters the list and picks `null`. The pick is a view preference on the yard
  (src/ui/Deck.tsx:207, `GridPick` at src/ui/PlayerGridCell.tsx:35), resolved by id against the
  live list (src/ui/PlayerGrid.tsx:135), so a stale pick is no pick. The section heading is a bare
  `Says`-wrapped `Toggle` (src/ui/PlayerGrid.tsx:285), not the `justify-between` row the rack's
  heading is (src/ui/EffectRack.tsx:400). The one clear-all in the app is the rack's
  (src/ui/EffectRack.tsx:414-442): a `Popover` whose trigger carries no command, a `PopoverTitle`
  saying how many are going, and a `variant="destructive"` confirm — copy at src/lib/copy.ts:438-457,
  `clearEffectsCommand` at src/ui/actions.ts:175. There is no focus management in the list at all;
  the one imperative focus in the app is src/ui/KnobReadout.tsx:145.
- **The picture's gate is a period, not a loop flag.** `loopPeriodSecs(null, rate)` is nought
  (src/lib/recurrence.ts:18), and nought switches off the reference row
  (src/ui/moireRowsField.ts:362), the wash and the session row; with nothing else standing the set is
  empty and the strip draws nothing (src/ui/MoireStrip.tsx:645). Loading a file sets `loop: null`
  (src/app/execute.ts:224). Animation is already off `state.playing` (src/ui/moireRows.ts:761), the
  age is off `sounding`, and the window already survives a missing loop (src/lib/moire.ts:70).
  0274 says a yard with no loop rests in the middle; 0196 already reads the whole file's cut as the
  reference row's rest.
- **The lattice is a fraction of the height and the pitch drifts with the width.** The popout is
  720×480 by default and whatever the hand makes it after (src/ui/popupWindow.ts:25); the canvas is
  the window at device pixels (src/ui/canvasSurface.ts:82). The lattice's cell is
  `height / shape.cells` with `LATTICE_CELLS = [1, 4]` cells per _picture_
  (src/ui/moireCanvasPattern.ts:152, src/lib/moireLattice.ts:115): a 350 px cell at 1400 px.
  `gratingPitch` (src/lib/moireGrating.ts:119) rests at `PITCH_PX·dpr` — the seven-pixel lattice —
  but its width term `across = width·period/windowSecs` climbs with the canvas at `PITCH_COMPRESS`,
  so a wide window pins rows at the `14·dpr` ceiling, and two rows on one pitch do not beat (0131).
  The film's pitch is fixed CSS pixels (src/ui/moireScreen.ts:54,61), which is why the picture reads
  as scaled up against it. Curved tiles are keyed on the canvas size (src/ui/moireCanvasCurved.ts:125)
  and baked one a painting (`BAKES_PER_PAINTING`, src/ui/driftTiles.ts:65), so a big window is also
  a long queue of picture-sized bakes.
- **The echoes add alpha and nothing normalises the chain.** `echoesPass`
  (src/lib/moireLook.ts:383) lays the field and then up to `ECHO_CAP` copies `source-over` at a
  geometric alpha under `ECHO_CEILING`. `passLooks` (src/ui/moireCanvasField.ts:78) hands each pass
  the last pass's surface, so a second delay repeats an already-repeated field and coverage unions
  toward one — and the field is a hole mask cut out of the inked screen (src/ui/moireCanvas.ts:603),
  so full coverage is the ground colour. 0282's own shots read a falling mean: 0.225 dry, 0.195 at
  one delay, 0.142 at two. The rows have the normalisation the chain lacks: `gratingDepth` is
  solved so the picture's mean does not say how many rows stand (src/lib/moireGrating.ts:16,38).
  Time reaches the look only as `spacing`, a linear turn over 0–2 s into `ECHO_SPACING = [1/48,
1/12]` of the width (src/lib/moireLook.ts:308): the musical 0.1–0.6 s is turns 0.05–0.30, under
  two per cent of the width end to end. `delay.time` has `min: 0`, and a log range asserts a positive
  floor (src/lib/range.ts:22).
- **A wet knob already is the look's presence, and a look at nought is dropped.** Every entry with a
  mix or wet declares it as `presence` (delay.ts:57, crush.ts:87, pop.ts:115, reverb.ts:95,
  sway.ts:104, shift.ts:123, tape.ts:105); presence travels into `at` over `SHAPE_SECS`
  (src/ui/moireLooks.ts:107), every pass returns the field untouched at nought, and a look whose
  presence and `at` are both nought is compacted out of the set (src/ui/moireLooks.ts:108) — no
  pass, no cadence cost, no reduction. Nothing pins that property across the registry, and the
  band and the squash refuse to weigh one knob twice (src/lib/moireBand.ts:59, src/lib/moireSquash.ts:44).

**Decided before planning** (2026-09-02): five steps in this order, each with its own gate and,
where it constrains a later change, its own decision. songs-01 landed as
[0291](decisions/0291-a-removal-hands-the-list-over.md) and picture-01 as
[0292](decisions/0292-a-yard-with-no-loop-loops-the-whole-file.md); the next free decision number
today is 0293.

1.  **A song list has a word for the lot, and taking a song away hands the next one over.** _(songs-01)_
    The songs heading takes the rack's row shape and, only while there is a song to take, a
    `Clear All` at its far end — trigger without a command, title with the count, destructive
    confirm — copied from src/ui/EffectRack.tsx:414-442 with its strings in src/lib/copySongs.ts
    (copy.ts is at the cap). The confirm patches `{ songs: [] }` and picks nothing, one `deck.player`
    and so one undo; it sends `gesture.end` first so it cannot fold into a song edit made inside
    `GESTURE_IDLE_MS` (src/app/history.ts:42). In the same step `songRemove` computes the survivors
    once and picks the song that slid into the removed index, else the one before it, else `null`
    (the part-remove line at src/ui/PlayerGridPick.tsx:329 is the precedent: a remove keeps the
    hand's aim). The edit row then re-renders for the neighbour, which is the app's own idea of
    selected; and keyboard focus follows it, through a callback ref on the row's own Remove button
    in the shape src/ui/KnobReadout.tsx:145 already uses, gated on a ref flag so an ordinary pick
    never steals focus from the pointer. Selection stays `useState` on the yard: no command, nothing
    durable (plan §2). **Landed, [0291](decisions/0291-a-removal-hands-the-list-over.md)**: the
    control and the press it sends are src/ui/PlayerSongsClear.tsx, because the heading's row put
    src/ui/PlayerGrid.tsx over the 400-line warning and the split is what the cap asks for; `Clear
All` is now `CLEAR_ALL_LABEL`, said once in src/lib/copy.ts for both headings, and the foot
    line's `partNamed` moved to src/lib/copySongs.ts beside the two sentences it is written with,
    which is what paid for the row's own lines. The browser proof is
    scripts/smoke.d/playerRate.js: the removal's neighbour and `document.activeElement` after it,
    and the clear reached by keys with the count read off its title. The review moved two things:
    the word is absent while the pattern draws its own arrangement, the state three lenses found it
    live in, and the gesture is ended after the patch as well as before it, or the next song added
    inside the idle window joins the clear's entry.
2.  **A yard with no loop is a yard whose loop is the whole file.** _(picture-01)_ The period is
    derived in one place (src/ui/MoireStrip.tsx:178) and that place answers the file's own length at
    the deck's rate when there is no loop: `loopPeriodSecs(loop, rate) || duration / rate`. That one
    value re-arms the reference row, the wash, the session row and the window unchanged, and
    `paintsPerFrame` animates it off `playing` as it already does. A yard with nothing loaded has
    `duration === 0` and stays empty, which is what makes the seam safe. The ground follows the
    same rule — the whole file is the loop it stands on, so `loopStand` reads it and the yard no
    longer rests in the middle — and the decision amends 0274 to say so. **Landed,
    [0292](decisions/0292-a-yard-with-no-loop-loops-the-whole-file.md)**: the fallback is that loop
    said literally — `loopPeriodSecs(loop ?? { in: 0, out: duration }, rate)` — so the file's period
    is `loopPeriodSecs`'s own answer rather than a second arithmetic beside it, and a yard with
    nothing loaded answers 0 through the same call. The two things the period could not be handed to
    are the jumps module and the ground's travel: `gridOf` answers null without a loop, so the whole
    question is one export the sound and both pictures ask (`loopJumps`, three callers), and
    `groundTravel` takes its fallback only where there is a loop for the move to be about — the
    review found half a file is minutes of gliding after a loop is cleared. The shot is `deck.load` + `deck.play` with no loop, settled past
    `SHAPE_SECS` and read twice against a looped yard read twice: base drew no strip at all, head
    drew one at mean alpha 0.227 both times — the looped yard's own 0.227 — and the 1:1 crop is
    fringes on the file's period. Four lenses, four findings kept: the shared `loopJumps`, the
    travel, the stale sentences in `referenceInto`, `washInto`, `sessionInto` and `moireWindowSecs`,
    and the long file's pitch, which is §4's.
3.  **The picture holds its pitch when the window grows.** _(picture-02)_ The lattice's cell becomes a
    size in CSS pixels declared beside `PITCH_PX` — a few multiples of seven — and
    `latticeCells` becomes the presence-weighted _tightening ratio_ over that rest rather than a
    count per height, so `aimLattice` reads `cells = height / (cellPx · dpr)` and the grid is the
    same grid at the strip, the overlay and a 1280×1400 window. `gratingPitch`'s width term is
    normalised against a reference width rather than the raw device width, so a wide canvas does
    not push its rows onto the ceiling where they stop fringing. Two single-expression changes;
    the decision is written against 0109 (one picture at two sizes now means one _pitch_ at two
    sizes) and 0278. The bake queue is not this step's: it is measured and, if a 1280×1400 window
    starves the curved rows, goes to §4 with its number.
4.  **A wet knob is a look's whole presence, and the picture says so at every setting.** _(picture-03)_
    The plumbing is landed; what is owed is the proof and the shot. One registry-walking case in
    src/ui/moireLooks.test.ts: every entry owning a mix or wet parameter names it as
    `presence.param`, and one chain case per pass that a look at `at: 0` draws the field once and
    leaves it exactly as it was — the property the user asked for, pinned so the next effect cannot
    forget it. Then the shot: one yard per wet-knobbed effect at a quarter, half and full mix,
    read at the crop. If the fade is not legible — the passes are linear in `at` where the eye
    reads coverage on a log — the step reshapes the travel from `at` into the pass's share, once,
    in `weighed` (src/lib/moireWeigh.ts:25), and never by adding `mix → amount` to an entry whose
    presence is already the mix (that squares the knob, which 0287 and 0288 refused). No shot, no
    reshaping.
5.  **Two delays are twice the repeats and never a whiter picture, and Time is the knob that spaces
    them.** _(picture-04)_ The chain gets the number it lacks: a count of standing echoes passes,
    reduced in src/ui/moireLooks.ts beside `looksWarp` and weighed into each echoes pass's ceiling
    so that N delays share one `ECHO_CEILING`'s worth of added coverage — the union is bounded the
    way `gratingDepth` bounds the rows — while every instance still draws its own repeats in its
    own slot (0279's "two of one kind are two passes" stands; what is shared is the alpha, not
    the pass). The bound is on a reduction the passes are handed, not a fill and not a read-back
    (0269, 0129). For Time: `delay.time` gains a positive floor (ten milliseconds; a zero delay is
    no delay) and `curve: "log"`, so the musical window spans most of the knob and the look's
    `spacing` term with it; `ECHO_SPACING` opens at the top until a long delay reads as repeats
    standing apart, and `spacing` also lengthens the fade so a long delay reads as slower repeats.
    The floor and the curve change the knob's feel as well as the look, which is the point, and are
    a free shape change pre-release. All of it amends 0282, whose numbers were the argument for the
    current band, and all of it is re-shot at one, two and three delays.

**The outcome wanted:** a song list that can be emptied in one asked-for press and that keeps the
hand's place when one song goes; a picture for every yard that is sounding, loop or no loop; a
popped-out picture that is the strip's picture bigger and not coarser; a wet knob that reads as
how much of a look is standing, to none; and a rack of delays that reads as more repeats and never
as a whiter strip.

## The two things every step turns on

1.  **A fact is derived once, and the step moves it where it is derived.** The period at
    src/ui/MoireStrip.tsx:178, the lattice's rest at src/lib/moireLattice.ts:115, the pitch's width
    term at src/lib/moireGrating.ts:130, the echoes' ceiling at src/lib/moireLook.ts:352, the
    delay's own declaration at src/audio/effects/delay.ts:18. No step adds a second place a
    picture-sized number is decided, and no painter code names an effect (0279).
2.  **A view is a view.** The pick and the focus stay on the yard's `useState`; clearing the songs
    is one `deck.player`; the picture stores nothing (0131). Nothing here adds a command, a
    durable field or a history entry the rules in §2 do not already own.

## Tests that must fail first

- **src/ui/PlayerGrid.test.tsx** — the heading offers `Clear All` only while a song stands; the
  trigger carries no `onClick`; the confirm patches `{ songs: [] }` and picks nothing. Beside the
  pick cases. And a `createInstrument` case in the shape src/ui/EffectRack.test.tsx:389 takes:
  one press is one history entry, even inside a song edit's idle window.
- **src/ui/PlayerGridPick.test.tsx** — beside line 149: with two songs, removing the first picks the
  second; removing the last picks the one before it; removing the only one picks `null` (the case
  already there stays green).
- **src/ui/MoireStrip.test.tsx** — line 129's "draws nothing for a yard holding a pattern it has no
  loop to jump around" is rewritten to draw: a loaded, unlooped yard has a reference row on the
  file's own period. Line 113's "a yard running nothing" stays empty. src/ui/moireRowsGround.test.ts:85
  moves off the middle onto the file.
- **src/ui/moireCanvas.test.ts** — lines 727 and 733 pin `cell = height / cells`; they become a
  cell of the declared pixel size at two heights. Lines 354 and 446 pin `gratingPitch` at width
  400; they gain a wide-canvas case where the pitch stays inside the band and off the ceiling.
- **src/ui/moireLooks.test.ts** — the registry walk over mix and wet parameters; the echoes count
  reduction beside `looksWarp`'s (line 164's shape): one delay claims the ceiling, two share it,
  a bypassed one counts nothing.
- **src/ui/moireCanvasChain.test.ts** — per pass, `at: 0` draws once and `fills(absent) ===
fills(plain)`; the echoes case at line 208 takes the shared ceiling.
- **src/lib/moireLook.test.ts** — line 259's echoes case takes the opened band and the fade's new
  dependence on spacing; **src/audio/effects/registry.test.ts** or delay's own — a Time of nought
  is refused by the floor.

## Verification

1.  Per step: `./scripts/fix`, then `git diff --stat` to check the autofix took nothing else with
    it, then `./scripts/check` read whole. Each new test watched failing before the change.
2.  The songs, in the browser: scripts/smoke.d/playerRate.js:284 already removes a song; it gains
    the neighbour's pick and `document.activeElement` after, and a Clear All press-through with the
    count read off the title. A popover the driver clicks through costs its animations (§3), so
    the confirm is reached by keys.
3.  The picture, per picture step — `./scripts/drive --dev --shot DIR`, the `{"shot":…}` swing and a
    1:1 crop, never the whole-canvas view. picture-01: a `deck.load` with no loop and a play,
    before any `effect.add`; the strip must draw, and its mean must sit inside the band a looped
    yard's does. picture-02: the popout at 720×480 and at 1280×1400, the cell measured at the crop
    and the same at both; then one hand-look at the big window for the beats coming back. picture-03:
    one yard per wet-knobbed effect at quarter, half and full, read at the crop. picture-04: one, two
    and three delays at the default Time, the mean ink read against the dry yard and never falling
    past what one delay already costs; then a short and a long Time side by side, the repeats
    visibly further apart at the long one.
4.  `./scripts/profile` at the end of the block, against the ~10.4ms frame p95 band. picture-02 is
    the one step that could move it (the lattice pattern and the bake queue at a new size) and its
    number is read inside its own gate.
5.  A decision record per step where one is owed: picture-01 amends 0274, picture-02 amends 0109
    and 0278, picture-04 amends 0282. songs-01 wrote 0291, for the neighbour a removal picks and the keyboard
    that follows it;
    picture-03 records only if the fade is reshaped.

## Refused

**A `song.clear` or `song.remove` command.** `deck.player` carries every song and is the one road
(src/ui/PlayerGridPick.tsx:250, 0089). A second road is a second writer to answer in history, in
persistence and in the archive for a gesture that is already one command.

**Selection or focus in session state.** A pick is what the hand is about to change and nothing
else (0275, plan §2). Making it durable buys a restored cursor at the price of a history entry per
click.

**A `Clear All` that stays as a disabled word over an empty list.** 0121 keeps a bound visible, but
the rack's own clear-all hides on empty (src/ui/EffectRack.test.tsx:423) and two list headings that
disagree is the worse fault.

**A loop-shaped fallback anywhere but the period.** Synthesising a `Loop` for a loopless deck, in the
store or in `MoireStrip`, would hand the picture a loop the deck does not have and the rest of the
app a second meaning for `loop: null`. The period is the one number every switched-off row reads.

**Clamping the popout.** The browser remembers the hand's size against the window's name
(src/ui/popupWindow.ts:20) and a picture that is only right at one size is the fault the step is
fixing, not a size to enforce.

**A wash cap drawn as a fill, or read back from the field.** A fill is the thing 0269 refuses and
a `getImageData` on a frame the thing 0129 refuses; the chain's bound is arithmetic on the looks'
own numbers, as `gratingDepth` is on the rows'.

**Summing echoes by kind into one pass.** Two delays are two passes in two slots, and the order
between them is a fact the picture keeps (0279). What is shared is a ceiling, not a draw.

**`mix → amount` on an entry whose presence is the mix.** It squares the knob. The band and the
squash refused it with reasons (0287, 0288) and the reasons hold for every wet knob.

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
