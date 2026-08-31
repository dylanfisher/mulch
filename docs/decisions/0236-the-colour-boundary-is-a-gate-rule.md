# 0236 — The colour boundary is a gate rule

`scripts/arch` fails on a colour literal written anywhere under `src/` except `src/ui/tokens.css`
and `src/app/render.ts` — a hex, an `rgb()`/`hsl()`/`oklch()`/`lab()` call, in a stylesheet or in a
TypeScript string, which is where a Tailwind arbitrary value lives. Comments are cut out first: a
paragraph naming the ink a token resolves to is prose about the boundary, not a crossing of it, and
a `color-mix()` of two tokens is a derivation from them and carries no literal of its own.

The boundary itself is older than this rule ([boundaries.md](../boundaries.md)) and its two reviewed
exceptions are unchanged — the favicon ([0006](0006-favicon-colour.md)), which is not under `src/`
and so is never reached, and the offline render's diagnostic PNG
([0015](0015-render-png-colours.md)), which is named in the script. A third still needs its own
decision record; it now also needs a line in `scripts/arch`, which is the point.

P175 read all 388 files of `src/` by territory and its two `src/ui` lenses swept the whole 186 of
them for exactly this by hand, finding nothing. That is the reason the rule exists rather than an
argument against it: an invariant that holds only because two agents checked it once has a re-entry
date, and the whole of what makes this one durable is that the gate now refuses the next one
([0044](0044-the-map-holds-the-tier-table-and-arch-reads-it.md)). Both named files are asserted present, so a rename cannot
switch the rule off in silence.
