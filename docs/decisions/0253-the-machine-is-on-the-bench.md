# 0253 — The machine is on the bench

- **Date:** 2026-09-01
- **Status:** accepted, extending [0247](0247-a-sketch-is-drawn-in-the-real-tokens-and-thrown-away.md) and resting on [0236](0236-the-colour-boundary-is-a-gate-rule.md)

**The instrument is named for a machine and nothing on the bench was one.** Two whole surfaces now
are, and they disagree about which end of it a hand works from. `SketchChipper` — "Feed The Hopper"
— lays the card out as the machine top to bottom: the planted grounds dropped in the hopper, the
six characters as a drum of blades whose size is their weight, the walk thrown out of the side as
mulch, the arrangement queued at the mouth and the timing as drum speed. `SketchChips` — "Read The
Pile" — is the same machine from the output end only: no hopper, no drum, just a heap of chips, each
one a landing sized by how long it holds and filled by which character cut it, pushed about by
sorts rather than set by numbers.

**The layout is the argument, so the metaphor's direction is the trade.** The chipper runs one way —
source, character, walk — which is exactly what makes it readable and exactly what it cannot do: a
part that changes the ground it was drawn from has nowhere to be drawn. The pile trades the other
half: order, repeats and rests are invisible in a heap, so the whole of How It Is Timed has no
surface on it. Both trades are written on the entry rather than discovered from the picture.

**0252's naming rule reaches every blade and every planted spot.** A blade draws its own name and
weight at a fixed radius outside the sharpest reach, so honing a blade never moves its label and
never puts one under a wedge; the grounds name themselves inside the hopper; each wood in the pile
names itself where its own chips are, and the sorts are named for the character and not for the knob
behind them. `SketchPage.test.tsx` slices each machine's own markup by `data-machine` and asserts
it, the way the cast's case slices by `data-blend` — a picture that ships unlabelled fails rather
than passes on its neighbours.

**A number beside a name is a share, and a pile is bounded by the box it is drawn in.** Two things
the naming rule forces once a surface is a gesture rather than a picture. The drum draws the six
through `CornerName`, where a number beside a name has meant a share of one since 0252, so the
blades are normalised for the readout while the geometry stays each blade's own reach — how sharp
is the shape, how much is the number — and a blade may not be honed below `BLADE_FLOOR`, because
six blades at nothing is the one place a blend cannot stand. The pile's sorts are unbounded
gestures, so the heap caps its own depth (`LAYERS`) and the box's height is derived from that cap
rather than chosen: `sketchPile.ts` holds the arithmetic and `sketchPile.test.ts` pins it, because
a chip or a name pushed out through an `overflow-hidden` edge is the naming rule failing silently
at settings the surface's only two controls reach.

**One hue, and the drum is not brown.** 0236 gives the instrument a single hue, and a chipper drawn
in a wood colour would be a mock of a palette rather than an argument about a layout, so both are
drawn in weight and geometry alone: opacity on the one accent in the chipper's SVG, and
`SKETCH_CHARACTER_WEIGHT` — already the bench's single answer to "how does a character read as a
fill" — in the pile.
