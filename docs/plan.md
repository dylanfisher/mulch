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
([0075](decisions/0075-every-kind-of-thing-draws-from-its-own-pool.md)), each reached through its
own group of capture, duplicate, remove and fold, a copy being one command the reducer expands
into the restoration stage list and a playing yard wearing a recycle mark that is a decoration
rather than a frame subscriber ([0078](decisions/0078-a-yard-is-duplicated-by-one-command.md)),
sample kernels measured and left in JavaScript ([0058](decisions/0058-nothing-qualified-for-wasm.md)),
a header of File and View menus over an instrument whose every label is Titlecase
([0059](decisions/0059-every-label-is-titlecase.md)), an event log that leaves through File as the
JSONL the ring holds ([0060](decisions/0060-the-ring-is-the-whole-exported-log.md)) over one toast
provider at the shell, a stereo peak meter on the master bus's own pre-ceiling tap
([0061](decisions/0061-the-master-meter-taps-the-bus-input.md)), a clip rack above the yards, each
yard reaching its transport and knobs before its peaks and naming itself in the readout above
them, a debug console counting the audio thread's load, the JS heap and what the decode cache
holds, with a dash for anything the browser will not answer
([0063](decisions/0063-an-unanswerable-counter-reads-as-a-dash.md)), a ⌘/Ctrl+K palette that is a
second way to send and never a second command, over gestures whose construction is shared by every
surface offering them ([0069](decisions/0069-the-palette-is-a-second-way-to-send.md)), a per-frame
path measured end to end rather than argued about — one loop, reads that refill their scratch
instead of clearing it, and paints that write only what moved
([0070](decisions/0070-a-per-frame-read-refills-and-never-clears.md)) — and a fast
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

None of them got a migration ([0026](decisions/0026-pre-release-has-no-migrations.md)).

### Scheduled, in order

An entry states what durable shape it moves before it is started — that is what makes a step
expensive and it is the first thing to state. The yard's own button group has shipped, so a yard is
copied by one command and captured where it sits
([0078](decisions/0078-a-yard-is-duplicated-by-one-command.md)); what is left is the remaining
surfaces — each of those a fraction of the one width P46 declared
([0074](decisions/0074-both-screens-read-the-one-shell-width.md)) — and then the lane work P53 and
P54 open.

**P51 — The readouts say what they are.** The global peak indicators lay out horizontally, and every
label in the debug bar carries a tooltip saying what it counts and in what unit — including what a
dash means ([0063](decisions/0063-an-unanswerable-counter-reads-as-a-dash.md)). Tooltip copy is
copy: it lives with the other words, not inline at the label. Durable shape: none. Proof: a test
that every debug label has a tooltip and no tooltip is orphaned.

**P52 — The clip rack reads as cards.** Each clip becomes a small card at a quarter of the area's
width, laid inside the one card the rack is, its name plain text in the card's header rather than
an input pretending to be a label — renaming stays available, it just stops looking like a form.
The thumbnail ([`ClipThumbnail`](../src/ui/ClipThumbnail.tsx)) keeps drawing what it draws, at the
new size. Durable shape: none. Proof: the existing clip tests, plus one that the header renders a
name and the rename path still sends its command.

**P53 — A lane you can stretch after you played it.** While an automation preview is open under a
held Option, a vertical drag over its time axis scales that lane's span, so a gesture recorded once
is sped up or slowed without being re-performed. A lane is already its own loop of length
`laneSpan(lane)`, anchored where it was recorded and re-armed on that cycle regardless of the deck's
loop or rate ([0035](decisions/0035-a-lane-runs-on-its-own-clock.md)) — this step edits that length
and nothing else, and the plan never hears about it. Durable shape: `laneSpan` becomes something a
gesture edits after the fact. Proof: a render whose fingerprint differs between two spans of the
same lane, and a seam test that the drag sends one span command per gesture rather than one per
pointer event ([0065](decisions/0065-a-live-move-is-joined-over-its-own-cadence.md)).

**P54 — The moiré strip, and how long the whole loop takes.** One horizontal row per active lane,
ticked at that lane's own period, over a reference row of the deck's loop; the rows drift and the
interference is the point, because the drift is what a listener actually hears. Phase comes from
`peek()` — `out.automation` is already `key -> (now - anchor) % span`, refilled in place every frame
(`src/audio/deck.ts:643`); periods come from `laneSpan`; the loop's period in real seconds is
`(loopEnd - loopStart) / rate`, because rate scales buffer time and not lane time
([0035](decisions/0035-a-lane-runs-on-its-own-clock.md)). Motion goes through `src/ui/frame.ts` and
refs, nothing per-frame reaches React state, and the painter is a sibling of `src/ui/peakCanvas.ts`
rather than a reuse of it. Clicking the strip opens a large overlay of the same moiré — the strip is
the glance, the overlay is the look, and the overlay is where the horizontal scale lives: default to
a few loop periods and pull back until the band is visible, since at close zoom the pattern reads as
static. It follows `src/ui/DebugConsole.tsx` for what an overlay is here: open is a view preference,
no command, nothing durable, and closed it costs nothing — no canvas, no frame callback, no
subscription. One painter serves both sizes. Beside the strip, the full recurrence as a human
duration, escalating as far as the maths goes — seconds, minutes, hours, days, months, years,
centuries, millennia, and past that into deliberately absurd comparatives: geological epochs, the
age of the universe, and yes, knowingly-wrong ones like light years, played straight. The escalation
is the joke; keep it deadpan, never repeat a unit label within one scale, and show one unit and one
figure, never a breakdown. **It is an estimate and it costs nothing**: quantize the periods to a
coarse grid, compute on that, cap the search, and past the cap the answer is the funny unit rather
than a real number. Never on the frame loop — recompute only when a lane, the loop or the rate
changes, and cache it. Crude beats slow. The maths — periods, recurrence, unit selection — lives in
`src/lib/`, Node-testable with no context and tested beside the source; the surface lives in
`src/ui/`; colours come from `src/ui/tokens.css` only. Read `src/lib/automation.ts` and
[0035](decisions/0035-a-lane-runs-on-its-own-clock.md) first. Durable shape: none. Proof: unit tests
for the recurrence estimate at both ends, including that the cap returns the absurd unit rather than
a number; a test that a closed overlay holds no frame subscription; and a profile run showing the
strip adds nothing measurable per frame. If the estimation strategy constrains future work, it is a
decision.

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

- **An offline render is about 13% slower since P43.** `./scripts/profile --compare` reads 50–51x
  realtime against a median of 58x, twice in a row, on the run that landed
  [0071](decisions/0071-the-offline-pump-arms-the-lanes.md). Frame p95, heap delta and the longest
  task are all unmoved, so nothing per-frame regressed — the cost is entirely in the offline pump,
  which now arms the lanes the wall-clock tick could never reach. That is the work the old path was
  skipping and the reason the export was wrong, so it is a price rather than a defect: an export
  still renders about fifty times faster than it plays. Not scheduled unless a longer export makes
  the absolute number land somewhere a person waits ([0051](decisions/0051-the-profiler-remembers-its-own-runs.md)).
- **A lane re-bases once per pointer event.** A knob that already holds a lane, Option-dragged
  while the deck is playing, re-bases that lane on every `param.set`: `setParam` in
  `src/app/execute.ts` re-arms it, and `scheduleAutomation` cancels the joined ramp once per
  event. Carried out of P37 and confirmed still live after P39, which coalesced the drag's
  _history_ into one entry and left the command stream exactly as long — every `param.set` still
  reaches `execute`. It is inaudible in that state, because the parameter is following the
  scheduled lane rather than the live move, so it is a behaviour question about what a move over
  a playing lane should mean, not a defect to patch: it belongs with the automation work and
  needs a named outcome before it is scheduled.
- **The two structural splits.** `src/app/facade.ts` (799 lines) holds six cohabiting subjects, and
  `src/audio/deck.ts` (677) holds a lane subsystem that is its own thing. Neither is a tidy-up: each
  moves where a boundary sits, so each needs a decision written before the move, and the human picks
  whether either happens at all. `facade.ts` is the one where the three
  `oxlint-disable max-lines-per-function` waivers (`:191`, `:328`, `:482`) read as a symptom of the
  cohabitation rather than a judgement about a long function; `deck.ts` carries one (`:143`).
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
