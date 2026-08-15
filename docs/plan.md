# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device; a performance remains editable, portable, reproducible through
commands, and identical through the live and offline signal paths.

The current baseline is a two-deck instrument with a durable session, portable archives,
bounded undo/redo, performable registry-driven effect racks, a registry-driven automation
workspace, a parametric EQ, beat-aware loop snapping, a reusable clip rack, offline WAV export,
and a fast browser gate. Implementation history belongs in [`docs/decisions`](decisions/); this
document contains only the path forward.

The product outcome guiding the next sequence is:

> A person can shape local samples into a beat-aware performance, recall its sounds and gestures
> exactly, and control it from either the screen or hardware without changing the instrument's
> underlying command model.

---

## 1. Ordered next work

Complete one step, including its full gate, before starting the next. Each step should deliver a
usable vertical slice rather than infrastructure for an unspecified future feature.

P4 through P8 are delivered; each one's reasoning is its decision record, not this file. P9
through P15 are scheduled below, in the order they are to be built.

| Step | Delivered                                                                                       | Record                                                         |
| ---- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| P4   | bypass, remove and reorder as generic commands; the graph rewired before durable state          | [0023](decisions/0023-performable-effect-racks.md)             |
| P5   | registry-derived automation targets, point editing, Option-held gesture recording               | [0024](decisions/0024-automation-workspace.md)                 |
| P6   | a single-band parametric EQ — one plugin file plus one registry entry, no other production line | —                                                              |
| P7   | worker beat analysis and loop snapping, with the loop as the only durable fact                  | [0025](decisions/0025-beat-analysis-is-derived-not-durable.md) |
| P8   | clips as borrowed deck presets: capture, rename, delete, and one grouped atomic apply           | [0027](decisions/0027-clips-are-borrowed-deck-presets.md)      |

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

Three facts P8 settled, since they constrain anything built on clips:

- Applying a clip decodes the clip's source twice — the pre-flight and the `deck.load` — and the
  group's rollback preparation decodes the whole prior session besides, which every grouped edit
  has always done. Fine for a deliberate gesture, wrong for anything fired per bar; the fix would
  be a decode cache keyed by blob id, never a second engine
  ([0027](decisions/0027-clips-are-borrowed-deck-presets.md)).
- Undo of an application is proved at the seam rather than in the browser. Each press rebuilds
  the whole session graph, which cost the gate more than a browser click added to a claim the
  seam already owns.
- Real GC of a clip-only blob has no browser proof, because history's own reachability keeps any
  blob a checkpoint still names, and every route to orphaning one leaves a checkpoint behind. The
  claim rests on `sessionBlobIds` — one projection, shared by persistence, history and archives.

### Scheduled

The order is not the order these were asked for. It is: the diagnostic that makes the rest
cheaper to build, then the two gestures that already exist and are wrong, then the two identity
changes that touch every tier, then the DSP, then the thing that depends on a cache the identity
work wants anyway. Each entry says what durable shape moves, because that is what makes a step
expensive; none of them get a migration ([0026](decisions/0026-pre-release-has-no-migrations.md)).

**P9 — A debug console you can toggle.** A person playing can open an overlay showing the live
event feed and the counters that say whether the instrument is keeping up: frame cost, ring
drops, queue depth, decodes and analyses in flight, context state and clock.

- It is a view of what already exists. `ring()` is a fixed 4096-slot array
  (`src/app/bus.ts`) and `#/log` already renders it coalesced to one read per frame. The console
  reuses that reader and that gap detection, or it replaces `LogPage` — two renderings of one
  ring is the duplication §3 forbids.
- Performance is the requirement, not a hope. Nothing accumulates: no growing buffer, no
  per-event React state, no per-event string building for rows that are off screen. The console
  renders a fixed-height window of the ring and formats detail lazily; the counters are written
  to refs by the existing frame loop (`src/ui/frame.ts`) — §2's per-frame rule with no exception,
  and no second RAF loop or second subscription. Closed it costs one boolean. If the measured
  frame cost cannot be held, the live feed is what goes, not the frame budget. If the debug console
  is inactive, it should have zero performance impact.
- Open/closed is a view preference like snapping and theme: no command, nothing durable, no
  history entry. Entry through `src/ui/shortcuts.ts` like every other key.
- Proof: unit tests for the window selection beside `withGaps`; the preview smoke opens it, sends
  a command and asserts a row — placed after `persistenceSmoke`'s reload, per §3's cliff.
- A counter with no existing emitter needs one owner before it is displayed; if that is a new
  emitter, it is a decision.

**P10 — Automation that plays back, and gets out of the way.** Hold Option, ride a knob, release,
and the knob replays that movement while the loop is playing. The automation timing is not tied
to when it was recorded on that loop. The lane preview, its drag-to-add and its drag-to-move are removed.

- The bug is timing, not storage. `automation.set` schedules once through `setAutomation`
  (`src/audio/deck.ts` → `src/audio/ramp.ts`) at the `ctx.currentTime` of the instant the command
  landed, and never re-arms. A lane recorded stopped is scheduled into the past; a lane recorded
  playing is heard at most once. The fix is the shape this step owes a record: a point's `at` is
  time from the start of its own gesture, not a position on the loop, and the transport schedules
  the deck's live lanes with each pass it schedules ahead (`src/audio/transport.ts`). Stopping
  cancels scheduled values back to the parameter's manual value.
- A lane's phase is deliberately not where it was recorded. Whether the gesture happened 1.2 s
  into the pass, while the deck was stopped, or across a loop boundary, the lane replays from
  its own zero at the start of each pass (from play, when there is no loop). That makes a
  recording repeatable — the same lane sounds the same however it was captured — and it is the
  one thing a reader will otherwise assume works the other way, since the recorder does know the
  playhead. It discards that offset on purpose.
- `src/ui/AutomationLane.tsx` is deleted. `AutomationWorkspace.tsx` shrinks to whatever survives
  (the target list and the clear command) or goes with it if the knob's own affordance carries
  everything. `ParameterKnob.tsx` grows a small indicator at its top right on a knob that owns a
  lane, shown while Option is held; hovering the indicator opens a read-only popover previewing
  the points. Delete, don't comment out — 0024's editing half is superseded, not deprecated.
- Durability and history do not move: one `automation.set` per gesture, as today.
- Proof: a seam test that a lane recorded while stopped is scheduled on the next play; a test
  that the same gesture captured at two different playhead positions produces the same lane and
  the same schedule; an offline `render()` fingerprint of a filter lane across two loop passes
  differing from the same session with the lane cleared — the cheap place to prove sound (§3).
- Record: supersedes 0024 in part. Write it.

**P11 — Loops you can move after you have made one.** With a loop set, dragging inside it slides
the whole segment at its current length, either marker still drags that edge, and shift-dragging
anywhere — including across an existing loop — sweeps a new one.

- Today `Waveform.tsx`'s `onPointerDown` returns on a press inside a loop away from both markers,
  and shift only bypasses snapping. Shift keeps that meaning on an edge drag and gains the
  sweep; the discrimination lives with the existing `hitTest`, not in a second gesture machine.
- Still one command on release, still overlay-in-refs during the drag (`applyOverlay`), never
  React state. A slid segment snaps its in edge and preserves its length — snapping both edges
  independently would change the length as it moves.
- Proof: the clamped translate is pure maths in `src/lib/timeline.ts` with tests; the preview
  smoke slides a loop and asserts the resulting `deck.loop`.

**P12 — Any number of decks.** Decks are added and removed while the instrument is playing. A
fresh session boots with deck A alone; B is no longer a fixture, it is the second deck a person
adds when they want one.

- Shape: `DECK_IDS` stops being a `const` tuple (`src/state/store.ts`). `DeckId` becomes a plain
  string id, `Record<DeckId, DeckState>` a keyed map validated as one, and `fromDecks` takes the
  session's own list. Two durable, undoable commands — `deck.add`, `deck.remove` — join the
  union, and every `for (const deck of DECK_IDS)` in `src/app/engine.ts` and `src/app/restore.ts`
  iterates the session instead. Removal disposes the voice, drops any in-flight analysis by its
  identity, and releases blobs through `sessionBlobIds` — the one projection P8's GC claim rests
  on, which must learn the deck list rather than gain a sibling.
- Boot is one deck. `INITIAL_DECK_ID` survives as the id of the deck a fresh session starts with;
  what goes is the assumption that a second one exists. Removing the last deck is allowed — a
  session may hold none, and the screen shows the same affordance that adds the first one — because
  a floor of one is a special case every writer would then have to know about.
- The reach of that is wider than the store: every fixture, test, `./scripts/drive` JSONL and smoke
  step that names deck `b` without creating it becomes wrong, and should fail loudly rather than
  quietly address a deck that is not there. Sending any command for an unknown deck throws, as it
  does for an unknown effect.
- `deck.activate` and the shortcut registry stop naming a fixed pair: next/previous deck, plus
  activate-by-index for as many as the keyboard can address. The instrument's two-column layout
  becomes a list that starts one deck long.
- Non-goal, stated so it is not smuggled in: per-deck routing, sends and a mixer. Every deck
  still lands in the one master bus.
- Cost to watch: restore prepares every deck's buffer, so a checkpoint rebuild grows with the
  deck count. The fix, if it bites, is P8's decode cache keyed by blob id — never a second engine.
- Proof: seam tests that a fresh session holds exactly one deck, that a command for a deck that
  does not exist throws, and for add, remove, undo of each and a removed deck's blob becoming
  collectable; a render fingerprint of two added decks sounding together; the smoke adds a second
  deck and plays it.
- Record: deck identity is durable shape and a boundary. Write it.

**P13 — Effects as instances, not as a set.** A rack holds any number of the same effect — two
delays, three filters — each with its own values, bypass, position and automation.

- Shape, and this is the largest change scheduled here: a rack entry becomes
  `{ id: EffectInstanceId, effect: EffectId }` in signal order, and `bypassed` becomes a flag on
  the instance rather than a parallel list of effect ids. Parameter and automation keys become
  instance-scoped — `params: Record<ParamId, number>` and automation keyed by `ParamId` cannot
  hold two delays. Deck parameters stay as they are; effect parameter values move onto the
  instance. Everything that reads those keys moves with them: `src/audio/effects/rack.ts`'s O(1)
  routing, the derived lookups in `src/audio/params.ts`, `automationTargets`, `paramReachable`,
  `restore.ts`'s stages, the clip preset shape, `EffectRack.tsx` and `AutomationWorkspace.tsx`.
- The registry does not change. An effect is still one file and one entry; what changes is that a
  rack holds instances of entries. `PARAMS` remains the one declaration lookup, and a _value_
  lookup becomes (instance, param) — so "one place per parameter" survives with different words.
  Rewording that boundary in `docs/boundaries.md` and AGENTS.md is part of the step.
- `effect.add` stops refusing an effect already in the rack, which removes the reason
  `clipRestorationCommands` clears the whole rack before applying a clip.
- Proof: rack tests for two instances of one effect routing and bypassing independently; an
  offline render of two delays in series fingerprinting differently from one; a lane on the
  second instance only.
- Record: parameter identity is the boundary that moves. Write it.

**P14 — Deck speed, and key.** Each deck gets a wide-range speed control — a percentage, from
very slow to very fast, claiming no BPM — plus a key-lock switch and a pitch knob in semitones.

- Speed alone is `playbackRate` on the source node, which is cheap and drags pitch with it. Speed
  and pitch are registered deck parameters like any other; key lock is a durable per-deck switch,
  not a parameter.
- The real work is everywhere that assumes 1×: the position maths in `src/lib/timeline.ts`, its
  audio-thread twin in `src/audio/worklets/loop-reporter.js`, the schedule-ahead constants in
  `src/audio/transport.ts`, and the bpm the waveform reports from analysis. A rate change while
  playing must not glitch the loop or desync the playhead.
- Key lock is a pitch shifter, and no dependency is being added for it: it is DSP written here,
  plain JavaScript in a worklet first, measured before anything is moved anywhere else. It is the
  repo's first stretch kernel — the territory §4 parks paulstretch in — so what is learned belongs
  in its record. If the shifter cannot be made to sound acceptable inside this step, ship speed
  and pitch with key lock unavailable and say so; do not ship a switch nobody would turn on.
- Proof: offline renders at 0.5× and 2× fingerprinting at the expected length and peak; a loop's
  reported cycle time tracking rate; pure tests for the rate-aware position maths on both sides
  of the worklet seam.
- Record: rate changes transport arithmetic shared with a worklet. Write it.

**P15 — Clips show what they hold.** Each clip in the rack draws a small waveform of its source
with its loop region marked.

- It needs peaks for a source no deck is holding. `peaks()` is the engine's per-deck cache filled
  at load (`src/app/engine.ts`); a clip's source has to be decoded once and reduced through the
  same `src/lib/peaks.ts` — which is exactly the decode cache keyed by blob id that P8 named, so
  build that, and clip application gets cheaper as a side effect.
- Decoding is async and a clip list can be long: each thumbnail carries its blob identity so a
  stale decode cannot paint the wrong clip (§2), decodes are bounded rather than fired per row,
  and the drawing reuses the waveform's painting rather than a second painter.
- Proof: cache unit tests (one decode per blob, bounded eviction); the smoke captures a clip and
  asserts its thumbnail painted.

## 2. Rules for every feature

- `src/app` remains the only writer of session state. UI, workers, keyboard, and agent JSONL
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
- A view preference — snap, theme, whether the debug console is open — is not session state: no
  command, nothing durable, no history entry.
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
- UI focus, pointer, file in the existing preview smoke;
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
- Rearranger and paulstretch still wait until beat-aware looping and clips expose a concrete
  workflow; begin as pure JavaScript and move only a measured hot kernel to WASM. P14's key lock
  arrives first and under the same rule, so whatever it learns about stretching is what these
  start from.
- Per-deck routing, sends and a mixer are out of scope for P12: every deck lands in the one
  master bus until a named outcome says otherwise.
- Vocoder, spectral-space variants, Twister-specific modes, and other narrow/high-cost effects
  require a named user outcome and must arrive one plugin at a time.
- Collaboration, accounts, cloud storage, and uploads conflict with the local-first product unless
  that product constraint is deliberately revisited.
