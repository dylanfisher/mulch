# Audit ledger

Class C and D findings only — the ones that span files and are fixed in wave 2, never
opportunistically from inside one file's pass. See [audit.md](audit.md) for the taxonomy and the
rules. Deleted with `audit.md` in the sweep's last commit.

**Every entry below is fixed.** Wave 2 ran serially, one commit per fact; each entry names the
commit that closed it. What remains is the watch list at the bottom, which is meant to remain.

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

## Watch list — two occurrences, deliberately not fixed (principle 3)

- **C** — the "an empty lane is omitted from the projection" walk, 2× — `session.ts:146`,
  `session.ts:159` — same `flatMap` returning `[]` for an absent or empty lane, once over
  `effectAutomationParamIds` and once over `DECK_AUTOMATION_PARAM_IDS`. Two is correct. A third
  automatable owner makes it a fix.
