# Audit ledger

Class C and D findings only — the ones that span files and are fixed in wave 2, never
opportunistically from inside one file's pass. See [audit.md](audit.md) for the taxonomy and the
rules. Deleted with `audit.md` in the sweep's last commit.

**Every wave 0 and wave 1 entry is fixed.** Wave 2 ran serially, one commit per fact; each entry
names the commit that closed it. The wave 3 section below is open — wave 2 was already closed when
those were found, and reopening it from inside a file's pass is the thing this ledger prevents. The
watch list at the bottom is meant to remain.

## Wave 0 — the declaration read

- **D** — the groupable-command set, declared 3× — `commands.ts:61`, `facade.ts:87`,
  `facade.ts:132` — a type union (`GroupedEditCommand`, by `Exclude`), a boolean record
  (`COMMAND_IS_DURABLE`, which answers a wider question and happens to agree), and a twelve-branch
  `!==` chain. The `satisfies` catches a missing key but not a divergence between the three: adding
  a groupable command compiles with the `!==` chain unchanged, and the guard then rejects it at
  runtime. Found in wave 0, confirmed in wave 1 (`facade.ts`).
  **Fixed** — _Let the compiler check which commands are groupable._ One `COMMAND_HISTORY` record
  answers group / alone / none for every command, checked by a mapped conditional against
  `GroupedEditCommand` and `DurableEditCommand` themselves. Marking `effect.reorder` "alone" or
  `clip.apply` "group" now fails typecheck.

- **D** — "durable text is bounded at 64", declared 3× as three constants —
  `contract.ts:29` (`EFFECT_INSTANCE_ID_MAX`), `store.ts:21` (`DECK_ID_MAX`), `session.ts:80`
  (`CLIP_NAME_MAX`) — each with an identical "longer than MAX characters" `RangeError` guard at
  `contract.ts:39`, `store.ts:36`, `session.ts:86`. The fourth guard of the same family,
  `assertClipId` at `session.ts:92`, has **no bound at all** — the divergence the pattern
  predicted, already landed. Found in wave 0.
  **Fixed** — _Bound durable text in one place instead of three._ `src/lib/guards.ts` declares
  `DURABLE_TEXT_MAX` and the one `assertDurableText` the four domain guards delegate to. An id, a
  label and a name were judged one fact, not three: a clip id is now bounded by the same rule its
  name is.

- **C** — the unknown→indexable-record narrowing, 5× — `automation.ts:93`, `sessionArchive.ts:37`,
  `source.ts:28`, `session.ts:246`, `facade.ts:131` — `value as Record<string, unknown>`, each
  carrying its own `oxlint-disable-next-line no-unsafe-type-assertion` and its own near-identical
  comment. Five of the thirteen `no-unsafe-type-assertion` waivers in the codebase are this one
  shape. Found in wave 0.
  **Fixed** — _Narrow unknown JSON to a record in one place._ `isRecord` is a type predicate
  rather than an assertion, so all five waivers went with the duplication; `objectAt` is the same
  narrowing where a caller wants a refusal. `sessionArchive.ts` and `session.ts` dropped their
  local copies of `objectAt`.

- **C** — the finite-number wire guard, 6× — `automation.ts:68`, `session.ts:210` (`finite`),
  `queue.ts:38`, `facade.ts:159`, `facade.ts:161`, `facade.ts:168`, `execute.ts:93` —
  `typeof x !== "number" || !Number.isFinite(x)` followed by a `TypeError`. `session.ts:209`
  already is the helper; the other five do not reach it. Found in wave 0.
  **Fixed** — _Ask whether a number is finite in one place._ `finite(value, at)` in
  `src/lib/guards.ts`, returning the number so the check-only and value-wanted callers are one
  call. Two of the six were already the same helper under two names and two argument orders.

## Wave 1

- **D** — the wire validation of a groupable command, declared twice: flat in `wire.ts` and again
  scattered across `execute.ts`'s handlers, down to identical message strings —
  `wire.ts:112`/`execute.ts:310` ("unknown effect"), `wire.ts:121`/`execute.ts:362` ("effect bypass
  is not a boolean"), `wire.ts:126`/`execute.ts:409` ("effect index is not an integer"),
  `wire.ts:98`/`execute.ts:135` ("unknown param"), `wire.ts:92`,`:94`,`:101`/`execute.ts:95`
  (`assertFinite`). Nothing pairs them: a check added to one path and not the other means a command
  refused when it arrives inside `history.group` and accepted when it arrives alone, or the
  reverse. This is the largest D in the codebase and the reason `execute.ts` was scheduled first.
  Found in wave 1 (`execute.ts`).
  **Fixed** — _Validate a groupable command's wire shape in one place._ `wire.ts` exports
  `assertGroupedEdit`, and `execute()` runs it once before dispatch, so both doors are the same
  code; eleven duplicated checks came out of `execute.ts`. One divergence had already landed and is
  now pinned by a test: an empty deck id was refused as "deck.add deck is not a non-empty string"
  arriving alone and as "unknown deck: " arriving inside a group.

## Wave 3 — the long tail

**Open.** Wave 2 is closed, so nothing below is fixed; these are for whoever reopens the ledger.

- **C** — walk every automation lane an owner holds, skipping the absent ones, 5× — the deck-level
  `DECK_AUTOMATION_PARAM_IDS` pass paired with the per-instance `effectAutomationParamIds(...)`
  pass — `session.ts:138`+`:152` (the durable projection, the pair the watch list below names),
  `session.ts:250`+`:265` (`validateLanes`), `restore.ts:78`+`:84` (the `automation.set`
  restoration stages), `restore.ts:133`+`:141` (`clearedLanes`, the same walk inverted),
  `engine.ts:196`+`:429` (arming a prepared graph). Read as the watch item's narrow wording it is
  still 2; read as the shape principle 3 governs it is 5. The bodies differ — a projection entry, a
  validation call, a command, a cleared command, a `setAutomation` call — so the fix is a lane
  visitor, not an extraction, and that makes it a judgment call rather than a mechanical one.
  Found in wave 3 (`src/app`).

- **C** — "a positive, finite sample rate", 3× — `analysis.ts:172`, `fingerprint.ts:101`,
  `biquad.ts:20` (the `positive(value, at)` helper, applied at `:37` and `:64`) — all three
  literally `!Number.isFinite(x) || x <= 0` → `RangeError`. `guards.ts:33`'s `finite` is the
  natural home; it proves finiteness but not positivity. The divergence the pattern predicts has
  already landed at two sites that take a sample rate and check nothing: `wav.ts:65`, where a NaN
  rate is written into the RIFF header as `0` by `u32` (`wav.ts:44`), producing a valid-looking
  file claiming 0 Hz; and `waveform.ts:139`, where `renderGen` derives `frames` from it and the
  `frames < 1` guard at `:142` — written, per its own comment, so that a zero-length buffer fails
  loudly here rather than as a `DOMException` in `createBuffer` — lets NaN through, because
  `NaN < 1` is false and `new Float32Array(NaN)` is a silent length-0 buffer. That last one was
  found as a class G in wave 3 (`src/lib`) and **not fixed there**: its honest repair is the
  sample-rate guard this entry is about, and a fix that wants a fix elsewhere is a ledger entry.

- **C** — the module-value + listener-`Set` + `useSyncExternalStore` store, 3× —
  `shortcuts.ts:119` (`altHeld`), `shortcuts.ts:168` (`debugConsoleOpen`), `theme.ts:19` and `:92`
  (`current`). Each is a module `let`, a `Set<() => void>`, a notify loop, a `subscribe` that
  adds/removes and (in two of the three) attaches the document listener on the first subscriber and
  detaches on the last, and a hook returning `useSyncExternalStore(subscribe, read, serverRead)`.
  `shortcuts.ts:117` and `:166` both say "the way X does", which is the duplication documenting
  itself. `frame.ts:10` is a fourth partial: the `Set` and the first/last lifecycle, no snapshot
  value. Found in wave 3 (`src/ui`).

- **C** — the "read one slice of the session store" hook body, 5× — `App.tsx:48`, `App.tsx:58`,
  `Deck.tsx:44`, `ClipRack.tsx:118`, `ClipRack.tsx:121` — `useCallback(() =>
instrument.state.getState().X, [instrument])` followed by
  `useSyncExternalStore(instrument.state.subscribe, read, read)`. Found in wave 3 (`src/ui`).

- **D** — the delay line's maximum time, declared 2× — `delay.ts:6` (`max: 2` on the `delay.time`
  declaration) and `delay.ts:69` (`ctx.createDelay(2)`, the node's `maxDelayTime`). Raising the
  declared `max` alone compiles, passes the registry validator, and is silently clamped by the
  node: the parameter reads 3 in the UI and the ear hears 2. Both occurrences are in one file, so
  unlike every other entry here it is fixable inside a single pass (`const MAX_DELAY_SECS = 2` at
  both sites) — it is here only because wave 2 is closed. Found in wave 3 (`src/audio`).

- **D** — "the event feed has four columns", declared 2× in one file — `DebugConsole.tsx:98` (the
  skeleton's four `<span>`s) and `DebugConsole.tsx:63` (the painter's hard-coded `write(cells, 0..3,
…)` in both the gap and the event branch). The same file already single-sources the _counters_
  through `COUNTERS` at `:28`, so the precedent for the fix is in the file. `:60`'s empty-row branch
  is deliberately count-free and is already correct. Found in wave 3 (`src/ui`).

- **D** (low confidence, listed for completeness) — "effect param ids are globally unique",
  enforced twice with two messages — `registry.ts:28` (`duplicate effect param id: …`, run at
  module load by `validateEffects(EFFECTS)` on `:35`) and `params.ts:51` (`duplicate param id: …`,
  over `DECK_PARAMS ++ EFFECT_PARAMS`). `params.ts` strictly subsumes the registry's check for the
  real tuple; the registry's survives because `validateEffects` is exported and exercised on
  synthetic lists by `registry.test.ts:24`. Probably not worth a commit. Found in wave 3
  (`src/audio`).

- **C** — `type ParamBinding`, declared 3× — `delay.ts:13`, `eq.ts:29`, `filter.ts:21`. The same
  `{ initialize(value); set(value, when) }`, with `eq` and `filter` adding an identical
  `target: AudioParam` under a verbatim-identical doc comment (`eq.ts:32`, `filter.ts:24`). Third
  occurrence reached, but weigh the counter-argument first: this is the per-plugin parallel
  structure that lets a plugin read standalone, and hoisting it into `contract.ts` makes the
  two-field and three-field variants one type with an optional `target`, which is weaker than what
  `filter` and `eq` currently prove. The _type_ is worth hoisting; the binding literals are not.
  Found in wave 3 (`src/audio`).

## Watch list — two occurrences, deliberately not fixed (principle 3)

- **C** — the "an empty lane is omitted from the projection" walk, 2× — `session.ts:138`,
  `session.ts:152` — same `flatMap` returning `[]` for an absent or empty lane, once over
  `effectAutomationParamIds` and once over `DECK_AUTOMATION_PARAM_IDS`. Two is correct. A third
  automatable owner makes it a fix. (Line numbers corrected in wave 3; the wider reading of this
  same walk is the 5× C entry above.)
- **C** — the Firefox `cancelAndHoldAtTime` fallback, 2× — `ramp.ts:13`, `ramp.ts:52` — identical
  four lines, and `ramp.ts:50` already comments the pairing. A third bound-param scheduler makes it
  a fix. Found in wave 3 (`src/audio`).
- **C** — the not-a-`Blob` guard, 2× — `repository.ts:134`, `repository.ts:151` — identical check
  and identical message `blob ${id} is not a Blob`. Found in wave 3 (`src/state`).
- **C** — the GC delete sweep, 2× — `repository.ts:113`, `repository.ts:173` — identical three-line
  `for (const key of keys) { if (typeof key !== "string" || !keep.has(key)) …delete(key); }`.
  Found in wave 3 (`src/state`).
- **D** — "the blobs a write keeps = the session's reachable blobs plus `retained`", 2× in two
  spellings — `repository.ts:105`, `repository.ts:167`. Found in wave 3 (`src/state`).
- **D** — "an omitted `hz` means `DEFAULT_HZ[kind]`", 2× — `waveform.ts:52` (`effectiveGenHz`) and
  `waveform.ts:136` (`spec.hz ?? DEFAULT_HZ[kind]`). `renderGen` defaults at `:136`, validates, then
  defaults again through `effectiveGenHz` at `:147`; they agree today only because `DEFAULT_HZ` is
  `0` for exactly the kinds that ignore `hz`. A third caller of `effectiveGenHz` makes it a fix.
  Found in wave 3 (`src/lib`).
- **D** — a fictional FX-unit name set, 2× — `TogglesSection.tsx:14`, `SurfacesSection.tsx:21`.
  Both have already diverged from the real registry at `registry.ts:10` (`filter`, `delay`, `eq` —
  there is no reverb), and `SurfacesSection.tsx:17` shows the precedent for a gallery section
  importing the real list. Found in wave 3 (`src/ui/dev`).
- **C** — five more two-occurrence shapes in `src/ui`, correct as they stand:
  `const owner = instance === undefined ? {} : { instance }` (`ParameterKnob.tsx:80`, `:125`); the
  `(isAutomationParam(p) ? …automation[p] : undefined) ?? null` read (`Deck.tsx:268`,
  `EffectRack.tsx:150`); the `{region, markIn, markOut}` overlay style triple built from `pct`
  (`Waveform.tsx:301`, `ClipThumbnail.tsx:34`); the commit-on-blur-or-Enter callback pair
  (`LoadField.tsx:62`, `ClipRack.tsx:78`); and `event.currentTarget.files?.item(0)` with its
  `null || undefined` refusal (`Deck.tsx:135`, `SessionArchiveControls.tsx:54`).
