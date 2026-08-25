# 0160 — A hole is a landing that never opens

A landing may be silent and keep its place: `drop` is the odds one is, rolled per landing in the
walk. It is neither of the two knobs that could already take sound away — a rest is a wait
_between_ two landings and moves everything after it
([0119](0119-a-burst-is-seconds-and-the-rest-is-slots.md)), a gate cuts inside a repeat and cannot
reach silence at all — and what it buys is the figure said with a gap in it
([0151](0151-a-figure-is-a-run-of-slots-the-walk-plays-back.md)).

**A dropped landing is scheduled exactly as a sounding one is, and the whole of what makes it
silent is a fader that gets no curve.** The step is armed, its source starts and stops on its own
schedule, its `ended` reaps it, and its entry stands in the queue for the clock to be inside. That
is not an implementation detail to tidy later: `armStep` hangs `release` off the source's own
`ended`, and `position()` reads the deck's read head off whichever queue entry the clock is inside
([0089](0089-a-jump-is-the-transports.md)) — so a landing with no source is an entry nothing reaps
and a cursor nothing answers for. A hole that skipped the arming would be a hole in the read
position too.

Durable shape: `PlayerSpec` grows `drop`. The knob is drawn on the card's own row rather than
behind a framed plus, because it shapes no drawn number and
[0124](0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md) puts an amount behind the
dial whose draw it shapes.
