# Post-M8 roadmap

The instrument spine is complete. M0–M8 established commands and events, the three audio hosts,
the fast browser gate, one shared signal chain, the read channel, effect plugins, versioned local
persistence, offline WAV export, and registry-driven decks with an active deck and shortcuts.
The decisions in [`docs/decisions`](decisions/) are the history; this file is only the plan from
here.

The next objective is **portable sessions**, followed by history, automation, and MIDI. That order
finishes the remaining core data boundary before the session grows, settles undo semantics before
adding a high-volume command producer, and gives MIDI a target model to reuse.

The claim that still organises the work is:

> Anything the UI can do, it does by sending a command. The same command can come from a person,
> a fixture, an offline performance, or an input adapter, and the resulting facts are observable.

---

## 1. Stable interface: commands in, events out

These are constraints on every roadmap item, not work to revisit:

- `src/app` is the only writer of session state. UI, keyboard, future MIDI, and agent JSONL all
  call `send()` with serialisable commands.
- Scheduling stays on `Envelope.at`; command shapes never grow their own time fields.
- `ParamId`, defaults, validation, UI metadata, persistence, and future automation/MIDI targets
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

## 4. Ordered next work

### P1 — portable session archives

Local SessionV2 persistence is complete; the missing core capability is moving a session and its
referenced audio bytes between browsers without changing those bytes.

Before implementation, record the archive container and the file-ingest handle. A raw `File`
cannot enter a command, and importing an archive cannot become a second session writer. Export
projects the current versioned session plus exactly its referenced blobs. Import validates the
whole archive, migrates its manifest, stages blobs, and only then applies one session command
atomically through ordinary restoration behavior.

Done means:

- export → fresh repository → import round-trips the durable session exactly;
- original blob bytes and IDs are preserved or remapped once by one owned mapping;
- missing, duplicate, corrupt, extra, and unsupported entries fail before live state changes;
- failed import leaves both the current snapshot and blob reachability unchanged;
- archive creation and parsing are pure/worker-friendly, with no main-thread audio work;
- the preview-build smoke exercises the user-facing file boundary without pushing the gate over
  budget.

No archive dependency is added without approval. If a container choice needs one, the decision
must state what it replaces and its browser/build cost.

### P2 — bounded undo and redo

Decide snapshot/checkpoint replay versus inverse commands before writing UI. Commands being data
makes history possible, but asynchronous loads, blob references, graph reports, and autosave make
the choice non-trivial.

History covers durable command-owned state only. Playback reports, playhead/meter values, ingest,
and persistence events are not undo entries. `history.undo` and `history.redo` are commands; UI
buttons and shortcuts are only producers. Restoring a point uses the existing graph restoration
order and reuses blob IDs rather than copying audio.

Done means:

- one documented transaction boundary handles a single command and grouped edits;
- history has one centrally defined cap and truncates redo on a divergent edit;
- save/restore states whether history persists, with a migration if the durable shape changes;
- async load completion cannot resurrect a state invalidated by undo;
- command/event tests cover empty history, branching, grouped edits, and blob-backed sources.

### P3 — parameter automation

Build one lane end to end before adding a second editor gesture. Automation targets `ParamId`; it
does not create per-parameter command unions or alternate effect bindings. Points live on the same
timeline as envelopes and render through the same live/offline graph.

First settle sample/time normalization, interpolation, edit transactions, and session versioning.
The audio thread or scheduled `AudioParam` owns sample-critical application; RAF only draws. Lane
editing writes durable commands, while playback progress remains on the continuous read channel.

Done means one automated registry parameter:

- saves, migrates, restores, undoes, and redoes;
- renders identically through the shared offline/export chain;
- is editable without per-frame React state or per-point autosaves;
- produces no parameter-specific branch outside its registry-owned binding.

### P4 — MIDI input and learn

MIDI is an input adapter over existing commands, never a graph/store side door. Device messages
map to active-deck transport commands and registry parameters; learn state names `ParamId` and
serialisable deck scope. Unsupported or disconnected devices fail visibly without affecting the
keyboard or agent paths.

Done means a synthetic MIDI fixture can select a deck, toggle transport, and change a parameter,
with the same state/events as keyboard or JSONL input. Browser permission/device discovery stays
outside the command payload, like file ingest.

### Later, only with a concrete user outcome

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

## 5. Stop signs

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
