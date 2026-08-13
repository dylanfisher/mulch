# 0011. Sound: how a worklet is loaded, who reports transport facts, and where a param is bound

- **Date:** 2026-08-13
- **Status:** accepted

## Context

M2 of [docs/plan.md](../plan.md): the first audio. The plan settled most of it — one chain for
live and offline, a limiter and soft clip from day one, schedule-ahead transport, synthetic
sources so an agent needs no fixtures. This records the four things it left open, three of
which it named as the day's real friction.

## Decision

- **A worklet is plain JavaScript, loaded by `?url` through one helper.**
  `src/audio/worklets/loop-reporter.js` is `.js`, not `.ts`: a worklet is its own module graph
  with no bundler preamble, and `?url` on a `.ts` file copies it to the output untransformed,
  where it reaches the browser as a syntax error. `src/audio/worklet.ts` is the only place
  `addModule` is called, and it exports the processor's registered name so the two sides of
  that string cannot drift. Verified identical under `./scripts/drive` (preview) and
  `./scripts/drive --dev` — the same fixture produces the same event sequence under both,
  which is the parity claim the harness existed to be able to check.

- **The audio thread is the single source of "it started" and "it looped".** The reporter
  processor watches `currentTime` against a plan posted when playback starts, and posts back
  the boundary times it computes — never the block time it noticed them at. The main thread
  never infers either fact from a timer, so there is one source per fact (plan §1). This is
  why `EventBus.emit` grew an optional `at`: the port hop is latency in the reporting, not in
  the event, and an event that says when it happened must not be stamped when it arrived.

  The cost is a worklet that produces no audio, connected to the destination only so the audio
  thread keeps pulling it. That is cheaper than the alternative it replaces.

- **`playing` is written by the graph, never on intent.** Playback begins a lookahead after the
  command, and a one-shot source ends without anyone asking. So `deck.play` writes nothing:
  `src/app/engine.ts` sets `playing` from the graph's own report, and a probe taken in the
  ~50 ms between is honest about the deck not having started yet. Every other session field is
  written by `src/app/execute.ts`. One writer per field, both inside `src/app`.

- **A parameter is declared in `params.ts` and bound in `chain.ts`, and the compiler names the
  second place.** `buildDeckChain` holds `{ "deck.gain": gain.gain, … } satisfies
Record<ParamId, AudioParam>`, which is total: adding an id to the registry fails to compile
  until it is wired to a node. This is a deliberate reading of AGENTS.md's "one place per
  parameter" — a parameter is _defined_ once, and its range, label, default, UI, clamping and
  serialisation all still derive from that one definition. What the second line buys is the
  node it drives, which cannot be derived from anything. It is not a rule an agent has to
  remember, because forgetting it is a type error.

  Not the alternative — a `bind: "gain.gain"` string in the registry — because that trades a
  compile-time failure for a runtime one, which is the wrong direction. M5 revisits this from
  the other side: an effect file will declare its params _and_ its `build` together, so an
  effect's params are one line in one file. `chain.ts` is the deck's version of that file.

## Consequences

`./scripts/drive fixtures/deck-smoke.jsonl` loads a generated click train, loops it, and prints
loop cycles stamped at exactly `started.at + n × period` — a timing assertion readable without
ears, and the first one `scripts/smoke` makes. `#/` is now the instrument rather than a splash:
five sources, transport, loop and the registry's knobs, every control sending a command the CLI
can also send.

Two things M2 does not do. `deck.load` with a `{ blobId }` source reports itself unimplemented
rather than guessing: decoding real audio is `ingest`'s other half, and ingest writes the blob
store, which is M6's. And nothing asserts what the audio _sounds_ like yet — that is M3's
fingerprint, and the pinned Chromium is already waiting for it.
