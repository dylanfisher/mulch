# Starting Over: Lessons from Loop Loop Loop

Notes for building a simpler v2 browser audio-looping instrument, derived from the current
codebase (~43k lines of `src/`, 195 commits, 17 test files).

---

## 1. What the current app actually costs

| File                                | Lines | What went wrong                                           |
| ----------------------------------- | ----- | --------------------------------------------------------- |
| `src/hooks/useDecks.ts`             | 4370  | One hook owns all deck state, all setters, all automation |
| `src/audio/deck.ts`                 | 3242  | Live graph + ~60 near-identical `setDeckXxxValue` exports |
| `src/index.css`                     | 3116  | No tokens, no component scoping                           |
| `src/components/Waveform.tsx`       | 2232  | Canvas render + hit-testing + slice editing + zoom + drag |
| `src/App.tsx`                       | 2056  | Orchestration after 12 "Continue refactor" commits        |
| `src/components/DeckCardFxRack.tsx` | 1729  | One JSX block per effect, hand-wired                      |
| `src/hooks/useSessionManager.ts`    | 1196  | Save/load/zip/autosave/hydrate/migrate                    |
| `src/utils/exportMixdown.ts`        | 945   | Second implementation of the whole signal chain           |

Root cause in one sentence: **every new parameter had to be hand-written into ~8 places**
(type union, default, React state setter, engine setter, UI knob, automation param union,
session serialize/hydrate, offline export path). That multiplier is why 12 sequential
refactor commits still left four files over 2000 lines.

---

## 2. The five decisions that would have prevented most of the pain

### 2.1 A parameter registry — define each param exactly once

Today `delayFeedback` appears in `types/deck.ts`, `useDecksShared.ts` defaults,
`deckParameterSetters.ts`, `deck.ts`, `DeckCardFxRack.tsx`, the `SimpleAutomationParam` union,
`deckSessionSerialization.ts`, and `exportMixdown.ts`. Make it one object:

```ts
// audio/params.ts
export const PARAMS = defineParams({
  delayFeedback: {
    label: "Feedback",
    range: [0, 0.98],
    default: 0.35,
    curve: "linear",
    automatable: true, // -> automation lane + MIDI target for free
    apply: (n, v, t) => n.feedback.gain.setTargetAtTime(v, t, 0.01),
  },
  // ...
});
export type ParamId = keyof typeof PARAMS;
export type DeckParams = { [K in ParamId]: number };
```

Everything else derives from it:

- defaults: `mapValues(PARAMS, p => p.default)`
- serialization: iterate the registry, no per-field code, unknown keys ignored on load
- UI: `<Knob param="delayFeedback" deck={id} />` reads label/range/curve from the registry
- automation + MIDI learn: any param with `automatable: true` is targetable, no new union member
- validation/normalize: clamp to `range` in one place instead of ~40 `normalizeXxx` functions

**Rule: adding a parameter should be a one-line diff.** If it isn't, the abstraction is wrong.

### 2.2 One signal chain, two contexts — never two implementations

The current app maintains four parallel paths (live, Save Loop bake, Export Mix, global record),
and `AGENTS.md` has a standing rule to keep them in sync manually. That rule exists because the
architecture forces it. History shows the cost: "Fix gain automation in export pipeline",
"Fix parametric eq automation in export pipeline", "Fix discrepancy in rearranger slice delay
export render", "Fix export pipeline slice delay timing".

Write effects against `BaseAudioContext` so the same builder runs in `AudioContext` and
`OfflineAudioContext`:

```ts
export type EffectNode = {
  input: AudioNode;
  output: AudioNode;
  set(p: Partial<DeckParams>, t: number): void;
  dispose(): void;
};
export type EffectFactory = (ctx: BaseAudioContext, sampleRate: number) => EffectNode;

export const buildDeckChain = (ctx: BaseAudioContext, params: DeckParams) => {
  /* used by both */
};
```

Export becomes: build the same chain in an `OfflineAudioContext`, replay automation as
`setValueCurveAtTime`, render. Only AudioWorklet-backed effects need care (worklets do work in
`OfflineAudioContext` — you must `await ctx.audioWorklet.addModule()` per context).

**Parity test that pays for itself:** render 2s of a known buffer through live-graph-in-offline
vs. the export renderer and assert sample-level equality within epsilon. One test kills a whole
bug class.

### 2.3 State lives outside React

`useDecks.ts` (4370 lines) plus `useDeckStackProps.ts` and `useDeckCardFxRackProps.ts` — hooks
whose only job is assembling giant prop objects — are symptoms of putting the instrument's state
inside the component tree.

Put session state in a plain store (Zustand, or a hand-rolled store + `useSyncExternalStore`):

- audio code reads it directly, no prop drilling, no callback megaobjects
- components subscribe to slices (`useDeck(id, d => d.gain)`) so a knob drag re-renders one knob
- undo/redo = snapshot/restore of one immutable object
- persistence = serialize one object

High-rate values (playhead position, meters, waveform cursor) must **not** go through React state
at all. Write them to a ref/`Float32Array` and read in a single RAF loop. The commits
"Try to prevent overlapping RAF/timeouts" and "Fix slow balance knob issue" are React-in-the-hot-path.

### 2.4 Effects are plugins registered in a list, not code in a mega-file

```ts
registerEffect({
  id: "delay",
  label: "Delay",
  params: ["delayTime", "delayFeedback", "delayMix", "delayTone"],
  create: (ctx) => {
    /* returns EffectNode */
  },
});
```

The FX rack renders from the registry (`params.map(p => <Knob param={p} />)`), the chain builds
from the registry, session serialization walks the registry. `DeckCardFxRack.tsx` at 1729 lines
becomes ~100 lines plus one small file per effect. Custom UI (parametric EQ graph, waveform slice
editor) is the exception: allow an optional `render` override, keep the default generic.

### 2.5 Version the session format on day 1

```ts
type SessionV1 = { version: 1; decks: ...; clips: ... };
const MIGRATIONS = { 1: (s) => ({ ...s, version: 2, /* ... */ }) };
```

Plus, learned the hard way here:

- **Blobs separate from JSON.** JSON holds `blobId`; audio lives in an IndexedDB blob store.
- **Reuse blob ids for unchanged audio**, and GC unreferenced blobs on save — otherwise IndexedDB
  grows unbounded during a session (this app had to add both retroactively).
- **Don't re-encode on autosave.** Preserve the original blob format.
- **Recording drafts are a separate store**, excluded from GC, recoverable after a crash.
- **Cap undo history** (this app caps at 30) — snapshots hold audio references.
- **Mark transient updates.** Auto-rearrange-on-loop fired an autosave every loop cycle until it
  was flagged transient. Any per-loop or per-frame state change must be excluded from autosave +
  undo explicitly.

---

## 3. Audio-specific gotchas already paid for

- **Anything timing-critical belongs on the audio thread.** Slice ping-pong was main-thread
  scheduled, jittered, and had to be rewritten as an AudioWorklet. If a decision needs to happen
  at a sample-accurate moment, it's a worklet or a scheduled `AudioParam` automation — never a
  `setTimeout`/RAF.
- **`setTimeout` fallbacks for RAF exist because RAF stops in background tabs.** Design loop
  retrigger to be schedule-ahead (`source.start(when)`) rather than react-on-time.
- **Quantize edit boundaries to sample indices.** Repeated float-second rearrange passes
  accumulate drift (fixed here by re-deriving boundaries on a sample grid).
- **Crossfade every cut.** Slice fades exist to hide clicks; build a shared 2–5ms fade helper
  and use it in every destructive edit and every slice trigger.
- **Long recordings crash the tab** if buffered in memory. Stream `MediaRecorder` chunks
  (~2s) into IndexedDB, assemble on stop, recover drafts on load. Budget for this if recording
  is in scope; drop recording from MVP if it isn't.
- **WAV encoding belongs in a Worker.** Same for BPM/onset analysis.
- **WASM last, JS always.** dsp-core/paulstretch/rearranger WASM here each keep a JS fallback and
  are precompiled artifacts checked into `public/wasm/` so `npm run build` needs no C toolchain.
  That's the right shape — but don't start there. Ship the JS version, profile, then port only the
  measured hot kernel.
- **Handle the AudioContext unlock gate explicitly** (existing `AudioUnlockOverlay` is worth keeping).
- **Master limiter + soft clipper on the output bus** from day 1 — experimental FX will blow up.
- **Normalize imports on ingest.** Browsers can't decode m4a/flac/aiff reliably; lazy-loading
  ffmpeg.wasm to transcode was necessary. Keep it lazy — it's the biggest dependency in the app.

---

## 4. Testing that earned its keep

Keep pure functions pure and test those; skip testing the Web Audio graph directly.

1. **Pure DSP/edit logic** — rearranger slicing, onset detection, BPM, WAV encoding, zip
   round-trip. These are the existing tests that actually catch things.
2. **Offline render golden tests** — render a fixed buffer + fixed params, assert an RMS/peak
   fingerprint. Catches accidental gain-staging and parity regressions.
3. **Session round-trip** — save → load → deep-equal; plus each migration.
4. Skip mocking `AudioContext` for UI tests. Put logic in functions that don't need it.

Run `lint + typecheck + test` in CI from commit one (this repo has the scripts but never set up CI).

---

## 5. Scope for v2 — what to keep, cut, defer

**Core (build first, in this order):**

1. AudioContext + master bus + limiter + unlock overlay
2. One deck: load/decode/play/stop, loop in/out, gain
3. Waveform canvas: draw, playhead, drag loop markers, zoom
4. N decks from the same component; active-deck concept + keyboard shortcuts
5. Session save/load (IndexedDB, versioned) + zip export/import
6. 3–4 effects through the plugin API (gain, filter, delay, pitch)
7. Offline export via the shared chain

**Defer until the core is boring:** automation lanes, MIDI learn / Twister mode, vocoder,
rearranger, paulstretch, parametric EQ, spectral space, clip rack, undo/redo, WASM.

**Consider cutting permanently** (high cost, narrow payoff in this codebase): deck-to-deck
vocoder, spectral space, delay's pitch-ladder/spectral/duck sub-modules, per-deck width overrides,
storage diagnostics overlay, Twister-specific MIDI mode. The delay module alone carries ~18
parameters; most were never load-bearing.

**Simplifications worth making:**

- One EQ (either 3-band or parametric — this app shipped both and then removed one)
- One recording path instead of Save Loop + Export Mix + Global Record + Clip Recorder
- Clips are just decks-in-waiting; consider making a clip literally a serialized deck source
- Fixed 2-column layout; no per-deck width override

---

## 6. Suggested structure

```
src/
  audio/
    context.ts        // AudioContext lifecycle, master bus, unlock
    params.ts         // THE parameter registry
    chain.ts          // buildDeckChain(BaseAudioContext, params) — live + offline
    effects/          // one file per effect, each exports an EffectFactory + registry entry
    worklets/
    render.ts         // offline render using chain.ts (no duplicate DSP)
  state/
    store.ts          // session store, undo/redo, selectors
    persist.ts        // IndexedDB, versioning + migrations, blob GC
  ui/
    Deck.tsx  Waveform.tsx  Knob.tsx  FxRack.tsx  Header.tsx
    tokens.css        // design tokens; component CSS modules alongside components
  workers/            // wav encode, analysis
  lib/                // pure helpers (zip, wav, dsp math) — the well-tested layer
```

Guardrails: **soft cap 400 lines/file, hard cap 800.** When a file crosses 400, the fix is usually
a missing abstraction, not a smaller file. `App.tsx` should stay under ~150 lines forever.

---

## 7. Process notes

- **Keep `AGENTS.md`** — the rules about modularity, updating architecture docs in the same
  change set, and running lint/tests were good. Drop the rule about manually keeping four render
  paths in sync; architect that away instead (§2.2).
- **Don't let the architecture doc become an append-only changelog.** `BLUEPRINT.md` grew to
  31KB / ~200 one-line bullets, mostly feature announcements. Split it:
  - `ARCHITECTURE.md` — invariants, data flow, module boundaries. Rewritten in place, stays short.
  - `DECISIONS.md` — dated entries, append-only, why not what.
  - `README.md` — user-facing.
- **Fix the abstraction on the second copy-paste, not the tenth.** By the time
  `setDeckSpectralSpaceTransientProtectValue` existed, the pattern had been repeated ~60 times.
- **Add one effect end-to-end before adding the second.** If the second one requires touching
  more than its own file plus the registry, stop and fix the seam.
- **Every knob you add is permanent surface area** — session format, MIDI target, automation,
  export parity, UI space. Add parameters grudgingly; ranges and defaults beat more controls.

---

## 8. Day-one checklist

- [ ] Vite + React 19 + TS strict, ESLint + Prettier, Vitest — same stack, it worked
- [ ] `npm run validate` (lint + test + typecheck) wired into CI on commit one
- [ ] Store (Zustand or `useSyncExternalStore`) before any feature code
- [ ] `params.ts` registry + `Knob` bound to it before the second parameter exists
- [ ] `buildDeckChain(BaseAudioContext)` used by both live and offline before the first export
- [ ] `SessionV1` type + version field + a no-op migration in the first save implementation
- [ ] Parity test (live-in-offline vs. export) as soon as export exists
- [ ] CSS tokens file before the first color literal
- [ ] File-size guardrail noted in `AGENTS.md`
