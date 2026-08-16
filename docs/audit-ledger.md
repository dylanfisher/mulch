# Audit ledger

Class C and D findings only — the ones that span files and are fixed in wave 2, never
opportunistically from inside one file's pass. See [audit.md](audit.md) for the taxonomy and the
rules. Deleted with `audit.md` in the sweep's last commit.

## Wave 0 — the declaration read

- **D** — the groupable-command set, declared 3× — `commands.ts:61`, `facade.ts:87`,
  `facade.ts:132` — a type union (`GroupedEditCommand`, by `Exclude`), a boolean record
  (`COMMAND_IS_DURABLE`, which answers a wider question and happens to agree), and a twelve-branch
  `!==` chain. The `satisfies` catches a missing key but not a divergence between the three: adding
  a groupable command compiles with the `!==` chain unchanged, and the guard then rejects it at
  runtime. Found in wave 0, confirmed in wave 1 (`facade.ts`).

- **D** — "durable text is bounded at 64", declared 3× as three constants —
  `contract.ts:29` (`EFFECT_INSTANCE_ID_MAX`), `store.ts:21` (`DECK_ID_MAX`), `session.ts:80`
  (`CLIP_NAME_MAX`) — each with an identical "longer than MAX characters" `RangeError` guard at
  `contract.ts:39`, `store.ts:36`, `session.ts:86`. The fourth guard of the same family,
  `assertClipId` at `session.ts:92`, has **no bound at all** — the divergence the pattern
  predicted, already landed. Found in wave 0.

- **C** — the unknown→indexable-record narrowing, 5× — `automation.ts:93`, `sessionArchive.ts:37`,
  `source.ts:28`, `session.ts:246`, `facade.ts:131` — `value as Record<string, unknown>`, each
  carrying its own `oxlint-disable-next-line no-unsafe-type-assertion` and its own near-identical
  comment. Five of the thirteen `no-unsafe-type-assertion` waivers in the codebase are this one
  shape. Found in wave 0.

- **C** — the finite-number wire guard, 6× — `automation.ts:68`, `session.ts:210` (`finite`),
  `queue.ts:38`, `facade.ts:159`, `facade.ts:161`, `facade.ts:168`, `execute.ts:93` —
  `typeof x !== "number" || !Number.isFinite(x)` followed by a `TypeError`. `session.ts:209`
  already is the helper; the other five do not reach it. Found in wave 0.

## Watch list — two occurrences, deliberately not fixed (principle 3)

- **C** — the "an empty lane is omitted from the projection" walk, 2× — `session.ts:146`,
  `session.ts:159` — same `flatMap` returning `[]` for an absent or empty lane, once over
  `effectAutomationParamIds` and once over `DECK_AUTOMATION_PARAM_IDS`. Two is correct. A third
  automatable owner makes it a fix.
