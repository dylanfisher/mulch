# 0025. Analysis is derived data, and the loop it helped choose is the only durable fact

- **Date:** 2026-08-14
- **Status:** accepted

## Context

P7 asks for beat-aware loop snapping: measure a loaded source for tempo and onset candidates,
then let the waveform's existing drag land its edges on those candidates. The roadmap is explicit
about the shape of the thing — analysis produces data, never a deck mutation and never a graph —
and about where it runs: a worker, which is the first file `src/workers/` has ever held.

Three questions had to be answered before any code. What crosses the worker boundary, and how a
reply that arrives after the deck has moved on is prevented from overwriting newer state — the
standing rule in [plan §2](../plan.md#2-rules-for-every-feature) that async work carries identity.
What, if anything, the durable session has to record so a performance recalls exactly; the roadmap
allows a versioned migration and this decision has to say whether one was earned. And what the
performer's control over snapping actually is: a toggle, a temporary bypass, and a drag that
overrides it are three different affordances that could each have been the only one.

The tempting shortcut is the one [0014](0014-the-read-channel.md) already refused in another
costume: hand the worker — or the UI — the `AudioBuffer` and let it decide something. Analysis is
allowed to read samples and is allowed to produce numbers. It is allowed to do nothing else.

## Decision

**Analysis is pure maths in `src/lib/analysis.ts`, and the worker is a shell around it.**
`analyzeBeats(channels, sampleRate)` takes split channels and returns `{ bpm, onsets }` — one
tempo and a flat ascending list of onset seconds, exactly what the roadmap asked to start with. It
takes a peak envelope per hop, rectifies its rise into an onset detection function, picks local
maxima above a threshold derived from that function's own peak and mean, and refines each
accepted hop to the loudest sample within a hop either side — so an onset is an exact sample of
the buffer rather than a hop boundary. The tempo is the median inter-onset interval folded into
`[MIN_BPM, MAX_BPM)` by doubling and halving; fewer than two onsets means `bpm: 0`, which is "no
tempo", the way `duration: 0` already means "nothing loaded". None of that touches a context, a
deck, or the store, so the whole thing is proved by a colocated Vitest test against
`renderGen("click-train", …)` — a generator whose onsets are exact samples by construction
(`src/lib/waveform.ts`), which makes BPM and onset positions assertable to the sample without any
browser timing at all. That is the cheapest proof at the layer that owns the behaviour
([plan §3](../plan.md#3-proof-and-delivery)), and it is why the maths is not in the worker.

**Worker messages are plain data, and identity lives on the host.** `analyze` carries a
`requestId`, a `sampleRate` and the channels; `cancel` carries a `requestId`; a reply is
`analyzed` or `failed`, carrying the same `requestId` back. Channels are structured-cloned and
never transferred — transferring would detach the `AudioBuffer` the deck is playing. `src/app`
owns two maps, request id → deck and deck → its one live request id, and **a reply whose request
id is not the one its deck is currently waiting on is dropped before it can be applied**. That is
the load-bearing guard: a reload during a decode, an undo, or an archive import all supersede,
and each supersession issues a new id. `cancel` is the second, cheaper half — it saves the work
rather than the correctness, and it can genuinely stop a queued request because the worker
enqueues each message and drains on a later task, so a cancel posted in the same tick is seen
first.

**The durable session records nothing new; there is no v5.** Analysis is a deterministic function
of samples, and the samples are a deterministic function of a source the session already records
exactly — an unchanged blob or a generator spec — _given a stable decode_. That caveat is real
and deliberately tolerated: `src/audio/context.ts` builds its `AudioContext` without naming a
rate, so `decodeAudioData` resamples a blob to whatever the device outputs at, and two machines
can measure onsets a fraction of a sample apart. Nothing durable rests on it. What has to come
back exactly is the loop, and the loop is stored as raw seconds and replayed as raw seconds,
never re-derived from a candidate list. Storing `bpm` and `onsets` would be a second copy
of a fact that is already recoverable, which is principle 1's definition of the thing not to do,
and it would be a copy with no error message when it rots: an improved analyser would leave every
stored session carrying the old analyser's answers forever, and a migration could not recompute
them without an `AudioContext`. What actually needs exact recall is **the loop the performer
chose**, and `deck.loop` already records it, in seconds, in the durable session, through history,
archives and restore. Snapping sends that ordinary command with different numbers in it. So
`analysis` is transient deck state in `src/state/store.ts` beside `duration` and `playing`,
written by `src/app` when a reply lands, absent from `sessionV4`'s projection, re-derived on every
load — including the loads a restore, an undo and an archive import perform. Every shipped
migration stays untouched because none of them had anything to say about this.

**Snapping is a view preference, and three separate affordances.** It is _enabled_ per deck by a
pressed button on the waveform, disabled while that deck has no analysis. It is _bypassed
temporarily_ by holding Shift during a drag, read live so the overlay shows what will be
committed. It is _overridden_ by that unsnapped drag simply by being a normal `deck.loop`: the raw
seconds land in the session and stay there, undoably, exactly as any other loop edit does. Both
edges of a gesture snap or neither does, and `snapLoop` refuses a snap that would collapse the two
edges onto one candidate — a loop of zero length is a cleared loop, and no drag means to clear.
The toggle itself is React state in the component, not session state: it is a property of how this
person is dragging right now, like the automation workspace's Option-hold arming
([0024](0024-automation-workspace.md)), and making it durable would put a display preference into
undo, autosave and every archive.

## Alternatives considered

- **Recording `bpm` and `onsets` in a v5 session** — rejected because it is a second copy of a
  fact the source already determines, it makes the analyser's output a format nobody can change
  without a migration that would need an audio context to run, and it buys nothing: the loop is
  what has to come back exactly, and the loop is already durable.
- **Recording only `bpm`** — rejected for the same reason and one more: a tempo without the onsets
  it was derived from cannot snap anything, so it would be a display string in the durable format.
- **Analysis in the audio tier, on the main thread** — rejected because a 60-second source is
  millions of samples and the pass would land on the thread that paints the waveform; the roadmap
  named a worker, and the worker is what keeps `analyzeBeats` free to be O(n) and obvious.
- **The maths inside the worker** — rejected because the deterministic click fixture would then
  need a worker to run, which means a browser, which is exactly the timing dependency the Done
  bullet forbids. The worker holds no arithmetic worth testing.
- **Transferring the channel buffers** — rejected because they are views onto the `AudioBuffer`
  the deck is about to play; a transfer detaches it. Cloning costs one copy per load.
- **Cancellation as the only staleness guard** — rejected because a cancel cannot recall a reply
  already posted. Identity is checked on arrival regardless of whether a cancel was sent.
- **A `deck.analyze` command** — rejected because analysis is not an edit: it changes no durable
  state, so it would be a command that must never enter history, never autosave, and never appear
  in an archive. It follows a load the way peaks already do.
- **The analysis on a fourth read channel beside `peek()` and `peaks()`** — rejected because a
  reply arrives asynchronously and the UI has to re-render when it does; `peaks()` gets away with
  being a bare read only because a load writes `source` in the same turn. The store is the channel
  for a value that changes discretely, which is what this one does.
- **Onsets on the event body** — rejected because the log's ring would carry a thousand numbers
  per load. `deck.analyzed` carries the tempo and the candidate count; the candidates are on
  `probe()`.
- **A durable snap preference** — rejected because it would be undoable, autosaved and archived:
  pressing a display toggle would become a session edit, and importing someone's archive would
  change how your mouse behaves.
- **Snapping only the moving edge** — rejected because the sweep that creates a loop has no fixed
  edge worth preserving, and a loop with one snapped end is not on the grid.
- **Beat grids, confidence editing, multiple tempo regions** — not built, as the roadmap
  instructs: they need evidence from real samples, and this slice has one tempo and a flat list.

## Consequences

Improving the analyser is now a pure change to one `src/lib` file plus its test. No migration, no
stored format, no archive concern — every session re-derives on load, so the next algorithm is
live everywhere the moment it ships. The price is that every load pays the analysis again,
including a restore of a session that was analysed a second ago; the pass is one linear sweep on a
worker thread and nothing waits for it.

A deck can be dragged before its analysis arrives. That drag simply does not snap — there is
nothing to snap to yet — and the button is disabled until there is. This is visible rather than
hidden, which is the intent.

`bpm: 0` is a real answer for a source with fewer than two onsets, and a sustained pad will
produce it. Onsets are bounded by `MAX_ONSETS`, keeping the strongest when a dense source exceeds
it, so `probe()` stays a reasonable JSON document for any source the loader accepts.
