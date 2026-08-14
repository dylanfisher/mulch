# 0015. The offline render's PNG carries the colour boundary's second reviewed exception

- **Date:** 2026-08-14
- **Status:** accepted

## Context

The boundary says **no colour literal outside `src/ui/tokens.css`**, with
[0006](0006-favicon-colour.md) as the one reviewed exception — an asset, not code. 0006 also said
to revisit if a second consumer outside the CSS pipeline appeared. It has: `src/app/render.ts`
draws the offline render's diagnostic waveform PNG on an `OffscreenCanvas`, in two grey literals
(`PNG_BACKGROUND`, `PNG_TRACE`). Until now the file exempted itself with an inline comment, which
is exactly what a reviewed-exception mechanism exists to prevent — 0006's own history shows why.

Resolving the greys from the token layer is not a one-liner: the tokens are `light-dark()`
values, which `getComputedStyle` returns unresolved for custom properties, so honouring the
boundary in code means parsing CSS. More decisively, the PNG is a diagnostic artifact agents and
goldens compare across machines and sessions — plan §3. Two renders must be comparable, so the
image must be drawn in the _same_ two values everywhere, always. A themed colour is the opposite
of what this image needs.

## Decision

`src/app/render.ts` may hold the PNG's two grey literals, and it is the only _code_ that may
hold a colour literal. The exception list is now exactly two: `public/favicon.svg` (0006) and
this file. The boundary in [boundaries.md](../boundaries.md) names both. The greys are fixed
values, deliberately untied to the palette: if `--background` moves, the PNG does not — its
job is to look identical to yesterday's PNG.

## Alternatives considered

- **Resolve the tokens at render time** — rejected. It costs a `light-dark()` parser, and it is
  wrong on the merits: a comparison artifact must not change when the theme does.
- **Keep the self-exempting comment** — rejected. An inline comment is a claim nobody reviewed;
  the boundary's exception count is part of the rule.
- **Generate the PNG greyscale-only from numbers, no CSS-syntax colours** — rejected as a dodge:
  `"#0a0a0a"` and `rgb(10,10,10)` are the same literal wearing different clothes.

## Consequences

A third colour literal outside `tokens.css` still has no home: it needs its own decision, or a
token. The two greys in `render.ts` are not kept in step with the palette on purpose, and the
comment on them now says so by citing this record instead of arguing its own case.
