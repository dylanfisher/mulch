# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device; a performance remains editable, portable, reproducible through
commands, and identical through the live and offline signal paths.

The current baseline is an any-number-of-decks instrument with a durable session, portable
archives, bounded undo/redo, effect racks holding instances, a gesture-relative lane on every
continuous parameter but the read rate, beat-aware loop snapping and sliding, a waveform a click
seeks in without the deck reading as stopped, a loop shaped by labelled IN and OUT handles in
their own strip that draw the boundary each holds down through the peaks and by a Shift-held
sweep of the peaks themselves, Shift meaning the loop and nothing else
([0066](decisions/0066-shift-is-the-loop.md)), per-deck speed and pitch, a clip rack that draws
what it holds, a toggleable
debug console, imports in every format the browser decodes through a picker or a drop on the
waveform, a crop that makes the loop the deck's whole source, audio that leaves through a File
dialog as a named, faded .wav the one render harness produced, playing the whole session for the
whole length whatever the transport was doing when the dialog opened
([0068](decisions/0068-an-export-is-a-render-spec.md),
[0077](decisions/0077-an-export-plays-the-whole-session.md)), a shell whose
routes hang off a menubar, whose fixed header rides over a scrolled instrument, and whose width is
declared once and read by both screens ([0074](decisions/0074-both-screens-read-the-one-shell-width.md)),
controls that carry the primitive their behavior implies and one icon per action from a single
vocabulary ([0055](decisions/0055-a-state-is-a-toggle-and-an-action-has-one-icon.md)), a rack of
one card per instance whose effects are added from a popover the registry renders, each entry
carrying the icon its own plugin declares ([0056](decisions/0056-an-effect-carries-its-own-icon.md)),
each card declaring its own width, reading its type, its ordinal and its drawn name out of its own
durable id, switching its bypass, and reordered by a drag of its own handle onto a landing slot the
wrapped layout resolves — or by the arrow keys on it
([0062](decisions/0062-a-rack-card-is-dragged-by-its-own-handle.md),
[0076](decisions/0076-a-card-reads-itself-out-of-its-own-id.md)),
a newest-first event feed both log surfaces read, decks the interface calls yards, each carrying
an emoji and a generated name of its own drawn when it was added
([0057](decisions/0057-a-deck-is-called-a-yard.md)) from the pool its kind of thing draws from
([0075](decisions/0075-every-kind-of-thing-draws-from-its-own-pool.md)) — an effect instance's
name from an adjective pool times a noun pool, folded out of its own id
([0081](decisions/0081-an-effect-name-is-two-pools-multiplied.md)) — and each carrying a letter the
session spends when it draws it and never hands out again
([0082](decisions/0082-a-deck-letter-is-spent-when-it-is-drawn.md)), each reached through its
own group of capture, duplicate, remove and fold, a copy being one command the reducer expands
into the restoration stage list and a playing yard wearing a recycle mark that is a decoration
rather than a frame subscriber ([0078](decisions/0078-a-yard-is-duplicated-by-one-command.md)),
sample kernels measured and left in JavaScript ([0058](decisions/0058-nothing-qualified-for-wasm.md)),
a header of File and View menus over an instrument whose every label is Titlecase
([0059](decisions/0059-every-label-is-titlecase.md)), an event log that leaves through File as the
JSONL the ring holds ([0060](decisions/0060-the-ring-is-the-whole-exported-log.md)) over one toast
provider at the shell that declares the timeout a toast takes itself away after, a stereo peak
meter on the master bus's own pre-ceiling tap whose two bars run left to right and whose clip
indicator holds for a couple of seconds rather than latching
([0061](decisions/0061-the-master-meter-taps-the-bus-input.md),
[0083](decisions/0083-an-indicator-clears-itself.md)), a clip rack above the yards, each
yard reaching its transport and knobs before its peaks and naming itself in the readout above
them, a debug console counting the audio thread's load, the JS heap and what the decode cache
holds, with a dash for anything the browser will not answer
([0063](decisions/0063-an-unanswerable-counter-reads-as-a-dash.md)) and a tooltip on every label
saying what it counts and in what unit, a ⌘/Ctrl+K palette that is a
second way to send and never a second command, over gestures whose construction is shared by every
surface offering them ([0069](decisions/0069-the-palette-is-a-second-way-to-send.md)), a per-frame
path measured end to end rather than argued about — one loop, reads that refill their scratch
instead of clearing it, and paints that write only what moved
([0070](decisions/0070-a-per-frame-read-refills-and-never-clears.md)), a lane whose span the dial above
its preview stretches after it was played
([0079](decisions/0079-a-lane-is-stretched-after-it-is-played.md)), a strip on every yard drawing
one row per lane as a wave of that lane's own period, shape and values, overlapping a reference row
of its loop so the rows beat against each other, beside an estimate — never on the frame loop — of
how long the whole pattern takes to come back round, in one unit that escalates past where a
duration is a duration and then keeps counting in powers of that unit
([0080](decisions/0080-the-recurrence-is-an-estimate-on-a-relative-grid.md)), a player on every
yard that jumps the read position around its loop's own sixteenths under a pattern drawn from a
durable seed, repeating each slot, stuttering the gate between them and crossfading every seam at
equal power, so the same session renders the same file and two seeds render two different ones
([0089](decisions/0089-a-jump-is-the-transports.md)) — and a fast
browser gate.
Implementation history belongs in [`docs/decisions`](decisions/); this document contains only the
path forward.

The product outcome guiding the next sequence is:

> A person can shape local samples into a beat-aware performance, recall its sounds and gestures
> exactly, and control it from either the screen or hardware without changing the instrument's
> underlying command model.

---

## 1. Ordered next work

Complete one step, including its full gate, before starting the next. Each step should deliver a
usable vertical slice rather than infrastructure for an unspecified future feature.

### What ran

One line per step, newest last. The reasoning is in the linked decision, not here.

- **P18, P19** — what a deck accepts as audio, and how it gets there.
- **P20** — the crop: the first edit that writes audio nobody imported
  ([0047](decisions/0047-a-crop-mints-audio-the-user-did-not-import.md)).
- **P21** — the parameters that should have been automatable all along.
- **P22** — a seek that no longer flickers. **P23** — a loop with handles.
- **P24** — the shell the rack redesign hangs off. **P25** — the primitive pass beside it.
- **P26** — the rack itself. **P28** — the renaming, cheapest once those surfaces settled.
- **P27** — measured every WASM candidate and moved nothing
  ([0058](decisions/0058-nothing-qualified-for-wasm.md)).
- **P29** — the File/View header, and Titlecase everywhere
  ([0059](decisions/0059-every-label-is-titlecase.md)).
- **P30** — deleted `#/log`, sent the ring out through File as JSONL
  ([0060](decisions/0060-the-ring-is-the-whole-exported-log.md)), left the shell's toast provider.
- **P31** — a stereo peak meter on the master bus's pre-ceiling tap
  ([0061](decisions/0061-the-master-meter-taps-the-bus-input.md)).
- **P32** — the layout the yard steps rest on: clip rack over the yard list, transport and knobs
  above the peaks, a fold that is a view preference and nothing else (§2).
- **P33** — a yard's emoji and drawn name, carried by `deck.add`
  ([0057](decisions/0057-a-deck-is-called-a-yard.md)).
- **P34** — one card per rack row, dragged by its own handle or the arrow keys on it, no dnd-kit
  ([0062](decisions/0062-a-rack-card-is-dragged-by-its-own-handle.md)).
- **P35** — the counters P42 measures by, dashed wherever the browser will not answer
  ([0063](decisions/0063-an-unanswerable-counter-reads-as-a-dash.md)).
- **P36** — the per-frame paint: two attributes a frame for a knob following a lane.
- **P37** — the four automation defects: one source of truth for Option, a live move joined over its
  own cadence ([0065](decisions/0065-a-live-move-is-joined-over-its-own-cadence.md)), and every
  parameter declaring its precision
  ([0064](decisions/0064-a-parameter-declares-the-precision-it-reads-at.md)).
- **P38** — the loop's two surfaces agreeing, and Shift meaning the loop
  ([0066](decisions/0066-shift-is-the-loop.md)).
- **P39** — undo takes back a gesture, not a value
  ([0067](decisions/0067-a-gesture-is-one-history-entry.md)).
- **P40** — audio leaves through one door: an export is a spec for the one render harness
  ([0068](decisions/0068-an-export-is-a-render-spec.md)).
- **P41** — the palette is a second way to send and never a second command
  ([0069](decisions/0069-the-palette-is-a-second-way-to-send.md)).
- **P42** — measured the five per-frame claims one at a time and fixed the two that failed
  ([0070](decisions/0070-a-per-frame-read-refills-and-never-clears.md)).
- **P43** — an export past the arming horizon: the offline pump arms the lanes the wall-clock tick
  cannot ([0071](decisions/0071-the-offline-pump-arms-the-lanes.md)).
- **P44** — the ride that recorded nothing and the import of nothing that half-landed
  ([0072](decisions/0072-a-drag-ends-once-and-a-decode-of-nothing-is-refused.md)).
- **P45** — the palette remembers what you last ran, as an order rather than a pinned highlight
  ([0073](decisions/0073-the-palette-remembers-by-order.md)).
- **P46** — one width and one fixed header, read by both screens
  ([0074](decisions/0074-both-screens-read-the-one-shell-width.md)).
- **P47** — every kind of thing draws its name from its own pool
  ([0075](decisions/0075-every-kind-of-thing-draws-from-its-own-pool.md)).
- **P48** — the rack card: both halves of its reading derived from its own id, a width it declares
  itself, and a drop resolved against the two-dimensional layout that makes
  ([0076](decisions/0076-a-card-reads-itself-out-of-its-own-id.md)).
- **P49** — an export plays the whole session for its whole length, and the offline pump's agreement
  with the live tick is asserted at the seam rather than only in a browser
  ([0077](decisions/0077-an-export-plays-the-whole-session.md)).
- **P50** — the yard's own button group: capture where the thing being captured is, one
  `deck.duplicate` command whose reducer expands the restoration stage list, and a recycle mark
  that is a decoration rather than a frame subscriber
  ([0078](decisions/0078-a-yard-is-duplicated-by-one-command.md)).
- **P51** — the master meter's bars run left to right, and every debug counter's label carries the
  sentence saying what it counts, in what unit, and what its dash means — copy in `src/lib/copy.ts`
  with the rest of the words.
- **P52** — the clip rack reads as cards: a quarter-width card per clip inside the one card the rack
  is, its name text in the header and the field that changes it behind a pencil, so renaming is
  reached rather than displayed.
- **P53** — a lane is stretched after it is played: one `automation.span` command per drag on the
  preview's own span dial, which is the one editable thing on that picture
  ([0079](decisions/0079-a-lane-is-stretched-after-it-is-played.md)).
- **P54** — the moiré strip: one row per lane over a reference row of the loop, and how long the
  whole thing takes as one estimated unit that escalates past where a duration is a duration
  ([0080](decisions/0080-the-recurrence-is-an-estimate-on-a-relative-grid.md)).
- **P55** — a name is two draws and a letter never comes back: an effect instance's name is an
  adjective pool times a noun pool, still folded out of its own id
  ([0081](decisions/0081-an-effect-name-is-two-pools-multiplied.md)), and the session carries the
  deck letters it has spent so a removed one is never handed out again
  ([0082](decisions/0082-a-deck-letter-is-spent-when-it-is-drawn.md)).
- **P56** — a signal clears itself: the one toast provider declares the timeout a toast takes
  itself away after, and the master clip indicator holds for a couple of seconds after the peak
  that lit it rather than latching until it is pressed
  ([0083](decisions/0083-an-indicator-clears-itself.md)).
- **P57** — two controls that read backwards, read forwards: the lane's span is an `xs` dial in the
  preview's top right that lengthens upwards, and the rack's switch is on for an effect that is
  running, with the caption gone ([0085](decisions/0085-a-control-reads-the-way-it-moves.md)).
- **P58** — the export door: a length typed as minutes and seconds over one number, defaulting to
  ten minutes, and a render that hands its samples back instead of leaving them in a context the
  browser will not let go of ([0086](decisions/0086-a-render-hands-its-samples-back.md)).
- **P59** — the drift picture is a moiré and the scale keeps counting: rows are continuous waves
  carrying the lane's own identity, and the estimate leaves the exact integers for logarithms
  rather than the flat last unit
  ([0080](decisions/0080-the-recurrence-is-an-estimate-on-a-relative-grid.md)).
- **P60** — the two effects the browser already has nodes for: a compressor whose gain reduction is
  a meter read and never a durable value, and a convolution reverb over an impulse the app
  generates from its own decay and tone and rebuilds only when they change
  ([0087](decisions/0087-an-impulse-is-generated-and-rebuilt-on-change.md)).
- **P62** — the player: a jump moves where a deck reads from, which is the transport's, so it is
  the deck's own module beside the loop and not a rack plugin
  ([0089](decisions/0089-a-jump-is-the-transports.md)). The pattern is a pure function of a durable
  seed, every seam is an equal-power fade, and the same session renders the same file twice.

None of them got a migration ([0026](decisions/0026-pre-release-has-no-migrations.md)).

### Scheduled, in order

**Nothing is scheduled.** P62 was the last entry, and it landed. What comes next is a decision
nobody has made yet rather than a queue with a next item in it, so this section is empty on
purpose: the first thing a new sequence owes is what durable shape its first step moves, which is
what makes a step expensive and the first thing to state. §4 holds what is deliberately not
scheduled and why; nothing in it becomes work by being read, and nothing is promoted out of it
without a named user outcome.

## 2. Rules for every feature

- `src/app` remains the only writer of session state. UI, workers, keyboard, and agent JSONL
  call `send()` with serialisable commands.
- Scheduling stays on `Envelope.at`; command shapes do not grow independent time fields.
- Parameter facts derive from the parameter/effect registries. A new parameter is declared once
  and bound once; a value lookup is (instance, param)
  ([0030](decisions/0030-effects-are-instances.md)).
- Raw files, audio nodes, functions, and browser permission objects never enter commands or the
  durable session.
- `buildDeckChain(BaseAudioContext)` remains the one production signal path for live, headless,
  offline, fingerprint, and export hosts.
- Durable edits participate in bounded history, persistence, portable archives, and graph restore
  unless a decision explicitly proves why they do not.
- Per-frame playheads, meters, cursors, and gesture drafts use refs and the existing frame loop,
  never React state or another RAF loop.
- Async work carries source or operation identity so stale completion cannot overwrite newer
  state.
- Analysis is not a pure function of stored bytes: `decodeAudioData` may resample to the device's
  rate, so onsets differ across machines. Nothing durable may rest on derived analysis.
- A view preference — snap, theme, whether the debug console is open — is not session state: no
  command, nothing durable, no history entry.
- Durable shape changes freely while pre-release: stored data that no longer validates is
  discarded, never migrated ([0026](decisions/0026-pre-release-has-no-migrations.md)).
- No new dependency is added without approval and a statement of what it replaces.

## 3. Proof and delivery

`./scripts/check` remains the full gate. It is allowed to get slower as the instrument gets bigger,
but no single feature may move its mean by more than 250ms without the human being asked first
([0012](decisions/0012-no-one-feature-jumps-the-gate.md)). Each feature adds the cheapest proof at
the layer that owns the behavior:

- pure normalization, analysis, and DSP assertions in colocated Vitest tests;
- command, event, history, and failure atomicity through `createInstrument` and its manual clock;
- graph scheduling and sound through the existing live/offline browser run;
- UI focus, pointer, file in the existing preview smoke;
- export parity by comparing every encoded sample with the shared graph buffer.

One fact has one emitter. `probe()` remains durable/session state, the event log remains discrete
behavior, and `peek()`/`peaks()` remain allocation-free continuous/sample-derived reads. A UI ring
drop is loud; a sequence gap in `./scripts/drive` is always a bug.

**The gate's headroom is not where it looks.** Measure a change by stashing it and comparing means
across several runs; a single run's spread is wider than most features cost, and one lucky
measurement has already produced a wrong figure twice. More importantly, the smoke sits near a
non-linear cliff: adding browser work _before_ `persistenceSmoke`'s `page.reload()` stalls the
reloaded page's audio clock, turning a ~70 ms play into ~920 ms and costing the gate most of a
second. Measured shape — under ~175 ms of added pre-reload work is reliably safe, ~190 ms stalls
sometimes, and past ~250 ms it stalls nearly always. It is probabilistic, not a fixed threshold.
Contention with the concurrent browser runs was ruled out by stubbing them: the stall reproduces
alone, at zero delay. The mechanism is unidentified and needs Chromium-side tracing.

A popover the driver clicks through is the other measured trap: Playwright waits out a popup's
enter and exit animations before it may click, which cost one scenario ~450ms after the reload and
1.68s before it. A popup whose entries `./scripts/drive` presses opens instantly
([0056](decisions/0056-an-effect-carries-its-own-icon.md)).

Offline `render()` calls are the cheap place to prove sound: they join underneath the deck
fixture's real-time waits and cost close to nothing. New browser work that cannot be a render
belongs after the reload, or on its own page — not on the pre-reload critical path.

When a feature changes a data boundary, graph lifecycle, or ownership rule, write the decision and
a failing seam-level test before broad UI work. Do not turn the driver into a second application
by teaching it feature semantics.

## 4. Not scheduled

- **The dry/wet crossfade is written out three times.** `delay.ts`, `reverb.ts` and now `tape.ts`
  each build the same eight lines — one `ConstantSourceNode`, the two `mixCurve` shapers, two gains
  at zero — which is the third occurrence principle 3 fires on. It was extracted and put back.
  Extracting it moves node construction inside a helper, which reorders the fake context's
  creation-indexed nodes and invalidates fifteen assertions in `src/audio/effects/rack.test.ts`;
  rewriting those to accommodate a refactor is the drive-by principle 4 forbids, and the risk of
  silently weakening one of them is not worth removing eight lines that hold no behaviour — the law
  itself already lives once, in `src/lib/crossfade.ts`. Not scheduled: it becomes work the day a
  fourth plugin wants it, or the day those assertions stop being indexed by creation order.
- **The tape's extra heads were not built, and the loop is not oversampled.** P61 offered extra
  heads as further read taps at fixed ratios of the base delay, "if it earns its knob". It did not:
  seven knobs already reach the rack card, a second head at a fixed ratio is a `tape.time` a
  performer can already dial, and a rack holds any number of instances of one entry (0030) — two
  tapes in a rack are two heads with independent times, which is strictly more than a ratio knob
  would have bought. The aliasing question was measured rather than argued: `./scripts/bench` prices
  the same loop three ways over 10 minutes of mono at 48kHz — 2080ms ± 115 with the shipped
  antiderivative-antialiased tanh, 1769ms ± 246 with a plain `Math.tanh`, and 3139ms ± 40 with the
  loop run at 2× and resampled either side. ADAA buys the antialiasing for 18% over doing nothing,
  where oversampling costs 77%; at 3.5ms per second of audio per channel the shipped loop is 0.7%
  of a stereo realtime budget, so nothing is near a deadline a port could rescue and §4's WASM rule
  keeps its standing answer — nothing qualified (0058). Not scheduled: the heads are a knob nobody
  asked for and the oversampling is a cost with no audible payer.
- **A ten-minute export peaks at 331MB and that peak is inherent.** Measured on the render path
  through the CDP's `Runtime.getHeapUsage` (`backingStorageSize`, which is where float samples and
  `ArrayBuffer`s live — the debug console's `heap` counter reads the V8 heap and stays under 7MB
  throughout, so it is not the instrument for this). 331MB is what the counter read at the peak; the
  arithmetic behind it is 345MB — ten minutes of stereo at 48kHz is 230MB of rendered samples and
  115MB of encoded 16-bit PCM, and the encode needs both at once. The two are the measurement and
  the sum, not two peaks: the counter is sampled off a live heap and reads a little under what the
  two allocations add up to. The sum is the one that cannot come down, because `encodeWav`
  already writes into the one buffer it allocates and returns a view of it, so there is no second
  copy left to remove, and nothing can be freed part-way through a file whose frames interleave
  every channel. What was reducible was the residue, not the peak — 220MB stayed alive after every
  export and stacked, which P58 fixed ([0086](decisions/0086-a-render-hands-its-samples-back.md));
  after it the same export settles back to 0.7MB. Not scheduled: the remaining peak is the samples
  themselves, and cutting it would mean a strided per-channel encode to release one channel early,
  which trades a third of the peak for a cache-hostile pass over 115MB.
- **An offline render is about 13% slower since P43.** `./scripts/profile --compare` reads 50–51x
  realtime against a median of 58x, twice in a row, on the run that landed
  [0071](decisions/0071-the-offline-pump-arms-the-lanes.md). Frame p95, heap delta and the longest
  task are all unmoved, so nothing per-frame regressed — the cost is entirely in the offline pump,
  which now arms the lanes the wall-clock tick could never reach. That is the work the old path was
  skipping and the reason the export was wrong, so it is a price rather than a defect: an export
  still renders about fifty times faster than it plays. Not scheduled unless a longer export makes
  the absolute number land somewhere a person waits ([0051](decisions/0051-the-profiler-remembers-its-own-runs.md)).
- **The Option arm attaches from an effect, and a pointerdown can beat it.** `subscribeAlt` in
  `src/ui/shortcuts.ts` attaches its `document` listeners lazily, on the first subscriber, and a
  knob subscribes from a React effect (`useAltHeld` in `src/ui/ParameterKnob.tsx`). A `pointerdown`
  landing before that effect has run would find nothing armed, and the ride would degrade to a
  plain parameter write with no error — the failure mode is silence, which is what makes it worth
  naming. `onAltPointer` reads the modifier off the pointer in the capture phase and exists to
  cover exactly this, so the window may already be closed; it was investigated while chasing the
  persistence-smoke flake ([0084](decisions/0084-a-measured-gesture-waits-for-the-viewport.md)) and
  ruled out as that flake's cause — on every failing run the knob read `armed` and the pointer was
  simply elsewhere. What was not done is a test of the cold-start ordering itself, so the race is
  unproven in both directions. Not scheduled: no observed user-facing failure, and closing it
  blind risks moving the one source of truth for Option that P37 established. It becomes work the
  moment a ride is seen recording nothing.
- **A lane re-bases once per pointer event.** A knob that already holds a lane, Option-dragged
  while the deck is playing, re-bases that lane on every `param.set`: `setParam` in
  `src/app/execute.ts` re-arms it, and `scheduleAutomation` cancels the joined ramp once per
  event. Carried out of P37 and confirmed still live after P39, which coalesced the drag's
  _history_ into one entry and left the command stream exactly as long — every `param.set` still
  reaches `execute`. It is inaudible in that state, because the parameter is following the
  scheduled lane rather than the live move, so it is a behaviour question about what a move over
  a playing lane should mean, not a defect to patch: it belongs with the automation work and
  needs a named outcome before it is scheduled.
- **What the player deliberately does not do.** P62 shipped four variations — a jump distance, both
  ways or forward only, how hard the gate stutters, and how many times a slot repeats before the
  next jump — and left four things out on purpose, each recorded here rather than half-built.
  **Moving the numbers is heard from the next play:** a step is armed a whole horizon (8s) before it
  sounds, so a knob could never be heard where it was turned; only switching the module on or off
  restarts a playing deck, the way a loop move does. **Neither a pause nor a seek resumes into a
  pattern** — both begin it again at its first step, because the walk is drawn from the seed at
  every play and nothing durable carries a cursor, which is the same property that makes two
  renders of one session the same file. The cost is that `deck.seek` on a jumping deck returns and
  holds a position the next play does not read from; closing it means letting the walk begin at the
  slot a position lands in, which is a change to what the first step of a pattern is and wants its
  own decision. **A loop whose slots are shorter than `PLAYER_MIN_SLOT_SECS` does not jump at all**:
  two fades have to fit inside a gated repeat and a third has to overlap the seam, and a deck with
  no loop has no grid to jump around, so both play their loop straight. **A gated repeat with less
  than three fades of room is played whole** rather than cut, because two automation curves that
  touch are one rounding error from the overlap Web Audio throws on. None of these is a defect;
  each becomes work the day a performance wants it
  ([0089](decisions/0089-a-jump-is-the-transports.md)).
- **`clip.apply` does not clear a field the clip does not carry.** The restoration stage list emits
  nothing for a `null` loop or a `null` player, and relies on `deck.load` — which every apply leads
  with — to clear both. That holds for the two fields that have one, and it is why P62 made a load
  clear the player the way it already cleared the loop. It does not generalise: a stage for a field
  no load resets would leave the applied deck holding something the clip does not, against 0027's
  "one deck rewritten to be exactly one clip". Not scheduled because no such field exists; it
  becomes work the day one is added, and the fix is a total stage rather than a wider `deck.load`.
- **The two structural splits.** `src/app/facade.ts` (799 lines) holds six cohabiting subjects, and
  `src/audio/deck.ts` (753) holds a lane subsystem that is its own thing. Neither is a tidy-up: each
  moves where a boundary sits, so each needs a decision written before the move, and the human picks
  whether either happens at all. `facade.ts` is the one where the three
  `oxlint-disable max-lines-per-function` waivers (`:191`, `:328`, `:482`) read as a symptom of the
  cohabitation rather than a judgement about a long function; `deck.ts` carries one (`:143`).
  Two others went the other way under P62, forced rather than chosen: the hard 800-line cap
  ([0045](decisions/0045-the-hard-cap-is-enforced-where-no-waiver-reaches.md)) is not waivable, so the player's own
  transport left `deck.ts` for `src/audio/player.ts` and the four clip commands left `execute.ts`
  for `src/app/clips.ts` — the cohabitation `execute.ts`'s own header had already named.
- Live recording remains out of scope. Offline export is how audio leaves the app: the dialog P40
  landed, which is a spec for the render harness and never a second renderer
  ([0068](decisions/0068-an-export-is-a-render-spec.md)).
- Rearranger and paulstretch still wait until beat-aware looping and clips expose a concrete
  workflow. **The WASM rule lives here and nowhere else**, so there is one copy to edit: begin as
  pure JavaScript, measure with `./scripts/bench`, and move a kernel only when its absolute cost
  lands on a frame deadline or on a path someone is waiting through. Headroom is not the test —
  every sample loop in this instrument has headroom, and P27 measured all of it and moved nothing
  ([0058](decisions/0058-nothing-qualified-for-wasm.md)). A second language in the build is a
  stack decision and is asked about first ([0012](decisions/0012-no-one-feature-jumps-the-gate.md)).
  Stretching starts from what P14's key lock learned: WSOLA with a correlation search, never the
  two-tap kernel again ([0031](decisions/0031-rate-is-in-the-plan.md)).
- Destructive source editing beyond the crop P20 shipped: no trim history inside a source, no
  splice ([0047](decisions/0047-a-crop-mints-audio-the-user-did-not-import.md)).
- Per-deck routing, sends and a mixer are out of scope: every deck lands in the one master bus
  until a named outcome says otherwise.
- Vocoder, spectral-space variants, Twister-specific modes, and other narrow/high-cost effects
  require a named user outcome and must arrive one plugin at a time.
- Collaboration, accounts, cloud storage, and uploads conflict with the local-first product unless
  that product constraint is deliberately revisited.
