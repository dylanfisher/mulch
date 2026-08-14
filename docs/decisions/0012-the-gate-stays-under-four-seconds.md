# 0012. The gate stays under four seconds

- **Date:** 2026-08-13
- **Status:** accepted

## Context

`./scripts/check` is run on every iteration, by humans and agents alike, and its cost is paid far
more often than any other command in the repo. It already ran its ten steps concurrently, so its
wall clock was not the sum of its parts — it was its slowest part, and one step dwarfed the rest:

| step                      | cost   |
| ------------------------- | ------ |
| drive (`./scripts/smoke`) | ~3.9s  |
| test (`vitest run`)       | ~1.2s  |
| links                     | ~0.37s |
| lint, format              | ~0.45s |
| typecheck, arch, roles    | <0.25s |

Everything but `drive` finished underneath it, which means every second spent tuning the other
nine steps bought nothing. Inside `drive`, `scripts/smoke` ran three independent `scripts/drive`
invocations one after another — the param fixture (~0.76s), the deck fixture (~2.3s), and the
`--expect-no-attach` run (~0.52s) — and the deck fixture's time is mostly `wait` lines burning
real audio seconds that no amount of CPU shortens.

## Decision

`scripts/smoke` builds once, then runs its three drive invocations concurrently. The gate went
from ~4.34s to ~3.48s (three runs each, warm caches, 18 cores).

The build moves up into `smoke` because three drive processes starting together would each see
the same stale `dist/` and write it at the same time. It is unconditional — the gate is the wrong
place to trust an mtime — and it shells out to the `vite` CLI rather than `await import("vite")`,
because pulling vite into the smoke process costs more than the build it performs.
`scripts/drive` keeps its own staleness check, which is still the right answer for one process.

`vitest` moved to `pool: "threads"` (~10%, and off the critical path — it helps a focused
`./scripts/test`, not the gate).

## Alternatives considered

- **`vitest --changed` in the gate** — the ask that prompted this, and the wrong lever twice
  over. It saves no wall clock, because `test` finishes a second and a half inside `drive`; and
  a gate that decides for itself what not to run is not a gate. `--changed` diffs against git, so
  committing mid-feature makes it run nothing and report green.
- **`isolate: false`, `experimental.fsModuleCache`, `NODE_COMPILE_CACHE`** — measured, each worth
  ~30ms or less on this suite. Not worth shared state between test files, an experimental flag,
  or a cache directory, for a step that is not the bottleneck.
- **One shared preview server for all three runs** — 130ms faster than letting each start its
  own on port 0, and it would have put server lifetime management in `smoke`, which is meant to
  hold assertions and nothing else.
- **Trimming the `wait` lines in `fixtures/deck-smoke.jsonl`** — ~0.35s available, paid for out
  of the real-time margin that keeps the fixture from flaking. The margin is the feature.
- **Rewriting the `links` step in node** — it spawns a grep and a sed per markdown file, which
  reads as wasteful and costs 0.37s under a 2.8s step. Nothing to buy.

## Consequences

The concurrent window puts three headless Chromiums on the machine at once instead of one, and
`check`'s other steps are still running alongside them. Two of the three are cheap and short —
the param fixture and the attach check are done inside a second — but on a 2-core runner the deck
fixture's audio thread has less headroom, and the smoke fails on any `xrun`. If that goes flaky in
CI, the revert is to await the three drives in sequence again; the build hoist should stay either
way.

The gate's floor is now the deck fixture's ~2.3s, of which ~1.8s is `wait`. Getting materially
below that means changing what the fixture asserts, not how it runs.
