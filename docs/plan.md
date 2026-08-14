# Build plan

What to build, in what order, and which seams have to be right before the first feature lands.
Derived from [NEW_APP_GUIDE.md](../NEW_APP_GUIDE.md) — that file says what went wrong last time and
is not repeated here. This one says what we do about it.

The scaffold ([0001](decisions/0001-stack-and-tiers.md)) bought the tiers, the gate, the token layer
and the control gallery. M0–M3 bought the rest of the spine: the `src/app` tier, `./scripts/drive`,
the first sound, and fingerprints. **We are at M4** — see §4 for what is done and what is left.

## The claim this plan is organised around

> **Anything the UI can do, it does by sending a command. So anything a person can do, an agent can
> do — headlessly, against a real Web Audio graph, and observe what happened.**

That is one architectural constraint, not a testing afterthought, and it had to be true before the
first deck existed. Added later it would have been a second implementation of the app, which is
exactly the failure the post-mortem describes (§2.2, four parallel render paths).

Three consequences, all load-bearing:

1. **The engine is headless by construction.** React subscribes to it. It never owns it.
2. **Every mutation is a serialisable command.** A click, a keystroke, a MIDI note and an agent's
   JSON line all arrive at the same entry point.
3. **Every state change and audio milestone is an event** carrying an audio-clock timestamp. The
   log is the ground truth about what the instrument did — for the UI, for tests, and for agents.

---

## 1. The seam: commands in, events out

`src/app` is the headless instrument. It may import `lib`, `audio`, `workers` and `state`; `src/ui`
may import it, and nothing may import `ui`. Recorded as
[0009](decisions/0009-the-app-tier.md); enforced by [`scripts/arch`](../scripts/arch).

`src/ui` keeps its direct import of `state`, for reads only: per-frame subscription has to reach the
store without a round trip through `probe()`. **`src/app` is the only writer.** `scripts/arch` can
enforce the import edge but not the direction of the write, so that half is a review rule — see §5.
The read-only half is a type: `SessionReader`, which is all `ui` is ever handed.

```ts
// app/commands.ts — the only way to change anything
export type SourceRef =
  | { blobId: string } // real audio, already in the blob store — see the ingest rule below
  | { gen: "sine" | "click-train" | "sweep" | "noise" | "silence"; secs: number; hz?: number };

export type Command =
  | { t: "deck.load"; deck: DeckId; source: SourceRef }
  | { t: "deck.play"; deck: DeckId }
  | { t: "deck.stop"; deck: DeckId }
  | { t: "deck.loop"; deck: DeckId; in: number; out: number }
  | { t: "param.set"; deck: DeckId; param: ParamId; value: number } // ParamId from audio/params.ts
  | { t: "effect.add"; deck: DeckId; effect: EffectId }
  | { t: "session.save" }; /* … */

// When a command runs is the transport's business, not the command's.
export type Envelope = { at?: number; cmd: Command }; // `at`: seconds on the timeline

// app/events.ts — the only way to observe anything
export type Event = {
  seq: number; // monotonic, gapless — a hole means we dropped something
  at: number; // ctx.currentTime when it happened, not when it was reported
  wall: number; // performance.now(), for correlating with UI-thread work
} & (
  | { t: "deck.started"; deck: DeckId; offset: number }
  | { t: "deck.looped"; deck: DeckId; cycle: number }
  | { t: "param.changed"; deck: DeckId; param: ParamId; value: number }
  | { t: "xrun"; detail: string } // a scheduling deadline we missed — never swallowed
  | { t: "error"; detail: string } /* … */
);
```

Rules that keep this honest:

- `send(cmd)` is the **only** mutator on the facade. No setter escapes onto the store or the graph.
  Adding a parameter still adds no command — `param.set` is already generic over `ParamId`.
- Commands are **data**: JSON-serialisable, no functions, no node references. That is what lets a
  file of them be a test, a macro, a repro attached to a bug, and later an undo log.
- **Ingest is the one sanctioned pre-command step.** A dropped `File` is not JSON, so it cannot
  ride in a command. `ingest(file): Promise<BlobId>` on the facade writes the blob store — and
  **only** the blob store, never session state — then the mutation is an ordinary
  `deck.load` carrying `{ blobId }`. Synthetic sources need no ingest, which is why agent repros
  stay self-contained one-liners. An ingest path that touches session state is the side door §5
  watches for.
- **Every param value is a number.** Discrete choices (filter type, loop on/off) are stepped
  integers in the registry (`step: 1`, labelled values), the way plugin hosts do it. This keeps
  `param.set` uniform forever; a `value: number | string | boolean` union is a command-shape
  migration waiting to happen.
- **Scheduling lives in the envelope, not the command.** `at` says when a command is delivered;
  nothing inside a command carries a time. One queue drains envelopes against the clock, and it is
  the same queue live (where `at` is absent, meaning now) and offline (where a whole performance is
  one file of stamped envelopes). A command that grows its own `when` field is the seam leaking.
- **Time comes from an injected clock**, `{ now(): number }` — the live/offline implementations
  return `ctx.currentTime`, the test one is a number you set. The bus took it as a constructor
  argument from M0, before any `AudioContext` existed, so nothing had to be unpicked at M2.
- Events are emitted from **one** place per fact. A worklet posting `deck.looped` over its port and
  the main thread also inferring it from a timer is two sources of one truth; pick the worklet.
- **Events flow up against the import direction, and that is fine — by inversion, not by import.**
  `deck.looped` originates in a worklet, but the bus lives in `app`, and `audio` may not import
  `app`. `audio` exposes ports and callbacks; `app` subscribes and stamps `seq`. The first time
  someone is tempted to import the bus downward into `audio`, this bullet is the answer.
- **Slow consumers and lossy emitters fail differently.** The fixed-size ring buffer is the _UI's_
  view of the stream and **drops loudly** — the `#/log` panel renders a `seq` gap as a break in the
  list, never silently (principle 5). `./scripts/drive` does not read the ring: each event is
  forwarded to the driver as it is emitted and queued in the driver process, so a slow consumer
  cannot cause a drop there. That is what keeps the gate honest — a `seq` hole in drive output can
  only mean the _emitter_ lost an event (a worklet port overflow, a real bug), never that the CI box
  was busy. A gapless assertion that can fail under load is a flaky gate, and §5 says what happens
  to those.
- `probe()` returns the full state as JSON: decks, params, transport position, graph shape. Agents
  assert on `probe()` for state and on the event log for behaviour over time.
- **Reads may be continuous; they still go through the facade.** `probe()` and the store carry
  session state, the log carries discrete facts, and neither can carry a playhead at 60fps or a
  buffer's samples. That third channel is `peek()` (§4, M4), and it is a **read**: it never
  allocates, never writes, and hands out no `AudioContext`, no `AudioNode` and no `AudioBuffer`.
  A component that reads `ctx.currentTime` itself is the failure this bullet exists to name.

## 2. The hosts

One engine, three ways to run it — and critically, **no second DSP implementation**.

| Host         | Context               | Who drives it     | What it is for                                    |
| ------------ | --------------------- | ----------------- | ------------------------------------------------- |
| **live**     | `AudioContext`        | a person, the UI  | the app                                           |
| **headless** | `AudioContext`\*      | an agent, the CLI | real timing, real worklets, real event stream     |
| **offline**  | `OfflineAudioContext` | tests, export     | deterministic, faster-than-realtime, exact output |

\* in headless Chrome, launched with `--autoplay-policy=no-user-gesture-required` and a null audio
sink, so the clock runs without a device. Verified at M1 before anything was built on it.

**Determinism comes from `OfflineAudioContext`, not from Node.** Running the graph under a Node
implementation of Web Audio would be a different DSP implementation than the one we ship — a green
test there would prove nothing about Chrome, and we would be back to maintaining parity between two
engines. So the headless host is a real Chromium, and the deterministic host is an
`OfflineAudioContext` **inside** that same Chromium. Node runs only the pure `src/lib` tests, where
it is exactly right.

**Playwright** (Chromium driver) is the one dependency this bought, dev-only.

Deterministic is not the same as bit-identical forever. `OfflineAudioContext` is reproducible within
a Chromium build; resampling and denormal handling do drift across versions and platforms. So the
Playwright Chromium revision is **pinned** — an exact version in `package.json`, upgraded
deliberately, with any fingerprint churn read as the diff it is — and every fingerprint assertion
carries a stated tolerance (§3). Both hosts load the same **preview** build; see §3.

## 3. The agent feedback loop

`./scripts/drive` — boot a headless page, feed it commands, stream back events. The whole point is
that an agent's write-run-observe cycle is seconds and needs no human ears. Landed at M1
([0010](decisions/0010-the-harness-transport.md)), rendering added at M3
([0013](decisions/0013-fingerprints.md)).

```bash
./scripts/drive fixtures/deck-smoke.jsonl         # run a command script, stream JSONL events
./scripts/drive --repl                            # interactive: one command per line
./scripts/drive --render 4 --out /tmp/x.wav       # offline render + fingerprint to stdout
echo '{"t":"deck.play","deck":"a"}' | ./scripts/drive
```

A JSONL line is an envelope, and a bare command is one with no `at` — `{"t":"deck.play",…}` and
`{"at":2,"cmd":{"t":"deck.play",…}}` are both valid input, so hand-written repros stay one-liners.

What it prints is designed to be read by something without ears:

- **the event log**, JSONL, one line per event — the sequence _is_ the assertion surface.
- **a fingerprint** per render: duration, peak, RMS per 100 ms window, DC offset, click count
  (samples whose first difference exceeds a threshold), silence spans. A bad edit shows up as a
  click count of 3; a gain-staging regression shows up as an RMS row. Both are diffable text.
  Every field carries its tolerance with it, decided once here rather than per test: sample counts,
  click counts and silence spans compare **exactly**; peak, RMS and DC compare in dB **within
  epsilon**. Nothing compares floats for equality, and nothing hashes the samples — a hash tells you
  something changed and nothing about what, which is the opposite of the point.
- **`probe()` state** as JSON, on demand or after the last command.
- optionally a PNG waveform, for when an agent should actually look.

Supporting pieces:

- **Synthetic sources.** `{"t":"deck.load","source":{"gen":"sine","hz":440,"secs":4}}` — also
  `click-train` (the one that makes timing errors visible), `sweep`, `noise`, `silence`. Agents need
  no audio fixtures in the repo, and a click train through a loop point is a timing test you can
  read in the fingerprint.
- **Virtual time in offline.** Envelopes carry `at` in seconds on the render timeline, so a whole
  performance is one file rendered in a fraction of its duration.
- **The same log in the browser.** The `#/log` panel beside the `#/dev` gallery, and `window.mulch`
  exposing `send` / `probe` / `on`, so a human debugging and an agent debugging are looking at the
  same thing. The panel is behind `import.meta.env.DEV`. The `window.mulch` attach **cannot** be —
  drive loads the preview build, where compile-time DEV code is stripped, so a DEV-gated hook would
  be absent from the very build drive drives. It is a **runtime** gate instead: attached when DEV,
  or when the driver sets `__MULCH_DRIVE__` via `addInitScript` before the page loads. Nothing in
  production sets the flag, so the hook is **inert in production, not absent from the bundle** — the
  price of "one build under test", since a `--mode test` bundle would be a second build, the parity
  problem again.
- **One build under test.** The headless host loads the **preview** build, in CI and locally alike.
  Iterating against dev while the gate runs preview means the thing an agent verifies and the thing
  that merges are different builds — the parity problem §2 exists to avoid. `--dev` is available for
  when the difference is what you are debugging.
- **The loop stays seconds long.** The harness's value is measured in seconds per iteration, so
  `drive` reuses a running preview server or a cached build, with `--fresh` for when the build is
  what you distrust. The whole gate has a stated budget —
  [0012](decisions/0012-the-gate-stays-under-four-seconds.md) — because a slow loop is a loop agents
  learn to route around, the §5 gate failure one layer down.
- **`scripts/check` runs a `drive` step**, `./scripts/smoke`: the no-audio smoke (`param.set` in,
  `param.changed` out, gapless `seq`, a `probe()` assertion), the deck smoke, and the golden
  fingerprint. That is the end-to-end test the guide's §4.2 asks for.

## 4. Milestones

Each one ends with `./scripts/check` clean and, from M1 onward, a command script an agent can run.

The ordering pulled the harness **transport** ahead of audio on purpose: the spine was drivable the
day it existed, so from the first deck onward everything is built _under_ the harness, never
retrofitted into it. Only fingerprints waited for sound. There is no longer any moment where a
change to the instrument cannot be exercised by a command file and observed as events.

### Shipped

- **M0 — the spine, no audio yet.** `src/app`: command union and envelope, injected clock, event
  bus with ring buffer + `seq`, `probe()`, the facade; the session store in `src/state`. All pure
  TypeScript on the injected clock, so it tests in plain Vitest under Node.
  [0009](decisions/0009-the-app-tier.md)
- **M1 — the harness transport.** The headless-clock spike first, then pinned Playwright,
  `./scripts/drive`, the runtime-gated `window.mulch` attach, the `#/log` panel, and the `drive`
  step in `scripts/check`. [0010](decisions/0010-the-harness-transport.md)
- **M2 — sound.** `audio/context.ts` (limiter + soft clip from day one), `audio/params.ts`,
  `audio/chain.ts` serving live and offline alike, `audio/deck.ts` with a schedule-ahead transport,
  synthetic sources, worklet loading settled in one helper, and `deck.started` / `deck.looped` /
  `xrun`. Two decks exist in the store from here, rendered by one component.
  [0011](decisions/0011-sound.md)
- **M3 — fingerprints close the loop.** `--render` through `OfflineAudioContext`, the fingerprint
  format with the §3 tolerances, the PNG, and the golden fingerprint in `scripts/check`.
  [0013](decisions/0013-fingerprints.md)

### M4 — the UI as a subscriber

Half of this arrived early, with the deck M2 needed something to drive: `src/ui/Deck.tsx` already
sends `deck.load`, `deck.play`, `deck.stop`, `deck.loop` and `param.set` and nothing else; its
knobs are already bound to the registry by `param` id alone; it already subscribes through
`useSyncExternalStore` over the read-only `SessionReader`. What is left is the part that needs
something the facade cannot yet say.

**The read channel comes first, and it is the whole milestone.** A waveform needs the loaded
buffer's samples — not JSON, so it cannot ride in `probe()`. A playhead and a meter need values
that change every frame — not discrete, so they cannot ride on the log, and putting them in the
store would rerender React sixty times a second for values React should never see. Both would be
trivially satisfied by handing `ui` the `AudioBuffer` and letting it read `ctx.currentTime`, and
that is precisely the failure §5's first bullet names. So:

- **`peek()` on the facade** — the per-frame read: playhead position and meter level per deck, from
  the values the transport already holds. It never allocates, never writes, and returns numbers
  only. With no engine attached — the pure Vitest host — it reads empty, the same way `probe()`
  reads a silent session.
- **Peaks are computed once per load, not per frame,** and reach `ui` through the facade as plain
  arrays. `src/lib/peaks.ts` already exists and already serves the offline PNG; the waveform is its
  second consumer, not a second implementation.
- **One RAF loop in `src/ui`**, writing into refs. Playhead and meters are drawn from those refs;
  no per-frame value is React state, and no component starts a loop of its own.
- Record it as `docs/decisions/0014-the-read-channel.md` — the third channel is as much a seam
  decision as commands and events were, and §5 gains a bullet for it.

Then the drawing, which is ordinary work once the channel exists: **`Waveform`** — canvas, peaks,
playhead, and loop markers you can drag. The constraint that keeps it honest is that a drag ends in
the same `deck.loop` command the loop button already sends, so `./scripts/drive` can reach every
gesture the mouse can. **If a control needs a path the CLI cannot reach, the seam is wrong.**

Verified the way everything since M1 has been: a `deck.loop` from a JSONL file and a click train
through the dragged loop point is already a fingerprint assertion, so the new surface is checked by
the gate that exists rather than a new one.

This lands before M5 because the per-frame seam only gets harder to add once there are effects and
more decks writing across it, and because a deck you cannot see is a deck whose timing bugs only an
agent ever notices.

### M5 — effects as plugins

`audio/effects/`, one file per effect. Build **one** end-to-end, then a second; if the second
touches anything but its own file and the registry, stop and fix the seam (guide §7). Filter and
delay are the pair to prove it.

**Where an effect's params are defined.** An effect file declares its own params, and `params.ts`
composes them into the one registry:

```ts
// audio/effects/filter.ts — the whole effect, params included
export const filter = {
  id: "filter",
  params: [
    { id: "filter.cutoff", label: "Cutoff", min: 20, max: 20_000, default: 1_000, curve: "log" },
  ],
  build: (ctx: BaseAudioContext) => /* … */,
} satisfies Effect;

// audio/params.ts — still the one place anything asks about a param
export const PARAMS = index([...DECK_PARAMS, ...EFFECTS.flatMap((e) => e.params)]);
```

Not the alternative — every effect's params written literally into `params.ts` — because that makes
adding an effect a two-file diff with a cross-file invariant an agent has to remember, which is the
kind of thing that drifts. This way `PARAMS` remains the single lookup surface (`ParamId` is still
derived from it, one place still feeds defaults, UI, automation and serialisation), and adding an
effect stays one new file plus one line in the registry. Effects declare downward into `params.ts`;
nothing imports back up, so there is no cycle.

This makes AGENTS.md's "defined only in `src/audio/params.ts`" too literal — amend that boundary in
the same commit to say every parameter is **registered in** `params.ts`, deck params declared there
and effect params contributed by the effect file. Record it as a decision.

### M6 — session v1

Versioned format, a no-op migration present at birth, IndexedDB, blobs stored separately from JSON
and GC'd on save, transient updates explicitly excluded from autosave. Tests: save → load →
deep-equal, plus each migration. `ingest()` (§1) lands here, with real audio: the blob store is what
it writes, and `deck.load` carrying a `blobId` is still the only mutation.

### M7 — offline export through the same chain

And the parity test the moment it exists: the live graph rendered in an `OfflineAudioContext` vs.
the export renderer, sample-equal within epsilon. `src/app/render.ts` is already that renderer for
fingerprints, so this is the same path growing a `.wav` out — not a second one.

### M8 — N decks

The store already holds two, and `App.tsx` already renders them from one component, so what is left
is the concept the deck count implies: an active deck, and keyboard shortcuts — each one a command,
which is what makes them free to test.

### Deferred

Unchanged from the guide, until the core is boring: automation lanes, MIDI, vocoder, rearranger,
paulstretch, parametric EQ, clip rack, undo/redo, WASM. Commands being data makes undo/redo
_cheaper_, not free — replay-from-snapshot falls out of the log, inverse commands do not. Whoever
picks it up should expect to choose between them, not to find it already done.

**Live recording is out of scope** — not deferred, not planned. `MediaRecorder` → IndexedDB chunks
is expensive, orthogonal to the instrument, and nothing in M0–M8 depends on it. Offline export (M7)
is how audio leaves the app.

## 5. What would tell us this is going wrong

Cheaper to notice than to unwind:

- A component holding audio state, calling into the graph without a command, or **writing to the
  store** — `ui` reads `state`, `app` writes it, and `scripts/arch` cannot see the difference.
- A component reaching an `AudioContext`, `AudioNode` or `AudioBuffer` — including reading
  `ctx.currentTime` for a playhead. Continuous reads go through `peek()` (§1, §4); a second read
  path is the same failure as a second write path, one direction over.
- A per-frame value in React state, or a second RAF loop. There is one loop and it writes refs.
- A `peek()` that allocates, peaks computed anywhere but once per load, or a loop marker drawn
  from `peek()` instead of the store ([0014](decisions/0014-the-read-channel.md)).
- A second way to do something the CLI already does — a debug button with its own code path.
- An event emitted from two places, or a fact the log cannot answer that `console.log` can.
- A parameter that costs more than one line in `params.ts`, or an effect that costs more than one
  file plus a registry entry.
- `./scripts/drive` growing knowledge of decks or effects. It is a transport; the app tier is the
  API.
- A fingerprint assertion written as exact float equality, or a `.skip` on the golden test. A gate
  that flakes is a gate people learn to rerun, and then to ignore. Likewise a gate that outgrows
  its budget ([0012](decisions/0012-the-gate-stays-under-four-seconds.md)).
- A `when`, `delay` or `time` field appearing inside a command. Scheduling belongs to the envelope.
- `ingest()` writing anything but the blob store, or a second non-command path growing beside it.
  Ingest is the one out-of-band step (§1) precisely so nothing else has to be.

## Decided

Was open, now settled — kept here because the reasons outlive the questions:

- **Playwright** (dev-only, pinned Chromium revision) is the one new dependency.
- **Live recording is out of scope permanently** — see the deferred list in §4.
- **The headless host loads the preview build**, in CI and locally, with `--dev` as an opt-in
  escape hatch (§3).
- **`window.mulch` is runtime-gated, not compile-time-gated** — inert in production rather than
  absent from the bundle, because "one build under test" wins over "no dormant code" (§3).
- **All param values are numbers.** Discrete params are stepped integers in the registry;
  `param.set` never grows a union type (§1).
- **Real audio enters via `ingest(file) → blobId`**, the one non-command step; the session
  mutation is still a `deck.load` command carrying the id (§1).
- **Per-frame reads are a third channel on the facade**, not a widening of `probe()` and not a
  direct reach into `audio`. Session state is JSON on the store, behaviour is the event log,
  continuous values are `peek()` (§1, §4).
