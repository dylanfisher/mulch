# Post-P3 roadmap

The instrument spine and the first post-M8 sequence are complete. M0–M8 established commands and
events, the three audio hosts, the fast browser gate, one shared signal chain, the read channel,
effect plugins, versioned local persistence, offline WAV export, and registry-driven decks. P1–P3
added portable archives, bounded history, and one end-to-end automation lane. The decisions in
[`docs/decisions`](decisions/) are the history; this file is only the plan from here.

No feature is ordered next. The next commitment starts with a concrete user outcome and the
smallest vertical slice that proves it; MIDI remains explicitly deferred.

The claim that still organises the work is:

> Anything the UI can do, it does by sending a command. The same command can come from a person,
> a fixture, an offline performance, or an input adapter, and the resulting facts are observable.

---

## 1. Stable interface: commands in, events out

These are constraints on every roadmap item, not work to revisit:

- `src/app` is the only writer of session state. UI, keyboard, future MIDI, and agent JSONL all
  call `send()` with serialisable commands.
- Scheduling stays on `Envelope.at`; command shapes never grow their own time fields.
- `ParamId`, defaults, validation, UI metadata, persistence, automation, and future MIDI targets
  derive from the parameter/effect registries.
- Raw files do not enter commands. Ingest may store bytes and return a serialisable handle, but it
  does not mutate the session; an ordinary command performs the mutation.
- One fact has one emitter. Audio-thread timing facts come from the audio thread, while app-owned
  state changes are emitted by the command executor.
- `probe()` is JSON session state, the event log is discrete behavior, and `peek()`/`peaks()` are
  the allocation-free continuous/sample-derived reads. None exposes an audio graph object.
- The UI event ring may drop loudly; `./scripts/drive` receives the lossless forwarded stream. A
  sequence gap in the driver is always a bug, never normal backpressure.

The implemented boundary is recorded in [0009](decisions/0009-the-app-tier.md),
[0010](decisions/0010-the-harness-transport.md), and
[0014](decisions/0014-the-read-channel.md).

## 2. Stable execution model: one graph, three hosts

| Host         | Context               | Purpose                                      |
| ------------ | --------------------- | -------------------------------------------- |
| **live**     | `AudioContext`        | The person-facing instrument                 |
| **headless** | `AudioContext`        | Real timing, worklets, events, browser smoke |
| **offline**  | `OfflineAudioContext` | Deterministic performances and WAV export    |

`buildDeckChain(BaseAudioContext)` and the effect registry are the only production signal path.
Live, headless, offline, fingerprint, and export may orchestrate that graph differently; none may
rebuild its DSP. `scripts/arch` guards the constructor ownership, and the M7 browser parity test
compares every exported PCM sample with the shared graph buffer within the encoder-owned half-LSB
tolerance. See [0018](decisions/0018-offline-export-parity.md).

Offline determinism is scoped to the pinned Chromium revision. Fingerprints use their centrally
defined tolerances; sample counts, event sequence, session shape, and WAV layout remain exact.

## 3. Stable feedback loop: seconds, not minutes

`./scripts/check` is the gate and remains under the four-second budget from
[0012](decisions/0012-the-gate-stays-under-four-seconds.md). It covers format, lint, typecheck,
architecture, pure tests, preview-build browser smoke, event sequence, persistence, restore,
offline fingerprints, export parity, and keyboard command routing.

Every feature below must add the cheapest assertion at the right layer:

- pure transformations and validation in colocated Vitest tests;
- state/command/event behavior through `createInstrument` under the manual clock;
- graph timing and exported sound in the existing browser/offline smoke;
- UI integration in the existing browser run when DOM focus, files, or Web Audio matter.

No new serial browser launch is acceptable while an existing concurrent run can carry the proof.
A flaky timing assertion is a defect in the gate or synchronization, not a reason to retry.
`./scripts/drive` remains a transport and never learns feature-specific semantics.

## 4. Completed ordered work

### P1 — portable session archives

Complete. The dependency-free container preserves exact blob IDs and bytes, validates before an
atomic import, and round-trips through the preview build's real download/file-input boundary. See
[0020](decisions/0020-portable-session-archives.md).

### P2 — bounded undo and redo

Complete. In-memory checkpoints cover durable command-owned state, groups commit atomically,
history is capped centrally, blob reachability follows retained checkpoints, and stale async work
cannot overwrite a restored point. See [0021](decisions/0021-bounded-snapshot-history.md).

### P3 — parameter automation

Complete. SessionV3 stores generic `ParamId` lanes; one registry-enabled gain lane saves,
migrates, archives, restores, undoes, redoes, and schedules through the shared live/offline graph.
Pointer gestures commit once without per-frame React state or per-point autosaves. See
[0022](decisions/0022-parameter-automation.md).

## 5. Next decision point

Before starting another feature:

1. Name one user outcome and its end-to-end acceptance test.
2. Choose the smallest vertical slice below that proves it without adding a parallel writer,
   graph, or timeline.
3. Record any new boundary in a decision and add the cheapest failing seam-level test before UI
   breadth.

Candidate slices, only when the outcome calls for one:

- Add one advanced effect at a time through the plugin registry. Pitch or parametric EQ must earn
  its parameter surface and keep export parity before another effect starts.
- BPM/onset analysis belongs in a worker and must feed data, not mutate decks directly.
- A clip rack needs a decision proving that a clip is a serialized source/deck preset rather than
  a parallel playback engine.
- Rearranger and paulstretch start as pure JavaScript and move a measured hot kernel to WASM only
  after profiling.
- Vocoder, spectral-space variants, Twister-specific modes, and other high-cost/narrow features
  are not scheduled.

**Live recording remains out of scope.** Offline export is how audio leaves the app; portable
session archives move editable work.

### Deferred: MIDI input and learn

MIDI is an input adapter over existing commands, never a graph/store side door. Device messages
map to active-deck transport commands and registry parameters; learn state names `ParamId` and
serialisable deck scope. Unsupported or disconnected devices fail visibly without affecting the
keyboard or agent paths.

Done means a synthetic MIDI fixture can select a deck, toggle transport, and change a parameter,
with the same state/events as keyboard or JSONL input. Browser permission/device discovery stays
outside the command payload, like file ingest.

## 6. Stop signs

Stop and repair the seam if a change introduces any of these:

- a UI component, shortcut, MIDI adapter, importer, or worker writing session state directly;
- a second graph builder, export-only effect route, or exact-float fingerprint assertion;
- a component holding `AudioContext`, `AudioNode`, `AudioBuffer`, or per-frame React state;
- a second RAF loop, allocating `peek()`, or recomputing peaks after load;
- a parameter fact declared outside its registry owner, or an effect hand-wired outside the rack;
- a current session projection whose deck IDs can drift from its frozen version schema;
- a raw file, function, node reference, or scheduling field inside a command;
- an event inferred twice, an error swallowed, a sequence gap normalized away, or a flaky smoke
  converted into a retry;
- feature knowledge in `scripts/drive`, a second build mode under test, or a gate over budget;
- a new dependency, session version, colour literal, or architectural edge without its required
  approval/decision/documentation.

When a feature pressures one of these constraints, the next step is a small decision record and a
failing seam-level test—not a special case.
