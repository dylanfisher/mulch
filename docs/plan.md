# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device; a performance remains editable, portable, reproducible through
commands, and identical through the live and offline signal paths.

The current baseline is an any-number-of-decks instrument with a durable session, portable
archives, bounded undo/redo, effect racks holding instances, a gesture-relative lane on every
continuous parameter but the read rate, beat-aware loop snapping and sliding, a waveform a click
seeks in without the deck reading as stopped, a loop shaped by labelled IN and OUT handles in
their own strip, per-deck speed and pitch, a clip rack that draws what it holds, a toggleable
debug console, imports in every format the browser decodes through a picker or a drop on the
waveform, a crop that makes the loop the deck's whole source, offline WAV export, a shell whose
routes hang off a menubar and whose width is declared once ([0054](decisions/0054-the-shell-owns-the-width.md)),
controls that carry the primitive their behavior implies and one icon per action from a single
vocabulary ([0055](decisions/0055-a-state-is-a-toggle-and-an-action-has-one-icon.md)), a rack of
one row per instance whose effects are added from a popover the registry renders, each entry
carrying the icon its own plugin declares ([0056](decisions/0056-an-effect-carries-its-own-icon.md)),
a newest-first event feed both log surfaces read, decks the interface calls yards, each carrying
an emoji of its own drawn when it was added ([0057](decisions/0057-a-deck-is-called-a-yard.md)),
and a fast browser gate.
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
things wrong with the surface all that audio is performed on — a seek that flickered (P22, done)
and a loop with no handles (P23, done) — then the shell the rack redesign depends on (P24, done)
and the primitive pass beside it (P25, done), then the rack itself (P26, done), then the renaming
that is cheapest once those surfaces have settled (P28, done), and last the one measurement-driven
question. Each entry says what durable shape moves, because that is what makes a step expensive;
none of them get a migration ([0026](decisions/0026-pre-release-has-no-migrations.md)).

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
