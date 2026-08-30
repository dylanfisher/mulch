# 0213 — A reading of the output belongs to the field

- **Date:** 2026-08-30
- **Status:** accepted, extending
  [0128](0128-every-motion-in-the-screen-belongs-to-a-parameter.md) and
  [0145](0145-a-picture-may-rest-on-analysis.md)

A yard that has been smeared looked much like a yard that had not. Every motion in the picture was
a knob position or one instance's own meter, so reverb, delay and saturation — the whole point of
the rack — left the drift exactly as they found it.

**What "washed" is, measurably, is the crest of the output window**: its peak over its RMS, which
falls as the gaps between the transients are filled (`crestFactor`, src/lib/peaks.ts). It is read
off the analyser already hanging off the pan for `level()`, on the same window, so it costs one more
allocation-free read on a node that is already there. The deck's own end rather than the master bus
because the picture is a yard's; the master's taps in `src/audio/context.ts` are where this would
live if the picture were ever the session's. Silence is not a wash: a window with nothing in it has
no crest, which is the sentinel `BeatAnalysis.crest` already uses for "measured nothing", and it
draws the picture that was drawn before there was an output to hear.

**The reading belongs to the field and to no row.** 0128 amended lets a reading move exactly one
thing — how deep the row of the instance it was read from cuts — because that reading is one item's
own meter. An output has no item to belong to. So it is not written onto a row, not keyed by
anything and not a dimension: `refillRows` answers it rather than filing it, and the paint spends it
over every row at once.

**What it does is what a wash looks like: the rows stop being separable.** Depth and disperse rise
together, each by the same share of what it had left (`DRIFT_WASH_SHARE`), so the deepest and the
shallowest close on each other. Up rather than down, which is the opposite of every other reading in
the picture and is the reason this one may not belong to a row: a reading that deepened one row
would be a knob position nobody turned, where one that deepens all of them at once is the field
being less separable than it was.

**And one broad row is laid over the whole field at the loop's own period**, at the coarse end of
the band every row is drawn in (`DRIFT_BROADEST_PITCH`) — a larger moiré over the small ones, which
is a picture blending rather than a picture with one more thing in it. It is cut at nothing until
the yard is washed, so a dry yard draws exactly the picture it drew before; it carries no read of
its own, because what moves it is the field's; and it counts among the gratings the picture's ink is
shared out over **as the share of one the wash has made of it** — counted whole, a dry picture would
weigh less than it did before the row existed, and counted only once the wash left nought, the whole
picture would step as it arrived.

**And a reading owns no motion of the screen.** 0128 gives each of the four to exactly one
parameter, picked by that parameter's own fold; a row folded off a name nobody turned would take one
of them and breathe a yard nobody is automating. So the screen skips a row with no depth of its own
the way it already skips the reference row. What the wash does reach there is `disperse`, which is a
tint rather than a motion — and a tint is baked into a tile, so the cache has to hold the stops a
reading visits or the pixel loop 0129 keeps off the frame path would run on one (`TILE_CACHE`).

Nothing here is durable, which is the whole of the permission 0145 gives and does not widen: the
same session on another machine washes a little unlike this one, as its meters read a little unlike
these.
