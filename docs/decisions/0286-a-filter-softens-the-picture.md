# 0286 — A filter softens the picture

- **Date:** 2026-09-02
- **Status:** superseded by [0322](0322-an-eq-band-has-a-shape-and-the-filter-goes.md), which took
  the filter entry out of the registry and the `soften` look with it — a low-pass is `eq.shape` now,
  and this record describes maths nothing declares. It stood on [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (a look
  is declared on the entry and the chain draws it) beside
  [0280](0280-a-room-blooms-the-picture.md), [0281](0281-a-crusher-blocks-the-picture.md),
  [0282](0282-a-delay-repeats-the-picture.md), [0283](0283-a-pop-sharpens-the-picture.md) and
  [0285](0285-a-tape-wobbles-the-picture.md), and inside the per-frame line
  [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md) draws — no pixel loop on a
  frame, no read-back, and no `ctx.filter`

**Filter's look is the soften, and it is the sixth to take a slot in the chain.** The field redrawn
from a copy of itself too small to hold what was in it, and nothing else: `LOOKS.soften` says
`at: "pass"` and carries the two draws it is (src/lib/moireLook.ts), and the filter entry maps its
Cutoff into `radius`. The whole of what tells it from the bloom is the draw that is **not** there —
the halo lays its blurred copy back over the picture and keeps the original underneath it (0280),
and this one has no original under it at all, so the fine detail does not come back.

**The band closes at the field itself, which no other pass's does.** The soften's one term is the
knob the entry's own presence is already read off (`presence: { param: "filter.cutoff", silent:
20_000 }`, 0202), so at the open end of the knob two numbers say the same thing: the presence is
nought and the working size is one. Every other look's band is stated between two shares of the
picture and leaves the presence to say when it is absent; this one says it twice on purpose, because
a filter standing open is a wire and a band that still blurred by half there would be a look
disagreeing with its own entry about whether the effect is in the picture.

**The presence walks the working size and not an alpha, which is the blocks' answer and not the
bloom's** (0281, 0283). This pass lays nothing over the picture and has no share to weigh — the
plan's draw is `source-over` at one — so what a travelling presence moves is the size of the copy
itself, out from the field's own size toward the band's shut end. A filter arriving dissolves the
picture out of focus over the wind's seconds rather than crossfading two pictures, and one the
picture has not travelled to yet is the field at the whole of itself. It is the one pass that weighs
no share, so it uses no `weighed` (0283) and takes nothing from it.

**src/lib/moireLook.ts split at the hard cap, and what left it is the tile and not a draw.** The
file stood at 734 lines of 800. 0285 expected the look _after_ next to split it and it was the next
one, which is this record amending that sentence and nothing else in it. The draws stay
beside the declarations they belong to — that is what the file's own waiver is for, and half a look
in a second file is the thing it refuses — so what moved is the one thing in there that is not a
draw at all: the wobble's noise tile, its four numbers and its seed, into src/lib/moireGrain.ts, by
exact analogy with the other tile the picture bakes once (`latticeTile`, src/lib/moireLattice.ts).
How hard the grain bites stayed where the terms are, and the tiers row in docs/map.md that named the
tile now names its file. What did leave a declaration is the blur itself: the small copy taken and
put straight back up is the one draw the bloom, the sharpen and this pass make in common, and the
third of them is what makes it a helper (`blurred`, principle 3, and `weighed`'s own reason).

**What the picture says, at the zoomed 1:1 crop of a yard holding filter alone.** Against the same
rack at `BASE`, interleaved and twice each: the edge energy reads 0.0535 against 0.0649 — a sixth of
the structure gone — at a whole-field alpha of 0.3608 against 0.3595, which is the picture softened
and not dimmed, and is the question the pass is asked at the crop. Two filters read as more of it
than one (0.0472 against one's 0.0535, where `BASE`'s two read 0.0608). Rack order is legible at the
crop as well as in the numbers: `[filter, crush]` came back at 0.6073/0.0435 with its cells
hard-edged — blocks laid over a softened field — against `[crush, filter]`'s 0.5999/0.0429, whose
cell edges are themselves dissolved. On the thirty-two-pixel strip the pass all but vanishes under
its own scale, which the plan allows: 0.396 and 0.396 at swings of 0.037 and 0.034 against `BASE`'s
0.396 and 0.395 at 0.032 and 0.030 — no flash, no alias, and the mean where it was.
