# AGENTS.md

Instructions for AI coding agents working in this repo. Humans: see [README.md](README.md).

**Keep this file under ~50 lines.** Anything longer lives in `docs/` and is linked from here.

## Pre-release

Nothing has shipped and there are no users but the author. **Breaking changes are free** — write no migrations, compatibility shims, deprecation paths or version negotiation for the app's own data; change the shape and move on. Durable data that is not this build's shape is discarded, not repaired ([0026](docs/decisions/0026-pre-release-has-no-migrations.md)). The goal is one clean, simple slate of code, not a record of what it used to be.

## Stack

- **Language:** TypeScript 7 (strict, the native Go compiler) on Node 26 — pinned in `.nvmrc`
- **Package manager:** pnpm 10
- **Framework:** React 19 + Vite 8. Tailwind v4, shadcn/ui on Base UI. Zustand for session state.
- **Tooling:** oxlint + oxfmt (oxc) and Vitest (`*.test.ts` beside the source). No ESLint, no Prettier — don't reintroduce either.
- **Layout:** all source under `src/` — tiers, size caps and search recipes: [docs/map.md](docs/map.md)

## Commands

| Task                | Command           |
| ------------------- | ----------------- |
| Install / bootstrap | `./scripts/setup` |
| Run locally         | `./scripts/dev`   |
| Run tests           | `./scripts/test`  |
| **Full gate**       | `./scripts/check` |

`./scripts/check` runs format + lint + typecheck + arch + tests. It is the gate — see Definition of done. Run `./scripts/fix` first on any change that touched code: it applies the format and lint repairs a tool can make itself, so the gate never spends a run reporting them.

**Never kill a server you did not start.** A dev server on 5173 or a preview server on 4173 is the human's — `./scripts/drive` sniffs and reuses both, and Vite hot-reloads, so nothing an agent does needs a restart. No `kill`/`pkill`/`killall`, no `lsof -ti:PORT | xargs kill`, no `./scripts/dev` in the foreground. To drive a running dev server, use `./scripts/drive --dev`; to drive an arbitrary one, `./scripts/drive --url U`. Run drive in the foreground — it carries its own deadline and dies at it saying what it was waiting on; a backgrounded one nobody reaps holds a browser forever. `./scripts/drive --stop` reaps strays and nothing else ([0036](docs/decisions/0036-the-harness-fails-by-a-clock.md)).

## Principles

Non-negotiable, regardless of stack. Rationale: [docs/principles.md](docs/principles.md).

1. **Single source of truth.** Every fact — a constant, type, config value, copy string — is defined once and imported. Never re-declare, never re-derive. **Search before you create** — `./scripts/map` is every file in `src/`, one line each; [docs/map.md](docs/map.md) has the rest of the recipes.
2. **Match the surrounding code.** Consistency beats personal preference. Read a neighboring file before writing a new one; map.md says which one is the neighbor.
3. **DRY on the third occurrence, not the second.** Premature abstraction costs more than duplication.
4. **Smallest change that solves the problem.** No drive-by refactors, renames, or reformatting outside the task.
5. **Fail loudly.** No empty catches, no silent fallbacks, no defaults that mask a missing value.
6. **Delete, don't comment out.** Git remembers.
7. **No new dependencies without asking first.** Say what it's for and what it replaces.
8. **Style is the formatter's job.** If a tool enforces it, it does not belong in this file or in review.

## Boundaries

Nine invariants, one line each, in [docs/boundaries.md](docs/boundaries.md) — one declaration per parameter and one value per (instance, parameter), the one signal chain, effects as registry entries a rack holds instances of, the discardable session, deck identity, per-frame state, colour, type, secrets. Read the relevant one before touching that area.

## Definition of done

- `./scripts/check` passes clean. Read its output whole — every step runs and every failure is reported in that one invocation, so truncating it costs a rerun.
- New behavior has a test that fails without the change.
- No new dependencies, no new files outside the agreed layout or without a `@role` line, no TODOs left behind.
- If a decision constrains future changes, record it in `docs/decisions/` — as long as the decision is and not a line longer. Behavior that a code comment already explains is not a decision, and a long ADR is one nobody rereads.
