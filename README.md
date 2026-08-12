# mulch

A browser-based audio looping instrument: load, loop, slice and process samples entirely
client-side. No server, no accounts, no uploads — audio never leaves the machine.

## Quick start

```sh
./scripts/setup   # install dependencies (needs Node 26 — see .nvmrc — and pnpm)
./scripts/dev     # run locally
```

| Task      | Command                                               |
| --------- | ----------------------------------------------------- |
| Bootstrap | `./scripts/setup`                                     |
| Run       | `./scripts/dev` (extra args pass through to Vite)     |
| Test      | `./scripts/test`                                      |
| **Gate**  | `./scripts/check` — format, lint, types, tiers, tests |

`./scripts/check` is the one command to remember. It runs every step even after one fails, so
fixing four problems costs one run instead of four. CI runs the same script.

Tooling is native end to end: oxlint and oxfmt (Rust) for lint and formatting, TypeScript 7 (Go)
for type checking. oxlint's type-aware rules run on the same Go compiler, so lint and `tsc` agree
about types. There is no ESLint and no Prettier — see
[docs/decisions/0002-oxc-toolchain.md](docs/decisions/0002-oxc-toolchain.md).

## Layout

All source lives under `src/`, in six tiers whose dependency direction is one-way and enforced by
`scripts/arch`:

```
src/lib      pure helpers — DSP maths, encoding. The well-tested layer.
src/audio    the Web Audio graph: parameter registry, effects, worklets, offline render
src/workers  worker entrypoints — encoding and analysis off the main thread
src/state    session store, persistence, versioning and migrations
src/ui       the instrument's components, with generic primitives in src/ui/components
```

[docs/map.md](docs/map.md) is the full picture — what belongs where, what may import what, and how
to search for a thing before building a second one.

## Docs

| Path                 | Purpose                                                              |
| -------------------- | -------------------------------------------------------------------- |
| `AGENTS.md`          | Instructions for AI coding agents. Kept under ~50 lines.             |
| `docs/map.md`        | Where things live; tiers, naming, size caps, search recipes.         |
| `docs/principles.md` | Rationale behind the principles in AGENTS.md.                        |
| `docs/decisions/`    | ADRs — why things are the way they are.                              |
| `NEW_APP_GUIDE.md`   | Post-mortem of the previous version; the reasoning behind the shape. |

## License

MIT — see [LICENSE](LICENSE).
