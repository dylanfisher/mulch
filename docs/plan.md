# Build plan

What to build, in what order, and which seams have to be right before the first feature lands.
Derived from [NEW_APP_GUIDE.md](../NEW_APP_GUIDE.md) — that file says what went wrong last time and
is not repeated here. This one says what we do about it.

The scaffold ([0001](decisions/0001-stack-and-tiers.md)) already bought the tiers, the gate, the
token layer and the control gallery. What is missing is everything that makes noise, and — the
thing this plan is really about — a way for an agent to drive the instrument and hear the result.

## The claim this plan is organised around

> **Anything the UI can do, it does by sending a command. So anything a person can do, an agent can
> do — headlessly, against a real Web Audio graph, and observe what happened.**

That is one architectural constraint, not a testing afterthought, and it has to be true before the
first deck exists. If it is added later it will be a second implementation of the app, which is
exactly the failure the post-mortem describes (§2.2, four parallel render paths).

Three consequences, all load-bearing:

1. **The engine is headless by construction.** React subscribes to it. It never owns it.
2. **Every mutation is a serialisable command.** A click, a keystroke, a MIDI note and an agent's
   JSON line all arrive at the same entry point.
3. **Every state change and audio milestone is an event** carrying an audio-clock timestamp. The
   log is the ground truth about what the instrument did — for the UI, for tests, and for agents.

---

## 1. The seam: commands in, events out

A new tier, `src/app` — the headless instrument. It may import `lib`, `audio`, `workers` and
`state`; `src/ui` may import it, and nothing may import `ui`.

`src/ui` keeps its direct import of `state`, for reads only: per-frame subscription has to reach the
store without a round trip through `probe()`. **`src/app` is the only writer.** `scripts/arch` can
enforce the import edge but not the direction of the write, so that half is a review rule — see §5.

Adding the tier is one commit that touches all five places the tier table lives:

- the Tiers table in [docs/map.md](map.md), plus the **state** row, which today claims undo/redo —
  that claim comes out. The command log lives in `app`; undo/redo itself stays deferred (§4), and
  the row should not say otherwise;
- the "Dependency direction is one-way" sentence under it, now `ui → app → state → audio → lib`;
- the `MAY_IMPORT` map in [`scripts/arch`](../scripts/arch);
- the `<!-- paths -->` line;
- `docs/decisions/0009-the-app-tier.md`.

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
  return `ctx.currentTime`, the test one is a number you set. The bus takes it as a constructor
  argument from M0, before any `AudioContext` exists, so nothing has to be unpicked at M2.
- Events are emitted from **one** place per fact. A worklet posting `deck.looped` over its port and
  the main thread also inferring it from a timer is two sources of one truth; pick the worklet.
- **Events flow up against the import direction, and that is fine — by inversion, not by import.**
  `deck.looped` originates in a worklet, but the bus lives in `app`, and `audio` may not import
  `app`. `audio` exposes ports and callbacks; `app` subscribes and stamps `seq`. The first time
  someone is tempted to import the bus downward into `audio`, this bullet is the answer.
- **Slow consumers and lossy emitters fail differently.** The fixed-size ring buffer (say 4096) is
  the _UI's_ view of the stream and **drops loudly** — the `#/log` panel renders a `seq` gap as a
  break in the list, never silently (principle 5). `./scripts/drive` does not read the ring: each
  event is forwarded to the driver as it is emitted and queued in the driver process, so a slow
  consumer cannot cause a drop there. That is what keeps the gate honest — a `seq` hole in drive
  output can only mean the _emitter_ lost an event (a worklet port overflow, a real bug), never
  that the CI box was busy. A gapless assertion that can fail under load is a flaky gate, and §5
  says what happens to those.
- `probe()` returns the full state as JSON: decks, params, transport position, graph shape. Agents
  assert on `probe()` for state and on the event log for behaviour over time.

## 2. The hosts

One engine, three ways to run it — and critically, **no second DSP implementation**.

| Host         | Context               | Who drives it     | What it is for                                    |
| ------------ | --------------------- | ----------------- | ------------------------------------------------- |
| **live**     | `AudioContext`        | a person, the UI  | the app                                           |
| **headless** | `AudioContext`\*      | an agent, the CLI | real timing, real worklets, real event stream     |
| **offline**  | `OfflineAudioContext` | tests, export     | deterministic, faster-than-realtime, exact output |

\* in headless Chrome, launched with `--autoplay-policy=no-user-gesture-required` and a null audio
sink, so the clock runs without a device.

**Determinism comes from `OfflineAudioContext`, not from Node.** Running the graph under a Node
implementation of Web Audio would be a different DSP implementation than the one we ship — a green
test there would prove nothing about Chrome, and we would be back to maintaining parity between two
engines. So the headless host is a real Chromium, and the deterministic host is an
`OfflineAudioContext` **inside** that same Chromium. Node runs only the pure `src/lib` tests, where
it is exactly right.

This needs one dependency: **Playwright** (Chromium driver), dev-only — **approved**. It is also what
Vitest browser mode would require, so it is one dep for both.

Deterministic is not the same as bit-identical forever. `OfflineAudioContext` is reproducible within
a Chromium build; resampling and denormal handling do drift across versions and platforms. So the
Playwright Chromium revision is **pinned** — an exact version in `package.json`, upgraded
deliberately, with any fingerprint churn read as the diff it is — and every fingerprint assertion
carries a stated tolerance (§3). Both hosts load the same **preview** build; see §3.

## 3. The agent feedback loop

`./scripts/drive` — boot a headless page, feed it commands, stream back events. The whole point is
that an agent's write-run-observe cycle is seconds and needs no human ears.

```bash
./scripts/drive fixtures/loop-smoke.jsonl        # run a command script, stream JSONL events
./scripts/drive --repl                           # interactive: one command per line
./scripts/drive --render 4s --out /tmp/x.wav     # offline render + fingerprint to stdout
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
- optionally a PNG waveform/spectrogram, for when an agent should actually look.

Supporting pieces:

- **Synthetic sources.** `{"t":"deck.load","source":{"gen":"sine","hz":440,"secs":4}}` — also
  `click-train` (the one that makes timing errors visible), `sweep`, `noise`, `silence`. Agents need
  no audio fixtures in the repo, and a click train through a loop point is a timing test you can
  read in the fingerprint.
- **Virtual time in offline.** Envelopes carry `at` in seconds on the render timeline, so a whole
  performance is one file rendered in a fraction of its duration.
- **The same log in the browser.** A `#/log` panel beside the existing `#/dev` gallery, and
  `window.mulch` exposing `send` / `probe` / `on`, so a human debugging and an agent debugging are
  looking at the same thing. The panel is behind `import.meta.env.DEV`. The `window.mulch` attach
  **cannot** be — drive loads the preview build (below), where compile-time DEV code is stripped,
  so a DEV-gated hook would be absent from the very build drive drives. It is a **runtime** gate
  instead: attached when DEV, or when the driver sets `__MULCH_DRIVE__` via `addInitScript`
  before the page loads. Nothing in production sets the flag, so the hook is **inert in
  production, not absent from the bundle** — the price of "one build under test", since a
  `--mode test` bundle would be a second build, the parity problem again. The attach is a few
  lines around the facade the bundle already contains; a test asserts a flag-less page has no
  `window.mulch`.
- **One build under test.** The headless host loads the **preview** build, in CI and locally alike.
  Iterating against dev while the gate runs preview means the thing an agent verifies and the thing
  that merges are different builds — the parity problem §2 exists to avoid. `--dev` is available for
  when the difference is what you are debugging.
- **The loop stays seconds long.** The harness's value is measured in seconds per iteration, and
  `vite build` on every invocation would dominate them. `drive` reuses a running preview server or
  a cached build, with `--fresh` for when the build is what you distrust. A slow loop is a loop
  agents learn to route around — the §5 gate failure, one layer down.
- **`scripts/check` gains a `drive` step** the moment the CLI exists (M1) — a smoke script needing
  no audio: `param.set` in, `param.changed` out, gapless `seq`, a `probe()` assertion. At M3 the
  golden fingerprint joins it. That is the end-to-end test the guide's §4.2 asks for.

## 4. Milestones

Each one ends with `./scripts/check` clean and, from M1 onward, a command script an agent can run.

The ordering pulls the harness **transport** ahead of audio on purpose: the spine is drivable the
day it exists, so from the first deck onward everything is built _under_ the harness, never
retrofitted into it. Only fingerprints wait for sound. After M1 there is no moment where a change
to the instrument cannot be exercised by a command file and observed as events.

**M0 — the spine, no audio yet.** `src/app`: command union and envelope, the injected clock, event
bus with ring buffer + `seq`, `probe()`, the facade. Tier added to map.md and `scripts/arch` (its
own commit — the five places in §1). Store in `src/state` holding session state, subscribed by
nothing yet. Tests: envelopes round-trip through the bus, a stamped envelope fires at its `at`
against a test clock, dropped events leave a visible gap. All of it is pure TypeScript on the
injected clock, so these tests run in plain Vitest under Node — the first feedback loop,
milliseconds long, before any browser exists. This is also the cheapest moment to hold the §1
honesty rules; the files are fifty lines long.

**M1 — the harness transport, still no audio.** **The milestone that pays for the rest**, and it
needs no sound to exist; it comes before the UI and before the first deck on purpose, because every
later milestone is cheaper to build and verify once it is watching. In order:

- **Prove the clock before betting on it.** The §2 footnote — audio time advancing in headless
  Chrome with no output device — is plausible and version-dependent, and this whole milestone
  rests on it. Hour one is a spike: boot the headless host, start a context, assert `currentTime`
  advances and an `OfflineAudioContext` renders. If it does not hold, the flags change, not the
  architecture.
- **Playwright lands pinned**, `./scripts/setup` installs the browser, CI caches it. Otherwise the
  `drive` step turns `scripts/check` into a slow, network-dependent gate on first run — the
  opposite of what the gate is for.
- **`./scripts/drive` v1**: preview build, `__MULCH_DRIVE__` set via `addInitScript`, the
  runtime-gated `window.mulch` attach, events forwarded over an exposed binding, JSONL in and out,
  `probe()` on demand. The `#/log` panel beside `#/dev` — the same stream, three consumers, built
  together.
- **`scripts/check` gains the `drive` step now**, with the no-audio smoke from §3: `param.set` in,
  `param.changed` out, gapless `seq`, a `probe()` assertion.

From this commit on, every change is verified through the same pipe an agent uses.

**M2 — sound.** `audio/context.ts` (lifecycle, unlock gate, master bus, **limiter + soft clip from
day one**), `audio/params.ts` registry, `audio/chain.ts` — `buildDeckChain(ctx: BaseAudioContext)`.
One deck: load, decode, play, stop, gain. Transport is schedule-ahead (`source.start(when)`), never
react-on-time. First events: `deck.started`, `deck.looped`, `xrun`. **Synthetic sources land here,
not later** — `deck.load` with a generated sine is how `drive`, already running, verifies this
milestone with no fixtures and no ears: `deck.play` in a JSONL file, `deck.started` in the stream.

Settle **how a worklet module is loaded** here, in one helper, before there are two of them.
`deck.looped` comes from the worklet, so this is on the critical path, and Vite's dev and build
paths differ (the processor is a separate module graph with no bundler preamble — `?url` plus
`audioWorklet.addModule`, and it has to resolve identically under preview and under the headless
host — which is exactly the claim `drive` can now check). It is a day's friction that gets paid
once or three times.

**M3 — fingerprints close the loop.** `--render` through `OfflineAudioContext`, the fingerprint
format with the §3 tolerances, the optional PNG, and the golden fingerprint test joining the smoke
script in `scripts/check` — the pinned Chromium earning its pin. A click-train through a loop point
is the first real timing assertion.

**M4 — the UI as a subscriber.** `Deck`, `Waveform` (canvas: draw, playhead, drag loop markers),
`Knob` bound to the registry by `param` id alone. Per-frame values — playhead, meters — live in refs
read by one RAF loop, never React state. Constraint to hold: every interaction dispatches a command
that `./scripts/drive` can also send. If a control needs a path the CLI cannot reach, the seam is
wrong.

**M5 — effects as plugins.** `audio/effects/`, one file per effect. Build **one** end-to-end, then a
second; if the second touches anything but its own file and the registry, stop and fix the seam
(guide §7). Filter and delay are the pair to prove it.

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

**M6 — session v1.** Versioned format, a no-op migration present at birth, IndexedDB, blobs stored
separately from JSON and GC'd on save, transient updates explicitly excluded from autosave. Tests:
save → load → deep-equal, plus each migration.

**M7 — offline export through the same chain,** and the parity test the moment it exists: the live
graph rendered in an `OfflineAudioContext` vs. the export renderer, sample-equal within epsilon.

**M8 — N decks** from one component, active-deck concept, keyboard shortcuts (each one a command).

Deferred until the core is boring, unchanged from the guide: automation lanes, MIDI, vocoder,
rearranger, paulstretch, parametric EQ, clip rack, undo/redo, WASM. Commands being data makes
undo/redo _cheaper_, not free — replay-from-snapshot falls out of the log, inverse commands do not.
Whoever picks it up should expect to choose between them, not to find it already done.

**Live recording is out of scope** — not deferred, not planned. `MediaRecorder` → IndexedDB chunks
is expensive, orthogonal to the instrument, and nothing in M0–M8 depends on it. Offline export (M7)
is how audio leaves the app.

## 5. What would tell us this is going wrong

Cheaper to notice than to unwind:

- A component holding audio state, calling into the graph without a command, or **writing to the
  store** — `ui` reads `state`, `app` writes it, and `scripts/arch` cannot see the difference.
- A second way to do something the CLI already does — a debug button with its own code path.
- An event emitted from two places, or a fact the log cannot answer that `console.log` can.
- A parameter that costs more than one line in `params.ts`, or an effect that costs more than one
  file plus a registry entry.
- `./scripts/drive` growing knowledge of decks or effects. It is a transport; the app tier is the
  API.
- A fingerprint assertion written as exact float equality, or a `.skip` on the golden test. A gate
  that flakes is a gate people learn to rerun, and then to ignore.
- A `when`, `delay` or `time` field appearing inside a command. Scheduling belongs to the envelope.
- `ingest()` writing anything but the blob store, or a second non-command path growing beside it.
  Ingest is the one out-of-band step (§1) precisely so nothing else has to be.

## Decided

Was open, now settled — kept here because the reasons outlive the questions:

- **Playwright** (dev-only, pinned Chromium revision) is approved as the one new dependency.
- **Live recording is out of scope permanently** — see the deferred list in §4.
- **The headless host loads the preview build**, in CI and locally, with `--dev` as an opt-in
  escape hatch (§3).
- **`window.mulch` is runtime-gated, not compile-time-gated** — inert in production rather than
  absent from the bundle, because "one build under test" wins over "no dormant code" (§3).
- **All param values are numbers.** Discrete params are stepped integers in the registry;
  `param.set` never grows a union type (§1).
- **Real audio enters via `ingest(file) → blobId`**, the one non-command step; the session
  mutation is still a `deck.load` command carrying the id (§1).
