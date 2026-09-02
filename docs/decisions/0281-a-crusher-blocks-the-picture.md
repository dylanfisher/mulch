# 0281 — A crusher blocks the picture

- **Date:** 2026-09-02
- **Status:** accepted, standing on [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (a look
  is declared on the entry and the chain draws it) beside
  [0280](0280-a-room-blooms-the-picture.md), and inside the per-frame line
  [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md) draws — no pixel loop, no
  read-back, and no `ctx.filter`

**Crush's look is the blocks, and it is the second to take a slot in the chain.** The field onto a
grid of flat cells and back up over itself: `LOOKS.blocks` says `at: "pass"` and carries the one draw
it is (src/lib/moireLook.ts), and the crush entry maps its own Rate into `block` and its own Bits
into `levels`, both turns of their own ranges. So a coarse hold is a coarse picture and a shallow
depth is a hard one, which is the two things a crusher does to a sound said in the one glance.

**The block is whole pixels, and that is what tells it from the bloom.** The halo is stated in shares
of the field (0280) because a blur _is_ its working size; a grid is only a grid on whole pixels, so
`BLOCK_PIXELS` is a band in the field's own pixels and `blockSize` rounds into it. The draw keeps
that: it takes enough cells to cover the field and lays them back at exactly the block a cell, so the
last one runs off the edge rather than every one of them landing on a fraction — a grid scaled to fit
the width would have thrown the whole-pixel step away at the one place it is spent. A block of one is
the field itself, which is what an absent crush and a crush the picture has not travelled to both
draw; the walk up from one is the pass arriving over the wind's seconds rather than between two
frames.

**And they are device pixels, which is the price of the grid and is paid knowingly.** The same Rate
draws a physically smaller cell on a denser display, and on the thirty-two-pixel strip the coarse end
of the band is a handful of cells rather than a mosaic — which is the strip losing a pass under its
own scale, the one thing the plan says a pass may do there. The alternative is the bloom's: a share
of the field, which is scale-invariant and lands on fractions of a pixel at every scale. A halo may;
a grid may not.

**The hardening is capped at three, not at the fifteen bits the range can lose.** A lost bit is one
`destination-in` of the surface against itself, which pushes every half-covered pixel toward nothing
and leaves a covered one where it is. Past three composites the thin rows are simply gone, and a
picture of a crush that has eaten the picture says nothing about the crush. **The count is whole, so
the hardening arrives in three steps where everything else eases**: half a `destination-in` is not a
draw, and the fold's answer — two whole counts crossfaded — cannot be borrowed, because a composite
at less than one alpha erases the picture by the remainder instead of blending toward it. Three steps
across the whole travel of a knob nobody turns instantly, against the block size's twenty-four.

**The chain resets smoothing, because this is the first pass that turns it off.** `passLooks` already
put the transform, the composite and the alpha back before every pass; it now puts
`imageSmoothingEnabled` back too. The chain has two surfaces and hands each slot whichever one its
own place lands on, so a rack of `[crush, crush, reverb]` puts the bloom back on the surface the
first crush unsmoothed — a halo drawn nearest-neighbour, two slots after the pass that asked for it.
A pass says what it wants and never what the next one wants.

**A crushed picture reads more solid, where a bloomed one reads paler, and both are the hole mask.**
More field alpha is more ink taken out of the screen, so hardening the mask takes _less_ ink out: on
the strip a crush at its own defaults moved the mean from 0.225 to 0.557 and the swing from 0.009 to
0.225 — an order of magnitude more structure, and cells the eye reads as cells. Rack order is legible
in the same numbers: `[crush, reverb]` came back at a swing of 0.040 and `[reverb, crush]` at 0.197,
because a bloom after the blocks blurs them and blocks after the bloom pixelate it. That is the
chain the picture was for.
