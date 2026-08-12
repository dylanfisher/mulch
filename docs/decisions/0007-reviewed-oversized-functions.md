# 0007. Oversized functions are waived one at a time, in the file, with a reason

- **Date:** 2026-08-12
- **Status:** accepted

## Context

`max-lines-per-function` (50) and `import/max-dependencies` (10) are size rules: they proxy
complexity by counting. The proxy holds for logic and breaks for JSX, where markup adds lines
without adding a branch. The first UI batch tripped them nine times:

- Five gallery sections in `src/ui/dev/`, 67–102 lines each. Every one is a flat list of
  specimens with no conditionals in it; the count tracks how many primitives are on show.
- `src/ui/dev/DevPage.tsx`, 11 imports — six of them the six sections it exists to mount.
- `src/ui/AsyncButton.tsx`, 59 lines, nine of them the destructured prop list and its type.
- `src/ui/Knob.tsx`, 147 lines.

`Knob` was the one worth acting on, and it was: the dial's SVG moved to a `Dial` sub-component
beside the `polar`/`arc` helpers it uses, and the inline prop annotation became a named
`KnobProps`. That is 109 lines — still over. What is left is one control's gesture set: pointer
capture, fine drag, keyboard steps, double-click reset. Reaching 50 from there means
`useKnobDrag` + `useKnobKeys`, each taking six or seven arguments threaded from the component and
handing handlers back, each with exactly one caller — more code than it removes, and the premature
abstraction principle 3 exists to prevent.

## Decision

Both rules stay on, at their current caps, everywhere. A function that has been read and judged
acceptable is waived where it lives:

```ts
// A section is a flat list of specimens, not branching logic: the line count tracks how many
// primitives are on show. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function ButtonsSection() {
```

The comment above the pragma is the point of it — it records the judgment, and it is the thing a
reviewer argues with. A bare `oxlint-disable-next-line` with no reason is not the convention.
File-scoped rules take the file-level form (`// oxlint-disable max-dependencies`) at the top,
which is what `src/ui/Knob.tsx` already does for `jsx-a11y/prefer-tag-over-role`.

## Alternatives considered

- **Turn the rules off for `src/ui/**` or `src/ui/dev/**`** — rejected. It is the same waiver,
  granted in advance to files that do not exist yet and were never looked at. The next oversized
  component gets in silently, which is precisely what happened to the rule's value. An override
  also cannot say _why_ any particular file is over, and 0003's override earns its place on a
  property of the whole directory — it is regenerated — that `src/ui` does not have.
- **Raise the caps** — rejected for the same reason, and worse: it moves the line for logic-bearing
  code too, where the proxy was working.
- **Split the gallery sections anyway** — rejected. The sub-functions would exist to satisfy a
  count, be called once each, and make the list of specimens harder to read than the list is.

## Consequences

The waiver is per-site and greppable: `rg 'oxlint-disable.*max-' src/` is every function the
project has agreed is over, with its reason on the line above. That list getting long is a signal
the cap is wrong; a review can act on it, which it cannot do against a directory-wide override.

`./scripts/check` stays clean, so a genuinely oversized new function is a warning someone has to
answer for — by splitting it, or by writing down why not.
