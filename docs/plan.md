# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device; a performance remains editable, portable, reproducible through
commands, and identical through the live and offline signal paths.

The current baseline is a two-deck instrument with versioned sessions, portable archives,
bounded undo/redo, registry-driven effects and parameters, one automation lane, offline WAV
export, and a fast browser gate. Implementation history belongs in
[`docs/decisions`](decisions/); this document contains only the path forward.

The product outcome guiding the next sequence is:

> A person can shape local samples into a beat-aware performance, recall its sounds and gestures
> exactly, and control it from either the screen or hardware without changing the instrument's
> underlying command model.

---

## 1. Ordered next work

Complete one step, including its full gate, before starting the next. Each step should deliver a
usable vertical slice rather than infrastructure for an unspecified future feature.

### P4 — performable effect racks

Turn the existing add-only rack into something a performer can safely change. Add generic
commands and registry-driven controls to bypass, remove, and reorder effects. The graph must be
prepared before durable state changes, and every operation must remain atomic under undo/redo.

Done means:

- bypass, remove, and reorder work through serialisable commands, not component state;
- state, graph order, events, persistence, archives, undo, and redo agree after every operation;
- a bypassed effect retains its parameter values and place in the rack;
- live and offline renders use the same resulting rack, including during automation;
- the existing preview smoke performs each operation without adding another browser launch.

Record the durable bypass representation and graph-transition behavior before implementation.

### P5 — automation workspace

Make automation useful beyond the initial gain demonstration. Add a registry-driven target picker,
enable filter cutoff as the first effect-owned target, and support deliberate point editing:
create, move, and delete. A gesture commits one whole-lane command; playback progress and gesture
drafts remain outside React state.

Hold Option to reveal automation: every automatable deck and effect knob gains a visible highlight.
While Option remains held, moving a highlighted knob records that gesture. Releasing the knob ends
recording and immediately plays the gesture back on a loop; changing that knob normally clears its
recorded automation.

Done means:

- available targets derive entirely from active registry entries and their automation metadata;
- the same editor handles deck gain and filter cutoff without parameter-specific command or UI
  branches;
- create, move, delete, clear, undo, and redo each have explicit transaction semantics;
- effect removal either retains or removes its lanes according to one documented rule;
- scheduled values render identically through live, offline, and exported audio;
- editing a gesture emits one durable event and schedules one autosave.

Do not enable every parameter at once. Prove the generic effect-parameter path with filter cutoff,
then opt in other existing parameters one registry entry at a time.

### P6 — one parametric EQ effect

Add a single-band parametric EQ as one effect plugin with frequency, gain, and Q owned by its
registry entry. It must use native Web Audio nodes unless measurement demonstrates a missing
capability; no DSP dependency or alternate render path is justified for this slice.

Done means:

- add, bypass, reorder, remove, save, archive, restore, undo, and redo require no EQ-specific app
  or UI command;
- frequency, gain, and Q defaults, ranges, labels, validation, controls, and serialization derive
  from the plugin registry;
- at least frequency and gain can opt into the generic automation workspace independently;
- a pure frequency-response assertion and a shared-graph browser fingerprint prove the sound;
- WAV export stays within the existing sample-parity tolerance and gate budget.

Do not start a second advanced effect until the EQ earns its surface in actual use.

### P7 — beat-aware loop snapping

Analyze loaded audio for tempo and onset candidates in a worker, then let the existing waveform
snap loop boundaries to those candidates. Analysis produces data; it never mutates a deck or
constructs an audio graph. Snapping sends the ordinary loop command.

Done means:

- one deterministic click fixture proves BPM and onset positions without browser timing;
- worker messages are serialisable, cancellable, and cannot apply results to a replaced source;
- the durable session records only the analysis facts needed for exact recall, with a versioned
  migration if its shape changes;
- snapping can be enabled, bypassed temporarily, and overridden by an unsnapped drag;
- undo, redo, archive import, and fresh-browser restore preserve the chosen loop exactly;
- analysis and waveform interaction fit inside the existing concurrent browser smoke.

Start with one tempo and a flat onset list. Beat grids, confidence editing, and multiple tempo
regions require evidence from real samples before expanding the model.

### P8 — reusable clip rack

Let a person capture and recall a useful deck setup without creating another playback engine. A
clip is a versioned, serialised deck preset referencing an existing source blob: source, loop,
parameters, effect order/state, and automation. Applying one clip is one grouped durable edit
through existing commands.

Done means:

- capture, rename, delete, and apply are ordinary commands with observable events;
- applying a clip is atomic, undoable, and uses the existing graph restoration order;
- clips reuse blob IDs, participate in repository reachability, and travel in portable archives;
- a missing or corrupt source fails before the current deck or graph changes;
- the UI adds no clip-owned transport, clock, graph, or per-frame state;
- fresh-repository archive smoke captures, exports, imports, and applies a clip exactly.

Record clip identity, blob ownership, and session-version implications before implementation.

### P9 — MIDI input and learn

Add MIDI only after rack operations, automation targets, and clip recall have stable command
surfaces. Browser permission and device discovery form an input adapter; device messages map to
existing commands and never write the store or graph directly.

Done means:

- a serialisable mapping names a message, command target, `ParamId` where relevant, and active or
  explicit deck scope;
- learn mode can bind transport, parameters, rack bypass, and clip recall without special command
  variants;
- disconnects, unsupported messages, and permission refusal fail visibly while keyboard and agent
  input continue working;
- mapping persistence and portability are decided explicitly rather than folded silently into the
  session;
- synthetic MIDI fixtures produce the same state and events as keyboard, UI, or JSONL input.

## 2. Rules for every feature

- `src/app` remains the only writer of session state. UI, workers, keyboard, MIDI, and agent JSONL
  call `send()` with serialisable commands.
- Scheduling stays on `Envelope.at`; command shapes do not grow independent time fields.
- Parameter facts derive from the parameter/effect registries. A new parameter is declared once
  and bound once.
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
- Session changes add a version and migration; shipped migrations are immutable.
- No new dependency is added without approval and a statement of what it replaces.

## 3. Proof and delivery

`./scripts/check` remains the full gate and stays under the four-second budget from
[0012](decisions/0012-the-gate-stays-under-four-seconds.md). Each feature adds the cheapest proof
at the layer that owns the behavior:

- pure normalization, analysis, and DSP assertions in colocated Vitest tests;
- command, event, history, and failure atomicity through `createInstrument` and its manual clock;
- graph scheduling and sound through the existing live/offline browser run;
- UI focus, pointer, file, and MIDI boundaries in the existing preview smoke;
- export parity by comparing every encoded sample with the shared graph buffer.

One fact has one emitter. `probe()` remains durable/session state, the event log remains discrete
behavior, and `peek()`/`peaks()` remain allocation-free continuous/sample-derived reads. A UI ring
drop is loud; a sequence gap in `./scripts/drive` is always a bug.

When a feature changes a data boundary, graph lifecycle, or ownership rule, write the decision and
a failing seam-level test before broad UI work. Do not turn the driver into a second application
by teaching it feature semantics.

## 4. Not scheduled

- Live recording remains out of scope. Offline export is how audio leaves the app.
- Rearranger and paulstretch wait until beat-aware looping and clips expose a concrete workflow;
  begin as pure JavaScript and move only a measured hot kernel to WASM.
- Vocoder, spectral-space variants, Twister-specific modes, and other narrow/high-cost effects
  require a named user outcome and must arrive one plugin at a time.
- Collaboration, accounts, cloud storage, and uploads conflict with the local-first product unless
  that product constraint is deliberately revisited.
