# 0001. React + Vite, with a registry-driven audio layer under enforced tiers

- **Date:** 2026-08-12
- **Status:** accepted

## Context

mulch is a rewrite of Loop Loop Loop, a browser audio-looping instrument that reached ~43k lines of
`src/` before becoming hard to change. Its post-mortem (`NEW_APP_GUIDE.md`) diagnoses one root
cause: **every new parameter had to be hand-written into about eight places** — type union, default,
React state setter, engine setter, UI knob, automation param union, session serializer, and a second
signal chain used only by offline export. Twelve sequential "continue refactor" commits still left
four files over 2000 lines. The old stack itself was not the problem; the absent seams were.

## Decision

Keep the stack that worked — TypeScript strict, React 19, Vite, Vitest — on pnpm and Node 24, and
add Tailwind v4 with shadcn/ui on Base UI for the interface. Spend the scaffolding effort on the
seams instead:

- Six tiers (`lib → audio → workers → state → ui/components → ui`) with the dependency direction
  enforced by `scripts/arch` as a step of `./scripts/check`, not merely described in prose.
- A parameter registry, a single `buildDeckChain(BaseAudioContext)` shared by live and offline
  render, and an effect registry — all three written into AGENTS.md as boundaries before any audio
  code exists, so the first parameter obeys them.
- Session state in Zustand, outside the React tree, with per-frame values kept in refs.

## Alternatives considered

- **Next.js or another full-stack framework** — rejected. mulch is entirely client-side; SSR,
  routing and a server runtime are cost with no payoff, and they complicate Web Audio's
  browser-only lifecycle.
- **Svelte or vanilla TS** — rejected. The post-mortem's problems were architectural, not React's;
  changing framework would discard working knowledge while leaving the real cause untouched.
- **Documenting tier boundaries in `docs/map.md` alone** — rejected. An unenforced dependency rule
  is one that has already been broken somewhere nobody has looked. Forty lines of `scripts/arch`
  buys the guarantee.
- **`eslint-plugin-import`'s `no-restricted-paths` or dependency-cruiser** — rejected for now: two
  more dependencies and a resolver to configure, to express a six-row table that a small script
  reads directly.
- **npm** — workable, but pnpm's stricter resolution suits a project that will grow workers, WASM
  artifacts and a lazily-loaded ffmpeg.

## Consequences

Adding a parameter or an effect should stay a one-line diff plus one small file; if it ever costs
more, that is the signal to fix the abstraction rather than the caller. The arch step will
occasionally reject a convenient import — that rejection is the point, and the fix is to move the
code, not to widen the table. The tier table now exists twice, in `docs/map.md` and in
`scripts/arch`; they must change in the same commit, and the `map` step of `./scripts/check`
catches a path that stops existing but not a permission that drifts.

Deferred deliberately: automation lanes, MIDI, WASM, and the rest of the "defer until the core is
boring" list in the post-mortem. Revisit this record if mulch ever needs a server — the no-secrets,
no-`op run` shape of `./scripts/dev` and CI assumes it never will.
