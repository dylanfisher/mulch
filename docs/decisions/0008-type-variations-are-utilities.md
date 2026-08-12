# 0008. A type variation is one utility, not a handful of classes at the call site

- **Date:** 2026-08-12
- **Status:** accepted

## Context

Typography was assembled per call site out of Tailwind's atoms. Nine hand-written sites, and the
ones that meant the same thing had already drifted apart:

- Two uppercase micro-labels — the knob's caption and the gallery's specimen name — rendered as
  `text-[10px] leading-tight font-medium uppercase` and
  `text-[10px] tracking-widest font-medium uppercase`. Same intent, different tracking and
  leading, in two files nobody would open together.
- Two wordmarks, `text-2xl` and `text-sm`, with `font-semibold tracking-tight` written a third
  time inside `Logo` itself.
- The numeric readout was `font-mono tabular-nums` retyped at six sites, and at two sizes.
- `text-[10px]` was an arbitrary value at three of them, which the decision ladder in
  `docs/map.md` already bans for a type stack.

The convention existed — `docs/map.md` and `src/ui/tokens.css` both described the readout rule in
prose — and prose is the weakest single source of truth there is. It has no error message when a
site diverges from it, and `Specimen` had in fact broken it: the specimen _name_, a label with no
digits in it, was rendering in `font-mono`.

The atoms are individually fine. What makes them a drift machine is that size, weight, leading,
tracking and case have to move **together** to stay one system, and Tailwind gives you five
independent knobs and no reason to turn them at the same time.

## Decision

Type is expressed as one `@utility type-*` per variation in `src/ui/tokens.css`, and a `.tsx`
names exactly one of them:

```html
<div class="type-eyebrow text-muted-foreground">{label}</div>
```

Each utility carries the whole variation — size, weight, line height, letter spacing, case. A bare
`text-sm`, `font-medium`, `leading-tight` or `tracking-tight` at a call site is the thing this
decision exists to prevent; a sixth variation added here is not.

There are five, on four sizes. `sm` and `xs` are the two shadcn's own output already uses, so the
generated primitives sit on the same scale as everything around them without being touched.

**Colour is not part of a variation.** The same type is foreground in one place and
`text-muted-foreground` in the next, so it stays its own class — a `type-body-muted` twin of every
variation is the combinatorial explosion this is meant to avoid.

`Logo` carries no type of its own: the caller passes `type-display` or `type-title`, so the
wordmark's two sizes cannot drift in weight or tracking.

Every variation is mounted at `#/dev` under Type, for the reason every other primitive is: one
that cannot be seen beside its neighbours is one nobody can see drift.

## Alternatives considered

- **Leave the atoms and write the convention down harder** — rejected. It was already written
  down, in two files, and both micro-labels and the `font-mono` rule had drifted from it anyway. A
  rule with no failure mode is a suggestion.
- **A React `<Text variant="…">` component** — rejected. It only governs type where someone
  remembered to use it, it cannot style the `<h2>`, `<dl>` or `<output>` these sites actually need
  without a polymorphic `as` prop, and it would not reach the generated primitives at all. A CSS
  utility composes with any element and any other class.
- **A variation per size×colour (`type-body`, `type-body-muted`, …)** — rejected. It doubles the
  list to save one class, and the second axis would not stop at muted.
- **Fold the variations into `@theme` as `--text-*` steps** — rejected. That names sizes, which is
  the part that was never the problem. The drift was in the four properties travelling _with_ the
  size.
- **Restyle `src/ui/components` onto the utilities too** — rejected. It is regenerated
  (0003), so the edit is lost on the next `shadcn add`. Choosing `sm`/`xs` as our own two working
  sizes is what keeps the two sets coherent instead.

## Consequences

A call site says what a piece of text _is_, not how it is drawn, and the five variations are
greppable: `rg 'type-(display|title|body|eyebrow|readout)' src/` is every styled string in the
app. Changing the eyebrow's tracking is one line in `tokens.css`.

The knob's readout grew from 10px to 12px, joining the one readout size the rest of the app uses.
That was the point — it was a special case nobody had decided on.

The cost is real and worth naming: `type-*` is a project vocabulary a reader has to learn, and it
does not appear in Tailwind's documentation or in shadcn's output. The Type section at `#/dev` is
the answer to that, and it is why adding a variation without adding it there is not allowed.

Nothing enforces the ban on loose `text-*`/`tracking-*` in a `.tsx` yet — it is a review rule. If
it is broken twice, the third time should buy a lint rule rather than another line of prose.
