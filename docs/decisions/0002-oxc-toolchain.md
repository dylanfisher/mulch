# 0002. oxlint + oxfmt and the native TypeScript compiler, instead of ESLint and Prettier

- **Date:** 2026-08-12
- **Status:** accepted

## Context

TypeScript 7.0 is the compiler rewritten in Go, and it type-checks this project cleanly. But
typescript-eslint 8.67 — the current release, with no v9 published — refuses to load against it:

```
Error: typescript-eslint does not support TS 7.0.
```

Its peer range is `typescript: >=4.8.4 <6.1.0`, and TS 7 support is still open upstream
(typescript-eslint#10940). Since `lint` is a step of `./scripts/check`, that made ESLint and the
native compiler mutually exclusive: keeping typescript-eslint meant pinning TypeScript back to
6.0.3, the last JS-based release.

The escape hatch Microsoft documents — run TS 6 side by side for the linter, TS 7 for compilation —
was tested and does work, but it installs two compilers and leaves the editor type-checking against
a different one than CI does.

## Decision

Drop ESLint, typescript-eslint and Prettier. Lint with **oxlint** and format with **oxfmt**, and
run **TypeScript 7** as the only compiler.

The piece that makes this work is `oxlint-tsgolint`, which implements type-aware lint rules on top
of typescript-go — the same engine as `tsc`. Verified before committing: with
`options.typeAware`, oxlint reports `no-floating-promises` on a real floating promise, so the rules
that need type information genuinely run. Its `--type-check` flag can surface compiler diagnostics
too, but it is marked experimental, so `tsc --noEmit` stays the authority for types and the `lint`
step sticks to lint.

Configuration lives in `.oxlintrc.json` and `.oxfmtrc.json`; there is no ESLint or Prettier config
left in the repo, and AGENTS.md says not to reintroduce either.

## Alternatives considered

- **TypeScript 6.0.3 with ESLint** — rejected. It works today and is the conservative option, but
  it means starting a brand-new project on the outgoing compiler to keep a linter we are not
  attached to.
- **TS 7 for `tsc`, TS 6 alongside for typescript-eslint** — tested and working, but two compilers
  and a divergence between what the editor checks and what CI enforces, for a shape we would have
  to unwind later anyway.
- **TS 7 with ESLint's untyped rules only** — rejected. That drops `no-floating-promises`,
  `no-misused-promises` and the `no-unsafe-*` family, which is the wrong trade for an app whose
  audio setup is full of async graph work.
- **Biome** — a credible single-tool alternative covering both lint and format, but its type-aware
  story does not run on typescript-go, which is the specific thing that unblocks TS 7 here.

## Consequences

One toolchain, all native: Rust for lint and format, Go for types, and lint and `tsc` agree about
types because they share an engine. CI needs no Rust or Go toolchain — every binary arrives
prebuilt through pnpm.

What we give up:

- **Tailwind class sorting.** `prettier-plugin-tailwindcss` has no oxc equivalent, and no oxlint
  rule covers class order. Utility order is now unenforced. Revisit if it starts causing churn.
- **The React Compiler lint rules.** `eslint-plugin-react-hooks` v7 ships `immutability`,
  `use-memo`, `static-components` and `preserve-manual-memoization`; oxlint has the two classic
  rules, `rules-of-hooks` and `exhaustive-deps`, and not the compiler-derived set.
- **Plugin breadth.** ESLint's ecosystem is far larger. A rule we want later may simply not exist,
  and the answer will be to do without rather than to reinstall ESLint beside oxlint.

`oxfmt` is pre-1.0 (0.63.0), so formatting output may shift between releases; a version bump could
produce a large diff. Revisit this record when typescript-eslint ships TS ≥7.1 support — not to
reverse it, but because the reason for urgency will be gone.
