# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device; a performance remains editable, portable, reproducible through
commands, and identical through the live and offline signal paths.

The current baseline is an any-number-of-decks instrument with a durable session, portable
archives, bounded undo/redo, effect racks holding instances, a gesture-relative lane on every
continuous parameter but the read rate, beat-aware loop snapping and sliding, a waveform a click
seeks in, per-deck speed and pitch, a clip rack that draws what it holds, a toggleable debug
console, imports in every format the browser decodes through a picker or a drop on the waveform, a
crop that makes the loop the deck's whole source, offline WAV export, and a fast browser gate.
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
it gets there (P18 and P19, done), then the first edit that writes audio nobody imported (P20,
done), then the parameters that should have been automatable all along (P21, done), then the two
things wrong with the surface all that audio is performed on — a seek that flickers and a loop with
no handles (P22 and P23) — then the shell and primitive pass that the rack redesign depends on,
then the rack itself, then the renaming that is cheapest once those surfaces have settled (P28),
and last the one measurement-driven question. Each entry says what durable
shape moves, because that is what makes a step expensive; none of them get a migration
([0026](decisions/0026-pre-release-has-no-migrations.md)).

**P22 — A seek that does not flicker.** Clicking the waveform to move the playhead of a playing
deck keeps that deck reading as playing throughout. Today the transport's pause button flashes to
play and back within a frame or two, because a seek restarts the voice and the restart's own stop
and start reports drive `playing` false then true again.

- The fix belongs at the seam that already knows a restart is a restart: `seek` in
  `src/app/engine.ts` reads `voiced.planned()` before seeking precisely so it can stay silent about
  `paused` during a restart (0041). The same knowledge must keep `playing` from dipping — a deck
  being rescheduled from a new position was never not playing, and no surface should have to
  debounce to learn that.
- One state, not a second one: no "seeking" flag added to the durable deck and no view-local
  smoothing in `DeckTransport`. Whatever the deck reports is what the button draws.
- A stopped or held deck is unchanged: it still records the new position and still reads paused.
- Proof: a command-level test through `createInstrument` and its manual clock that a `deck.seek` on
  a playing deck emits no transition to stopped and leaves `playing` true across the whole restart
  — it must fail against today's stop-then-start reporting.

**P23 — A loop with IN and OUT handles.** The loop region is marked by two labelled handles, IN and
OUT, sitting in their own strip above the waveform, and those handles and the span between them are
the only things a pointer can drag to change the loop.

- The strip is above the peaks, not on them: the waveform itself goes back to being a thing you
  click to seek and drop a file onto. Dragging IN or OUT moves that edge against the other;
  dragging the region between them slides the whole loop, keeping its length. A press anywhere on
  the peaks is a seek, never a sweep, so shift-to-sweep in `src/ui/Waveform.tsx` goes away with the
  gestures it disambiguated — a loop is created by the loop button and then shaped by its handles.
- Handles are targets you can hit: sized for a pointer rather than the current `GRAB_PX` slop
  against a 2px line, cursored to say which way they move, and reachable — an unloaded deck or a
  deck with no loop shows no handles at all.
- Everything below the gesture layer is untouched: snapping, `MIN_DRAG_PX`, the overlay-then-sync
  discipline, and one `deck.loop` per gesture on release all stay exactly as they are (0025, 0041).
  No command shape changes and nothing durable moves.
- Proof: component tests that a drag on IN sends one `deck.loop` with the OUT edge unmoved, that a
  drag across the region translates both edges by the same travel, and that a press-and-drag on the
  peaks sends `deck.seek` and never `deck.loop`; the existing preview smoke drives a handle.

**P24 — The shell, as primitives rather than as markup.** The header's links become a Menubar, the
wordmark returns home from the dev gallery and the event log, the log lists newest first, and the
shell widens to use the space it is given.

- Menubar is not in `src/ui/components/` yet: it is generated through the same route every other
  primitive was ([0003](decisions/0003-lint-generated-components.md)) and shown in a `#/dev`
  section, or it does not exist. An unlisted primitive is one nobody can see drift.
- The wordmark in `src/ui/App.tsx` becomes a link to the instrument route whenever the current
  route is not the instrument, and stays inert on the instrument itself.
- Newest-first is a change to `src/ui/eventFeed.ts`'s window selection, which both `LogPage` and
  the debug console read — one reading of the ring, so both surfaces move together, and the gap
  detection must stay correct when the list is reversed rather than being reversed at the point of
  render by each surface.
- The shell's max width goes up so a wide screen is used rather than framed, and the widening is
  declared once where the shell's container is — not repeated per page. Narrower breakpoints keep
  working: the deck, the rack and the waveform reflow rather than overflow or clip, and nothing
  below the shell learns a width of its own.
- Proof: unit tests over the reversed window and its gap breaks; the existing `#/dev` render test
  covers the new section; a test that the wordmark links home off-route; the preview smoke drives
  the instrument at a narrow viewport and finds no horizontal overflow.

**P25 — Icons and the right primitive for the job.** Every actionable control carries an
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

**P26 — A rack you can read, and a picker you can find things in.** Each effect instance occupies
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

**P28 — A deck is called a yard.** Every place the interface says "deck" it says "yard", and each
yard carries an emoji of its own — 🏡 yard A, 🌴 yard B — drawn at random from a fixed pool when the
yard is added and kept for that yard's whole life.

- Front-facing only: `DeckId`, `deck.add`, `deck.seek`, `buildDeckChain` and every other internal
  name stay exactly as they are. This is copy and one stored field, not a rename — the words the
  user reads are the deliverable, and per §2's single source of truth the noun is declared once and
  imported, not typed into each surface.
- The pool is fixed, house-and-garden, and free of holiday iconography: it is one exported constant
  beside the copy, and it is small enough that repeats across many yards are expected and fine —
  the emoji names a yard, it does not identify it.
- The random draw happens at the call site, not in the reducer: `src/ui/App.tsx` already picks the
  id it is creating, so it picks the emoji too and sends it in `deck.add`. A reducer that rolled its
  own would make replay, restore and the fingerprint non-deterministic.
- Durable shape moves: a session's `deckIds` becomes a per-deck record so `src/app/restore.ts` can
  replay each `deck.add` with the emoji it was created with. Order is still the session's; no
  migration, and a session that no longer validates is discarded
  ([0026](decisions/0026-pre-release-has-no-migrations.md)).
- Proof: a command-level test that `deck.add` round-trips its emoji through persistence and restore
  unchanged, and one that removing a yard and adding another does not resurrect the old one; a
  component test that two yards render their own emoji and label.

**P27 — WASM, only where it is measured.** Review the instrument for kernels that are genuinely
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
- The gate is the constraint: a build step is exactly the kind of change that moves it by more than
  one step's worth, so measure it and ask before accepting one
  ([0012](decisions/0012-no-one-feature-jumps-the-gate.md)); and a toolchain that is not installed
  must fail the setup script loudly rather than skipping a build step.
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

Offline `render()` calls are the cheap place to prove sound: they join underneath the deck
fixture's real-time waits and cost close to nothing. New browser work that cannot be a render
belongs after the reload, or on its own page — not on the pre-reload critical path.

When a feature changes a data boundary, graph lifecycle, or ownership rule, write the decision and
a failing seam-level test before broad UI work. Do not turn the driver into a second application
by teaching it feature semantics.

## 4. Not scheduled

- Live recording remains out of scope. Offline export is how audio leaves the app.
- Rearranger and paulstretch still wait until beat-aware looping and clips expose a concrete
  workflow; begin as pure JavaScript and move only a measured hot kernel to WASM, under P27's rule
  and starting from what P14's key lock learned about stretching.
- Destructive source editing beyond the crop P20 shipped: no trim history inside a source, no
  splice ([0047](decisions/0047-a-crop-mints-audio-the-user-did-not-import.md)).
- Per-deck routing, sends and a mixer are out of scope: every deck lands in the one master bus
  until a named outcome says otherwise.
- Vocoder, spectral-space variants, Twister-specific modes, and other narrow/high-cost effects
  require a named user outcome and must arrive one plugin at a time.
- Collaboration, accounts, cloud storage, and uploads conflict with the local-first product unless
  that product constraint is deliberately revisited.
