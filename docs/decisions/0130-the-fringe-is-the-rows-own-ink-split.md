# 0130 — The fringe is the row's own ink, split three ways

- **Date:** 2026-08-22
- **Status:** accepted

The loudest thing in the reference is colour: the monitor's red, green and blue pulled apart at
every edge, which is what turns a soft shape into a lattice of coloured blobs.
[0126](0126-the-screen-rides-the-pictures-own-phase.md) left it out because a painter cannot draw
it without colours, and no colour literal lives outside `src/ui/tokens.css`
([docs/boundaries.md](../boundaries.md)). **This is the third crossing of that boundary, after the
favicon ([0006](0006-favicon-colour.md)) and the render's diagnostic PNG
([0015](0015-render-png-colours.md)), and it crosses inward.** The three colours are written in
`tokens.css` with every other colour. What is new is that `src/ui/moireScreen.ts` names three
tokens rather than being handed one resolved string.

**A subpixel is not a tint and not a filter.** It carries the picture's own amount of one channel
and none of the other two, which is why a monitor showing orange has its blue subpixels dark and
why the three add back up to the colour that was sent. So each third of a cell boosts the row's ink
in its own channel by as much as it takes out of the other two, and the cell as a whole comes back
to the row's colour. What changes is that every edge in the picture now lands on one channel before
the others, and that is the fringe. Both cheaper readings were tried and neither is a fringe:
filtering the row through a pale tint can only subtract, which on a saturated ink leaves a
brightness comb and no colour; adding a shallow amount of all three shifts the whole picture's hue
evenly — orange to yellow — which is one tint where a fringe should be.

That is the answer to what the fringe is relative to the token the row is drawn in: the row's ink
still governs the colour, and the tokens say only which channel a third of the cell is and how pure
that channel is. It is why they are saturated — a pale one carries no hue to be pure in.

**A custom property has to be registered or the painter never sees a colour at all.** An
unregistered one computes to its own unresolved token stream, so `light-dark(…)` would reach
`fillStyle` as text, which the canvas discards without a word — a silent fallback (principle 5)
that would paint the whole screen black. The three are declared `@property` with `syntax:
"<color>"`, which is what makes the scheme resolve before the painter reads them.

The painter never parses one. It fills a pixel with each and reads it back, because any colour a
token can hold is a colour the canvas already knows how to lay down, and a painter with its own
colour parser would be a second reading of the theme. Both that and `getComputedStyle` happen on
the tile's rebuild, alongside the pass over its pixels ([0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md)) —
never per frame, which is the style flush
[0070](0070-a-per-frame-read-refills-and-never-clears.md) exists to keep out. The only thing that
moves the three is the scheme, which moves the row's colour with it, so the colour the tile is
already keyed on catches them.
