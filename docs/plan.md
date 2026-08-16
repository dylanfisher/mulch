# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device; a performance remains editable, portable, reproducible through
commands, and identical through the live and offline signal paths.

The current baseline is an any-number-of-decks instrument with a durable session, portable
archives, bounded undo/redo, effect racks holding instances, gesture-relative automation that
plays back, beat-aware loop snapping and sliding, a waveform a click seeks in, per-deck speed and
pitch, a clip rack that draws what it holds, a toggleable debug console, imports in every format
the browser decodes through a picker or a drop on the waveform, offline WAV export, and a fast
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

### Scheduled

The order is not the order these were asked for. It is: what a deck will accept as audio and how
it gets there (P18 and P19, done), then the first edit that writes audio nobody imported, then
the parameters that should have been automatable all along, then the shell and primitive pass that
the rack redesign depends on, then the rack itself, and last the one measurement-driven question.
Each entry says what durable shape moves, because that is what makes a step expensive; none of
them get a migration ([0026](decisions/0026-pre-release-has-no-migrations.md)).

**P20 — Crop to the loop.** A deck can be cropped to its loop selection: the source becomes the
loop's contents, and the waveform redraws as the cropped audio.

- This is the first step that writes new audio bytes, and that is the whole cost. A crop produces
  a new stored blob with its own id, `deck.load`s it, and clears or resets the loop against the new
  length; the prior blob is released through `sessionBlobIds` if nothing else names it — the one
  projection persistence, history and archives share, which must not gain a sibling here.
- It stays one durable command so undo restores the previous source in one press, and the cropped
  bytes are written in a format everything decodes (`src/lib/wav.ts`) rather than re-encoding to
  the source's original format.
- Peaks, analysis and any lanes are derived or independent: peaks come from the new blob through
  the existing cache, and analysis re-runs by its ordinary identity path
  ([0025](decisions/0025-beat-analysis-is-derived-not-durable.md)).
- Non-goal: destructive editing generally. One operation, the loop, and no edit history inside a
  source.
- Proof: pure tests that the cropped samples equal the loop's slice; a seam test for crop, its
  undo, and the old blob becoming collectable; an offline render fingerprint of a cropped deck
  matching the same region played as a loop.
- Record: it mints durable audio the user did not import. Write it.

**P21 — Every continuous parameter is automatable.** Pan, speed, pitch, the delay's time, feedback
and mix, and the EQ's Q all record and replay a gesture like the filter cutoff does.

- Most of these are mechanical: a registry entry gains automation and binds an `AudioParam`
  (`src/audio/params.ts`, the owning plugin's `automationTarget`), and everything else — the knob
  mark, the preview, the transport scheduling — derives, which is the claim
  [0016](decisions/0016-effects-are-ordered-plugins.md) and
  [0028](decisions/0028-automation-is-gesture-relative.md) make and this step tests at scale.
- Three are not mechanical, and the step is mostly these:
  - `delay.mix` drives two gain nodes, not one `AudioParam`, so it cannot satisfy
    `automationTarget(param): AudioParam` as written. Either the plugin exposes one param that
    both gains derive from, or the contract grows a second shape — decide once, in the record,
    because a second shape affects every plugin.
  - `speed` is `playbackRate`, which the transport's own position arithmetic reads
    ([0031](decisions/0031-rate-is-in-the-plan.md)). A ramped rate makes the playhead's mapping
    non-linear on both sides of the worklet seam; if that cannot be made correct, ship speed
    without automation and say so rather than shipping a lane that desyncs the loop.
  - `pitch` runs through the key-lock shifter, so automating it is automating DSP written here —
    measure it before declaring it automatable.
- Proof: for each newly automatable parameter, an offline render fingerprint of a lane differing
  from the same session cleared; a seam test that a lane on the second instance of a duplicated
  effect touches only that instance ([0030](decisions/0030-effects-are-instances.md)).
- Record: only if the effect contract changes shape for `delay.mix`. That is likely.

**P22 — The shell, as primitives rather than as markup.** The header's links become a Menubar, the
wordmark returns home from the dev gallery and the event log, and the log lists newest first.

- Menubar is not in `src/ui/components/` yet: it is generated through the same route every other
  primitive was ([0003](decisions/0003-lint-generated-components.md)) and shown in a `#/dev`
  section, or it does not exist. An unlisted primitive is one nobody can see drift.
- The wordmark in `src/ui/App.tsx` becomes a link to the instrument route whenever the current
  route is not the instrument, and stays inert on the instrument itself.
- Newest-first is a change to `src/ui/eventFeed.ts`'s window selection, which both `LogPage` and
  the debug console read — one reading of the ring, so both surfaces move together, and the gap
  detection must stay correct when the list is reversed rather than being reversed at the point of
  render by each surface.
- Proof: unit tests over the reversed window and its gap breaks; the existing `#/dev` render test
  covers the new section; a test that the wordmark links home off-route.

**P23 — Icons and the right primitive for the job.** Every actionable control carries an
appropriate icon, and every control uses the primitive its behavior implies — a loop button that
holds a state is a Toggle, not a Button.

- This is an audit with a written outcome, not a sweep: walk the instrument's controls, and for
  each one name the primitive and the icon. Where the primitive is wrong — a stateful control
  rendered as a button, a mutually exclusive set rendered as separate buttons — change it to the
  existing primitive rather than adding a new one. Toggle, toggle-group, switch and checkbox all
  exist and their meanings differ; the gallery already shows them side by side.
- Icons come from `@phosphor-icons/react`, imported per icon rather than through the barrel, as
  the repo already does. Icon choice is decided once per action and reused — the same icon means
  the same thing on a deck, in the rack and in the menubar — which means a single declaration
  somewhere shared, not a `<PlayIcon />` typed into six files.
- Accessibility does not regress: an icon-only control keeps a label, and a toggle reports its
  pressed state.
- Proof: component tests for the changed primitives' state reporting; the `#/dev` sections show
  every primitive in use.

**P24 — A rack you can read, and a picker you can find things in.** Each effect instance occupies
its own row. Adding an effect is a popover picker listing the registry's entries with their icons,
not a row of buttons that grows with the registry.

- The registry is still the source: the picker is rendered from it
  ([0016](decisions/0016-effects-are-ordered-plugins.md)), so a new effect appears in the picker by
  existing, and an effect's icon is declared beside its identity in its own plugin file rather than
  mapped in the UI. That is a change to the effect contract — one field — and every plugin gains
  it at once.
- Layout: one instance per row with its own controls, and the add control is its own affordance
  outside the instance rows. With duplicate instances allowed
  ([0030](decisions/0030-effects-are-instances.md)), rows must be keyed and labelled by instance,
  not by effect, or two delays are indistinguishable.
- Nothing durable moves and no command changes: `effect.add`, `effect.remove`, `effect.reorder`
  and `effect.bypass` are what the new controls send.
- Proof: a component test that the picker lists every registry entry and that choosing one sends
  `effect.add`; a test that two instances of one effect render as two distinguishable rows.

**P25 — WASM, only where it is measured.** Review the instrument for kernels that are genuinely
hot, and if any are, establish one Rust-to-WASM pattern and move exactly those.

- The rule is unchanged from §4: begin as plain JavaScript, measure, and move only a measured hot
  kernel. This step's first deliverable is the measurement, and "nothing qualifies yet" is a valid
  and cheap outcome to record. The candidates worth measuring are the ones that already exist and
  already cost: the analysis envelope pass over a multi-megabyte source
  (`src/lib/analysis.ts`, already off-thread), peak reduction (`src/lib/peaks.ts`), and the
  key-lock stretch kernel P14 wrote. P18 added no candidate: nothing is converted
  ([0043](decisions/0043-a-deck-stores-the-bytes-it-was-given.md)).
- If something qualifies, the pattern is the deliverable and it must be small: one crate, one
  build step wired into `./scripts/setup` and the Vite build, no new runtime dependency in the
  app, and a JavaScript fallback path only if a measurement says the WASM cannot always load —
  never as a silent fallback (§2 fails loudly).
- The gate is the constraint: `./scripts/check` stays under four seconds
  ([0012](decisions/0012-the-gate-stays-under-four-seconds.md)) and a toolchain that is not
  installed must fail the setup script loudly rather than skipping a build step.
- Proof: the measurement itself, recorded with the method (means across several runs, per §3);
  then, for any moved kernel, the same pure tests passing against the WASM path and a fingerprint
  unchanged from the JavaScript one.
- Record: a second language in the build is a stack decision. Write it either way — including if
  the answer is "nothing qualified".

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

`./scripts/check` remains the full gate and stays under the four-second budget from
[0012](decisions/0012-the-gate-stays-under-four-seconds.md). Each feature adds the cheapest proof
at the layer that owns the behavior:

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

Offline `render()` calls are the cheap place to prove sound: they join underneath the deck
fixture's real-time waits and cost close to nothing. New browser work that cannot be a render
belongs after the reload, or on its own page — not on the pre-reload critical path.

When a feature changes a data boundary, graph lifecycle, or ownership rule, write the decision and
a failing seam-level test before broad UI work. Do not turn the driver into a second application
by teaching it feature semantics.

## 4. Not scheduled

- Live recording remains out of scope. Offline export is how audio leaves the app.
- Rearranger and paulstretch still wait until beat-aware looping and clips expose a concrete
  workflow; begin as pure JavaScript and move only a measured hot kernel to WASM, under P25's rule
  and starting from what P14's key lock learned about stretching.
- Destructive source editing beyond P20's crop: no trim history inside a source, no splice.
- Per-deck routing, sends and a mixer are out of scope: every deck lands in the one master bus
  until a named outcome says otherwise.
- Vocoder, spectral-space variants, Twister-specific modes, and other narrow/high-cost effects
  require a named user outcome and must arrive one plugin at a time.
- Collaboration, accounts, cloud storage, and uploads conflict with the local-first product unless
  that product constraint is deliberately revisited.
