# 0379 — A yard's sequence is a fade over its own gain, on its own clock

- **Date:** 2026-09-13
- **Status:** accepted, resting on [0040](0040-automation-holds-where-the-transport-left-it.md)
  for the clock it rides and on [0371](0371-an-effect-may-ask-the-transport-for-a-hold-and-never-touch-it.md)
  for the road it does not take.

**A yard holds a sequence: a run of steps — in, play, out, rest — each whole seconds long, read as
one level between nought and one that its output is scaled by after its fader.** A hand wants to
say "fade this in over two minutes, play for five, fade out, rest" for many yards at once, and
that is a shape and not a number: it is `sequence` on the deck (src/lib/deckSequence.ts), not a
parameter, because `deck.gain` already owns the one value that pair may have (0011) and a lane is
a gesture and never a plan (0028). It sounds through one `fade` gain the chain builds between the
fader and the pan, laid as ramps on the arming tick from a function of the window alone, so a
render of the session is the performance it would have given (0204, 0071).

**It counts on the lane clock, so a pause holds it and a stop rewinds it.** Play begins it at
nought; a pause freezes it where it stands and the next play carries it on (0040); a stop, which
rewinds the playhead, rewinds the sequence with it (0038). Past its last step it goes round again
from the top, for as long as the yard plays, and touches nothing else — a run is a loop like the
yard under it — because the sequence is a fade and the transport is a hand's.

**A rest is silence and not a hold.** It could have asked the transport for one the lull's way,
but that is a second asker on the one road 0371 opened, and a rest that held would collide with a
lull's; silence under a running loop needs no road at all and renders offline for free.

**The sequencer is a view.** The header's toggle draws every yard folded with its sequence in the
header's slack, and is a view preference like the theme: no command, nothing durable, no history.
The sequence itself is live whether or not it is shown.
