# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device; a performance remains editable, portable, reproducible through
commands, and identical through the live and offline signal paths.

The current baseline is a two-deck instrument with a durable session, portable archives,
bounded undo/redo, performable registry-driven effect racks, a registry-driven automation
workspace, a parametric EQ, beat-aware loop snapping, offline WAV export, and a fast browser
gate. Implementation history belongs in [`docs/decisions`](decisions/); this document contains
only the path forward.

The product outcome guiding the next sequence is:

> A person can shape local samples into a beat-aware performance, recall its sounds and gestures
> exactly, and control it from either the screen or hardware without changing the instrument's
> underlying command model.

---

## 1. Ordered next work

Complete one step, including its full gate, before starting the next. Each step should deliver a
usable vertical slice rather than infrastructure for an unspecified future feature.

P4 through P7 are delivered; each one's reasoning is its decision record, not this file:

| Step | Delivered                                                                                       | Record                                                         |
| ---- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| P4   | bypass, remove and reorder as generic commands; the graph rewired before durable state          | [0023](decisions/0023-performable-effect-racks.md)             |
| P5   | registry-derived automation targets, point editing, Option-held gesture recording               | [0024](decisions/0024-automation-workspace.md)                 |
| P6   | a single-band parametric EQ — one plugin file plus one registry entry, no other production line | —                                                              |
| P7   | worker beat analysis and loop snapping, with the loop as the only durable fact                  | [0025](decisions/0025-beat-analysis-is-derived-not-durable.md) |

P6 needed no record because nothing moved: no command, no restore stage. Its one durable
consequence — a registered parameter changes the stored shape — is settled by
[0026](decisions/0026-pre-release-has-no-migrations.md). That is the evidence P4's and P5's seams hold — an effect and its automatable parameters now cost one
file and one line, as [0016](decisions/0016-effects-are-ordered-plugins.md) claimed they should.

Two facts learned there, before someone rediscovers them:

- `delay.mix` cannot opt into automation the mechanical way. It drives two gain nodes rather than
  one `AudioParam`, so it does not satisfy `automationTarget(param): AudioParam` without further
  plugin work. `delay.time` and `delay.feedback` would follow the ordinary path.
- Analysis is not quite a pure function of a stored source: `decodeAudioData` may resample to the
  device's own rate, so onsets can differ across machines. Nothing durable rests on it — the loop
  is recorded, not the analysis — but a future feature that stores derived analysis must not
  assume otherwise.

### P8 — reusable clip rack

Let a person capture and recall a useful deck setup without creating another playback engine. A
clip is a serialised deck preset referencing an existing source blob: source, loop,
parameters, effect order/state, and automation. Applying one clip is one grouped durable edit
through existing commands.

Done means:

- capture, rename, delete, and apply are ordinary commands with observable events;
- applying a clip is atomic, undoable, and uses the existing graph restoration order;
- clips reuse blob IDs, participate in repository reachability, and travel in portable archives;
- a missing or corrupt source fails before the current deck or graph changes;
- the UI adds no clip-owned transport, clock, graph, or per-frame state;
- fresh-repository archive smoke captures, exports, imports, and applies a clip exactly.

Record clip identity and blob ownership before implementation.

The clip smoke cannot be inline pre-reload work — see the cliff in §3. Place it after the reload
and the restored play, or give it its own page. The restore order it must reuse is now sources →
parameters → effects → bypass → automation → loops, and a clip carries an effect's retained
automation lanes with it, since [0024](decisions/0024-automation-workspace.md) keeps a lane when
its effect goes away.

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
- UI focus, pointer, file, and MIDI boundaries in the existing preview smoke;
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
- Rearranger and paulstretch wait until beat-aware looping and clips expose a concrete workflow;
  begin as pure JavaScript and move only a measured hot kernel to WASM.
- Vocoder, spectral-space variants, Twister-specific modes, and other narrow/high-cost effects
  require a named user outcome and must arrive one plugin at a time.
- Collaboration, accounts, cloud storage, and uploads conflict with the local-first product unless
  that product constraint is deliberately revisited.
