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
dialog as a named, faded .wav the one render harness produced
([0068](decisions/0068-an-export-is-a-render-spec.md)), a shell whose
routes hang off a menubar and whose width is declared once ([0054](decisions/0054-the-shell-owns-the-width.md)),
controls that carry the primitive their behavior implies and one icon per action from a single
vocabulary ([0055](decisions/0055-a-state-is-a-toggle-and-an-action-has-one-icon.md)), a rack of
one card per instance whose effects are added from a popover the registry renders, each entry
carrying the icon its own plugin declares ([0056](decisions/0056-an-effect-carries-its-own-icon.md))
and each card reordered by a drag of its own handle or the arrow keys on it
([0062](decisions/0062-a-rack-card-is-dragged-by-its-own-handle.md)),
a newest-first event feed both log surfaces read, decks the interface calls yards, each carrying
an emoji and a generated name of its own drawn when it was added
([0057](decisions/0057-a-deck-is-called-a-yard.md)),
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

What a deck will accept as audio and how it gets there (P18 and P19), then the first edit that
writes audio nobody imported (P20), then the parameters that should have been automatable all
along (P21), then the two things wrong with the surface all that audio is performed on — a seek
that flickered (P22) and a loop with no handles (P23) — then the shell the rack redesign depends
on (P24) and the primitive pass beside it (P25), then the rack itself (P26), then the renaming
that was cheapest once those surfaces had settled (P28), then the one measurement-driven
question (P27), which measured its candidates and moved nothing
([0058](decisions/0058-nothing-qualified-for-wasm.md)), and last the header the four menu steps
below hang off (P29), which took the label pass with it
([0059](decisions/0059-every-label-is-titlecase.md)), and then the first surface to hang off it
(P30), which deleted the `#/log` page, sent the ring out through `File` as JSONL
([0060](decisions/0060-the-ring-is-the-whole-exported-log.md)) and left the toast provider every
later step says a finished thing through, and then the second surface to hang off it (P31), a
stereo peak meter reading a tap the master bus owns before its own ceiling
([0061](decisions/0061-the-master-meter-taps-the-bus-input.md)), and then the layout pass the two
yard steps rest on (P32), which lifted the clip rack over the yard list, put each yard's transport
and knobs above its peaks, gave a yard a fold that is a view preference and nothing else (§2), and
emptied the readout of the blob id, and then the first of the two yard steps (P33), which filled
that readout with a generated name drawn beside the emoji and carried by `deck.add`
([0057](decisions/0057-a-deck-is-called-a-yard.md)), and then the rack pass beside them (P34), which made
each rack row a card dragged by its own handle, refused dnd-kit for the repo's own pointer idiom
and left the arrow keys on that handle as the one keyboard path to reordering
([0062](decisions/0062-a-rack-card-is-dragged-by-its-own-handle.md)), and then the counters P42
measures by (P35), which gave the console the audio thread's load, the JS heap and the decode
cache's own running total, measured only while the console is open and printed as a dash wherever
the browser cannot answer ([0063](decisions/0063-an-unanswerable-counter-reads-as-a-dash.md)), and
then the per-frame paint (P36), which left the knob's two arcs one static path revealed by a dash
offset and its indicator one static line turned by an SVG `transform`, so a knob following a lane
writes two attributes a frame and a readout only when the string changes, and then the four
automation defects around that knob (P37), which took the Option a press carries at the one
source of truth for the modifier, joined a live move over its own pointer cadence so the wide log
parameters stop clicking under a recording
([0065](decisions/0065-a-live-move-is-joined-over-its-own-cadence.md)), made every parameter
declare the precision it reads at ([0064](decisions/0064-a-parameter-declares-the-precision-it-reads-at.md))
and squared the armed marker onto the armed ring's own radius, and then the step that made the
loop's two surfaces agree (P38), which gave each handle a line down through the peaks in one
colour token both files read and settled Shift on a single meaning — the loop, swept from the
peaks at any time, with the Snap toggle left as the whole of the snapping choice
([0066](decisions/0066-shift-is-the-loop.md)), and last the step that made undo take back a
gesture rather than a value (P39), which keyed history on the (deck, instance, parameter) a drag
is about, gave the pointer a `gesture.end` to close it with, and carried a playing yard's
transport across a checkpoint restore without letting the rebuild report a stop
([0067](decisions/0067-a-gesture-is-one-history-entry.md)), and last the step that gave audio a
door out (P40), which made an export a spec for the one harness — the session's own restoration
commands plus whatever is playing, rendered offline, faded at the ends as arithmetic over the
samples rather than as a node, and proved byte for byte against a plain render of the same spec
([0068](decisions/0068-an-export-is-a-render-spec.md)), and last the palette over all of it (P41),
which refused `cmdk` for the `Autocomplete` the Base UI build already ships, moved every command
more than one surface sends into `src/ui/actions.ts`, and lifted the Export Audio dialog to the
shell so the menu and the palette open the one box
([0069](decisions/0069-the-palette-is-a-second-way-to-send.md)), and last the efficiency read over
all of it (P42), which took the five claims one at a time and measured each rather than reading
it: one frame loop and no second one; canvases repainted zero times across idle, playback and a
knob drag, because a deck's peaks are one stable object the painter memoizes on; no React commit
on any frame the loop ran, only the ref writes the playhead and the meters make. The two it caught
it fixed — `peek()` was allocating 28 bytes a call on `Map.clear()`, and the console was writing
eleven unchanged counters a frame — and it left the rule behind them
([0070](decisions/0070-a-per-frame-read-refills-and-never-clears.md)).
None of them got a migration ([0026](decisions/0026-pre-release-has-no-migrations.md)).

### Scheduled, in order

Nothing. P42 was the last scheduled step and it has run; §1 is empty until a named product outcome
fills it, and §4 is where the candidates are argued rather than queued. An entry states what
durable shape it moves before it is started — that is what makes a step expensive and it is the
first thing to state.

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

- **A lane re-bases once per pointer event.** A knob that already holds a lane, Option-dragged
  while the deck is playing, re-bases that lane on every `param.set`: `setParam` in
  `src/app/execute.ts` re-arms it, and `scheduleAutomation` cancels the joined ramp once per
  event. Carried out of P37 and confirmed still live after P39, which coalesced the drag's
  _history_ into one entry and left the command stream exactly as long — every `param.set` still
  reaches `execute`. It is inaudible in that state, because the parameter is following the
  scheduled lane rather than the live move, so it is a behaviour question about what a move over
  a playing lane should mean, not a defect to patch: it belongs with the automation work and
  needs a named outcome before it is scheduled.
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
