# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device. A performance stays editable, portable, reproducible through commands,
and identical through the live and offline signal paths.

---

## 1. Ordered next work

Finish one step, including its full gate, before starting the next. A step delivers a usable
vertical slice, not infrastructure for a feature nobody has asked for.

An entry says what durable shape it moves before the step is started. That is what makes a step
expensive, so it is the first thing to state. A step is written against §2, §3, and the standing
clauses in [subagent-prompt.md](subagent-prompt.md).

A block that adds N of one thing — a look per effect, a sketch per question, a worklet per entry —
names the file layout before its first step: one file per thing from the first, with its `@role`
line and its map.md row, rather than one file that hits the 800-line cap and pays a split on four
consecutive steps.

---

## 2. Rules for every feature

The invariants in [boundaries.md](boundaries.md) hold for every step. These are the rules about the
shape of a _change_ rather than the shape of the code.

- `src/app` remains the only writer of session state. UI, workers, keyboard, and agent JSONL call
  `send()` with serialisable commands.
- Scheduling stays on `Envelope.at`. Command shapes do not grow independent time fields.
- Raw files, audio nodes, functions, and browser permission objects never enter commands or the
  durable session.
- Durable edits participate in bounded history, persistence, portable archives, and graph restore
  unless a decision proves why they do not.
- Async work carries source or operation identity, so a stale completion cannot overwrite newer
  state.
- Analysis is not a pure function of stored bytes: `decodeAudioData` may resample to the device's
  rate, so onsets differ across machines. Nothing durable may rest on derived analysis.
- A view preference, such as snap, theme, or whether the debug console is open, is not session
  state: no command, nothing durable, no history entry.

## 3. Proof and delivery

`./scripts/check` is the full gate. It may get slower as the instrument gets bigger, but no single
feature may move its mean by more than 250ms without asking the human first
([0012](decisions/0012-no-one-feature-jumps-the-gate.md)). Each feature adds the cheapest proof at
the layer that owns the behavior:

- pure normalization, analysis, and DSP assertions in colocated Vitest tests;
- command, event, history, and failure atomicity through `createInstrument` and its manual clock;
- graph scheduling and sound through the existing live and offline browser run;
- UI focus, pointer, and file handling in the existing preview smoke;
- export parity by comparing every encoded sample with the shared graph buffer.

One fact has one emitter. `probe()` reports durable and session state, the event log reports
discrete behavior, and `peek()` and `peaks()` stay allocation-free continuous and sample-derived
reads. A UI ring drop is loud. A sequence gap in `./scripts/drive` is always a bug.

**0012's line is a rule about browser work.** `./scripts/check` runs its steps concurrently and
`drive` is nearly the whole wall clock, with the second-slowest step finishing seconds early: a
feature may add two seconds of Vitest and cost the gate nothing, while a browser scenario's cost
lands on the mean one for one. Offline `render()` calls are the cheap place to prove sound — they
join underneath the deck fixture's real-time waits and cost close to nothing. New browser work that
cannot be a render picks one of the browser half's three lanes and states what that lane's page must
already hold in its prelude, rather than reading what a neighbouring scenario happened to leave
([0238](decisions/0238-the-browser-smoke-runs-in-lanes.md)). Two traps are measured: a popup whose
entries `./scripts/drive` presses opens instantly, because Playwright waits out enter and exit
animations before it may click, which has cost one scenario up to 1.68s
([0056](decisions/0056-an-effect-carries-its-own-icon.md)); and browser work added _before_ the
chain lane's `page.reload()` — the only reload in the smoke — is kept after it instead, for a
reloaded-audio-clock stall that has not reproduced since `88173b2` and was never explained.

Measure a change by stashing it and comparing means across several runs, **interleaved**. A single
run's spread is wider than most features cost: the same unchanged commit read 414ms apart across two
windows fifteen minutes apart, 1.7 times 0012's own step size. Never quote a mean measured in a
different window from the one it is compared against.

When a feature changes a data boundary, graph lifecycle, or ownership rule, write the decision and a
failing seam-level test before broad UI work. Do not turn the driver into a second application by
teaching it feature semantics.
