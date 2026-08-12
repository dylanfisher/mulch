# 0003. Relax a fixed set of lint rules inside `src/ui/components`

- **Date:** 2026-08-12
- **Status:** accepted

## Context

`src/ui/components` is generated, not written: `pnpm shadcn add <name>` drops a file in and
[docs/map.md](../map.md) says so. The first real batch of primitives — button, card, select,
field, toggle-group and the rest — arrived failing `./scripts/check`, on rules that are correct
for our own code and wrong for a generic wrapper:

- `jsx-a11y/label-has-associated-control` on `Label`, which is a reusable wrapper and cannot know
  its control at definition time.
- `jsx-a11y/prefer-tag-over-role` on `Field`'s `role="group"`.
- `react-perf/jsx-no-new-function-as-prop`, `react/no-array-index-key`,
  `typescript/no-unsafe-type-assertion`, `strict-boolean-expressions`,
  `prefer-nullish-coalescing`, `no-unnecessary-condition` and `eqeqeq` across several files.

Every one of them would come back on the next `shadcn add`, and would come back edited away on the
next `shadcn diff`.

## Decision

Turn that fixed list of rules off for `src/ui/components/**` only, via an override in
`.oxlintrc.json` that names this file. The rest of `src/` — including everything that consumes
these primitives — keeps the full rule set.

One rule is off repo-wide instead, and deliberately: `react-perf/jsx-no-jsx-as-prop`. Base UI's
composition API is `render={<Button />}`, so every consumer of a trigger writes JSX as a prop —
`src/ui/dev/OverlaysSection.tsx` alone does it five times. The rule is incompatible with the
library we chose, not with the way the directory is generated, so scoping it to
`src/ui/components/**` would only fail the gate on correct calling code.

## Alternatives considered

- **Hand-fix each generated file** — rejected. It makes the directory no longer regenerable,
  which is the one property that makes shadcn worth using. The edits would be re-applied by hand
  after every upgrade, forever, and silently lost when someone forgets.
- **Relax the rules repo-wide** — rejected. These rules earn their keep in code we write; the
  a11y ones especially. Losing them everywhere to accommodate a vendored directory is the wrong
  trade.
- **Add `oxlint-disable` comments to the generated files** — rejected for the same reason as
  hand-fixing, and it puts the exception in the file most likely to be overwritten rather than in
  the config, where it is reviewable in one place.

## Consequences

A generic primitive that needs one of these rules enforced will not get it — so anything with real
project knowledge belongs in `src/ui`, not here, which is already the promotion rule in
[docs/map.md](../map.md). The directory holds generated components only: a hand-written one would be
invisible to `./scripts/map`, which exempts it from the `@role` check for the same regeneration
reason, and silently exempt from the rules above. Write it in `src/ui` instead — the wrapper case
is rule 8 in map.md.

The list is closed on purpose. A new generated component that trips a rule not on it fails the gate
and forces a look, rather than quietly widening the exemption.
