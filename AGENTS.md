# AGENTS.md

Instructions for AI coding agents working in this repo. Humans: see [README.md](README.md).

**Keep this file under ~50 lines.** Anything longer lives in `docs/` and is linked from here.

## Stack

- **Language:** TypeScript 5.9 (strict) on Node 24 — version pinned in `.nvmrc`
- **Package manager:** pnpm 10
- **Framework:** React 19 + Vite. Tailwind v4, shadcn/ui on Base UI. Zustand for session state.
- **Test framework:** Vitest (`*.test.ts` beside the source)
- **Layout:** all source under `src/` — tiers, size caps and search recipes: [docs/map.md](docs/map.md)

## Commands

| Task                | Command           |
| ------------------- | ----------------- |
| Install / bootstrap | `./scripts/setup` |
| Run locally         | `./scripts/dev`   |
| Run tests           | `./scripts/test`  |
| **Full gate**       | `./scripts/check` |

`./scripts/check` runs format + lint + typecheck + arch + tests. It is the gate — see Definition of done.

## Principles

Non-negotiable, regardless of stack. Rationale: [docs/principles.md](docs/principles.md).

1. **Single source of truth.** Every fact — a constant, type, config value, copy string — is defined once and imported. Never re-declare, never re-derive. **Search before you create** — [docs/map.md](docs/map.md) has the recipes.
2. **Match the surrounding code.** Consistency beats personal preference. Read a neighboring file before writing a new one; map.md says which one is the neighbor.
3. **DRY on the third occurrence, not the second.** Premature abstraction costs more than duplication.
4. **Smallest change that solves the problem.** No drive-by refactors, renames, or reformatting outside the task.
5. **Fail loudly.** No empty catches, no silent fallbacks, no defaults that mask a missing value.
6. **Delete, don't comment out.** Git remembers.
7. **No new dependencies without asking first.** Say what it's for and what it replaces.
8. **Style is the formatter's job.** If a tool enforces it, it does not belong in this file or in review.

## Boundaries

- **One place per parameter.** Every deck/effect parameter is defined only in `src/audio/params.ts`; defaults, UI, automation and serialization all derive from it. Adding a parameter is a one-line diff — if it isn't, fix the abstraction, not the caller.
- **One signal chain.** `buildDeckChain(ctx: BaseAudioContext)` serves both the live `AudioContext` and offline export. Never write a second implementation of the chain for rendering.
- **Effects are registry entries** in `src/audio/effects/` — one file each. Never hand-wire an effect into a component or the chain.
- **Session format is versioned.** Changing its shape requires a new version plus a migration. Never edit a shipped migration; add the next one.
- **Nothing per-frame goes through React state.** Playhead, meters and cursors live in refs read by one RAF loop.
- **No colour literal outside `src/ui/tokens.css`** — not in CSS, not in a Tailwind arbitrary value.
- **Never commit to `main`** — branch first. And never write, print, or `op read` a plaintext secret: `.env.example` holds `op://` references, resolved by `op run` at runtime.

## Definition of done

- `./scripts/check` passes clean.
- New behavior has a test that fails without the change.
- No new dependencies, no new files outside the agreed layout, no TODOs left behind.
- If a decision was non-obvious, record it in `docs/decisions/`.
