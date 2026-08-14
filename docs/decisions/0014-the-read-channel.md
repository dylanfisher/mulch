# 0014. The read channel

- **Date:** 2026-08-13
- **Status:** accepted

## Context

M4 needs a waveform, a playhead and a meter, and none of them fit the two channels the facade
had. `probe()` is the session as JSON — a buffer's samples are not JSON, and a value that
changes every frame has no business being polled through it sixty times a second. The event log
is discrete facts — a playhead is not a fact that happened, it is a value that is. The store
would rerender React at frame rate for values React should never see.

The tempting shortcut is the failure [docs/plan.md](../plan.md) §5 names first: hand `ui` the
`AudioBuffer` and let a component read `ctx.currentTime`. That is a second read path into the
graph, the mirror image of the second write path the command seam exists to prevent, and it
grows unreviewably — every component that takes it is one more place the graph's types leak
into React.

## Decision

**Continuous and bulk reads are a third channel on the facade, beside `probe()` and the log.**

- **`peek(deck)`** returns `{ position, meter }` — numbers only. It never allocates and never
  writes: each call refills one object per deck, preallocated in `createInstrument`, and hands
  the same object back. The value is live until the next peek of that deck; a caller that wants
  to keep it copies the numbers out. With no engine — the pure Vitest host — it reads zeros,
  the way `probe()` reads a silent session. The identity `peek(d) === peek(d)` is asserted in
  `facade.test.ts`; it is the allocation contract made testable.
- **Position is main-thread arithmetic over the transport's own plan.** The `{ startTime,
offset, period }` the voice already posts to the loop-reporter worklet is mirrored in the
  voice and read through `playheadAt` in `src/lib/timeline.ts` against `ctx.currentTime`. The
  worklet keeps its floor-division twin (cycles completed); the two files name each other.
- **The meter is an `AnalyserNode` dead-end tap** after the pan node in `buildDeckChain` —
  `DeckChain.level()`, peak `|sample|` over a ~21 ms window into one preallocated scratch
  buffer. The `pan → destination` edge is untouched, so the golden fingerprint cannot move; the
  gate proves the tap is inaudible. An analyser costs nothing until it is read.
- **`peaks(deck)`** hands out the buffer reduced to `PEAK_COLUMNS` (2048) min/max columns —
  computed once per `deck.load` in the engine with the same `src/lib/peaks.ts` the offline PNG
  uses, cached per deck, overwritten on reload (the overwrite is the invalidation), `null`
  before the first load. `Float32Array`s by reference: numbers only, no copy, no `AudioBuffer`.
  The fixed column count is what keeps "once per load" literal — a canvas resize resamples,
  never recomputes.
- **`ui` consumes the channel from one `requestAnimationFrame` loop** (`src/ui/frame.ts`) that
  starts with its first subscriber and stops with its last. Callbacks peek, write refs, and
  paint imperatively; no per-frame value ever enters React state, and no component calls RAF
  itself.

## Alternatives considered

- **Widening `probe()`** — sixty JSON snapshots a second, allocated to be discarded, and the
  samples still do not fit. `probe()` stays the state channel (0009 already rejected this).
- **Events at frame rate** — the log carries facts with a `seq`; a playhead stream would bury
  every real fact under sixty non-facts a second and make gapless-`seq` assertions meaningless.
- **Per-frame values in the store** — frame-rate rerenders, and `Float32Array` peaks would end
  a JSON-serialisable session.
- **A metering/position worklet posting per frame** — turns a pulled read into a pushed stream
  over a MessagePort, costs audio-thread work when nobody is looking, and the port is the log's
  channel. Per-frame values are read when wanted, not reported.
- **Reading level from the buffer at the peeked position** — measures the source, not the
  signal: blind to gain, pan and every effect M5 adds. A meter that disagrees with the ears is
  worse than none.
- **Handing `ui` the `AudioBuffer` / `ctx.currentTime`** — the second read path, rejected
  above; it is the reason this decision exists.

## Consequences

Any component gets a per-frame value by registering one callback — no new plumbing per
consumer, and `window.mulch` picks the members up through the existing spread, so `peek` and
`peaks` are already reachable from `./scripts/drive`'s REPL.

The reused object is a liveness contract callers have to know: `peek()`'s return is invalid
after the next peek of the same deck. It is documented on the type and cheap to honour (read
the two numbers, move on), but storing the object somewhere is a bug this decision accepts as
possible.

Under `OfflineAudioContext` the analyser reads whatever block was last rendered — meaningless
mid-render, and nothing offline peeks. Meter ballistics (decay) are a drawing concern for the
UI layer, never smoothed in the channel.

Revisit if a per-frame value ever needs to be **written** per frame — 0009 said the same: that
would need its own lane, and it is not this one.
