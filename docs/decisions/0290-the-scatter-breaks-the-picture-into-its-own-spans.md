# 0290 — The scatter breaks the picture into its own spans

- **Date:** 2026-09-02
- **Status:** accepted, standing on [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (a look
  is declared on the entry and the chain draws it) and inside
  [0269](0269-the-rack-scatter-shatters-the-field.md)'s rule rather than amending it — a broken piece
  is a draw of the field and never a fill over it. The last look term of the block that
  [0280](0280-a-room-blooms-the-picture.md) through [0289](0289-a-shift-doubles-the-picture.md) landed
  one pass at a time.

**The shatter's second term is the Span, and it is how big a piece the field comes apart into.**
`SHATTER_BANDS` was eight, written down; it is now a count read off the scatter's own Span
(`shatterBands`, src/lib/moireGeometry.ts) and declared as `size` on the entry beside the share the
Odds already state. A window's length is how long a piece of what was heard the stage holds, so it is
how long a piece of the picture the field is read back out of order in — a shut span breaks the
picture into eighths, an open one into halves, and the count steps to a whole number because a piece
is a band of slices and there is no half of one. Both terms travel on `SHAPE_SECS` like every other,
and two scatters break one field into pieces of one size: the size is a presence-weighted mean
(`looksShatterSize`, src/ui/moireLooks.ts), the share is the sum — how _many_ pieces break is what a
second instance adds, not how big they are.

**Halves at the open end, and not the whole picture.** The plan said "in eighths to whole". A count
of one cannot be drawn: the walk displaces a piece by a fraction of the picture's own width and wraps
it, so the one piece that is the whole width is drawn from itself and the pass vanishes at one end of
its own band. Two is the fewest pieces a break can be seen between, so the band is `[8 … 2]` and the
open end of the Span is halves.

**The walk's stride is chosen per count, not written down.** Three was coprime with eight; it is not
coprime with six. The stride is now the longest step no further than half the picture that shares no
divisor with the count (`shatterStride`), which keeps the walk a permutation at every count — every
piece drawn from a different distance along the width and no two from the same. At eight it is still
three, so a shut span draws exactly the picture it drew before this step. Where a count admits no
step but one (four and six), neighbouring pieces do break by neighbouring amounts; that is what those
counts are, and it is a smaller price than a walk that drew two pieces from one place.

**And the count is held under the ceiling in whole pieces.** `SHATTER_CEILING` is half; a rounded
count would spend more than half the picture at every count a half does not divide (three of five),
so the pieces drawn from elsewhere are the rounded share or the floor of half the count, whichever is
fewer. 0250's bound is a bound.

**A look is now required at load.** 0279 left `look` optional with a stated reason: a look cannot be
named before the maths that draws it exists, and the passes were landing one a step. They have all
landed. `look` is required on the entry (src/audio/effects/contract.ts) and the registry throws
`effect declares no look` for one that arrives without — the shape the type cannot see, which is a
plugin written by hand. An effect added tomorrow declares its whole-field move or it is an effect a
glance at the picture cannot find.

**A coarse count cannot honour a fine share, and answers nothing rather than too much.** At the open
end of the Span the picture is two pieces, so the only breakable amount is a half of it: a rack whose
share asks for a fifth of the picture breaks nothing there, where at the shut end the same share
breaks one eighth. That is 0269's rule meeting 0250's bound — a piece is drawn whole or not at all,
and half the picture is the most that may come from elsewhere — and not a floor missing from
`shatterPieces`. It is written down here because it is the one thing a hand can find by turning two
knobs: a scatter or two standing, the Span opened, and the break goes rather than growing.

**What the picture says, on the thirty-two-pixel strip of a yard holding six scatters** — the count
this reading's own band is stated across, gated and odds all the way in, so the share stands at one
(`RACK_SHATTER_BAND`, src/lib/moireSound.ts); a yard holding one scatter breaks nothing at any span
and is no fixture for this. Shot twice per span and interleaved shut/open/shut/open: the shut span
reads a mean ink of 0.418 and 0.417 at swings of 0.007 and 0.011, the open one 0.421 and 0.419 at
0.009 and 0.007. **The pieces read as pieces of the field at both** — the 1:1 crop is a cut and
re-laid picture either way, in many short runs at the shut end and in a few long ones at the open
end. No flash: the mean sits inside a two-hundredth across all four runs and the swing never leaves
the band the strip already holds. The shot cannot isolate the term, and says so: Span is also this
entry's `period`, so opening it moves the scatter's own row as well as the piece size, and what the
count does on its own is proved at the cut instead — the painter's own case draws fewer and bigger
pieces at an open span, of the same field and with no fill over it.
