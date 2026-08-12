# 0006. The favicon carries the only colour literals outside `src/ui/tokens.css`

- **Date:** 2026-08-12
- **Status:** accepted

## Context

AGENTS.md states a boundary with no exceptions: **no colour literal outside `src/ui/tokens.css`**.
`public/favicon.svg` cannot honour it. The browser fetches a favicon as a standalone document,
outside the app's stylesheet and outside Tailwind's build, so it can read neither `--primary` nor
anything else the token layer defines. Some colour has to be written into the file.

The first version wrote one: the dark-mode half of `--primary`. That is wrong against a light tab
strip half the time, and the file said the two were "in step" while they were not.

## Decision

`public/favicon.svg` may hold colour literals, and it is the only file that may. It carries **both**
branches of `--primary` — the light value as the default, the dark one under
`@media (prefers-color-scheme: dark)` in an inline `<style>` — so the mark tracks the same token the
app does. `src/ui/tokens.css` remains the source of truth; the favicon is a copy that must be
updated with it.

## Alternatives considered

- **Keep a single literal** — rejected. It is off-brand in one theme, always, and pretending
  otherwise is what the previous comment did.
- **Generate the SVG from the tokens at build time** — rejected for now. It buys a real guarantee,
  but the cost is a build step and a parser for `light-dark()` to keep one file's two values honest.
  Revisit if the palette starts moving, or if a second asset outside the CSS pipeline appears.
- **A PNG favicon set** — rejected. Same duplication with none of the theme-awareness, plus binary
  assets that no review can read.
- **Drop the favicon** — rejected. The default document icon is worse than a mark that is right in
  both themes.

## Consequences

Changing `--primary` in `src/ui/tokens.css` now requires changing two literals in
`public/favicon.svg`, and nothing fails if you forget — the check suite cannot see inside an SVG the
app never imports. That is the accepted cost, and the reason the alternative above is written down
rather than dismissed. Safari ignores SVG favicons and falls back to the default icon; the light
value is the default branch, so browsers without `prefers-color-scheme` support still get the right
one on a light tab strip.
