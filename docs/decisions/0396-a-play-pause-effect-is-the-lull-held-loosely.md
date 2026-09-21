# 0396 — A play/pause effect is the lull, held loosely

- **Date:** 2026-09-21
- **Status:** accepted, resting on
  [0371](0371-an-effect-may-ask-the-transport-for-a-hold-and-never-touch-it.md) for the one road an
  effect rests a transport by, and extending
  [0377](0377-a-lull-is-a-chance-and-a-rest.md)'s three dials by a fourth.

**The play/pause effect is a knob on the lull and not a second entry.** Asked for a stutter "kinda
like scatter", the lull already had the grain: its two lengths reach a hundredth of a second, so
both turned down is a deck played and paused a dozen times a second, on the one mechanism a rack
plugin may rest a transport by. A second entry would be a second thing that rests a transport, and
two of those cannot both be right about what a yard already resting owes — the refusal this step
was written with. What the lull did not have is scatter's **Stray**: every rest exactly as long as
the dial says is a square wave, and a square wave is a tremolo and not a performance.

**So the fourth dial is Loose, and it is scatter's own draw on a lull's two lengths.** At nought
every rest and every check is exactly its dial, which is the run every lull laid before this
decision; at one each is drawn anywhere from `LULL_LENGTH_MIN` up to it; in between the dial is the
ceiling and the Loose is how far under it a draw may fall. The length is drawn first and rounded
onto the beat after, so a loose rest lands on a division like every other, and it is floored at the
dial's own bottom, because a length of nothing is an edge laid on the instant it counts from and a
walk that never reaches its horizon.

**The draws are spent whatever the Loose is worth.** One per length and one per roll, the check's
taken when the edge it counts from is laid rather than at the pump that looks ahead — so the list
stays a function of the horizon alone and two pumps at different cadences agree (0204), and a hand
moving the knob does not move the order of the draws, which is the whole of what the seed promises:
a rewalk takes no draw of its own, because the length the standing one was drawn for is dropped
undrawn, and every lane write inside the horizon is a rewalk — a drag writes one per pointer
sample, and a run that counted them would be a function of the hand and not of the seed.
The Loose takes a lane like the three before it, read at the instant the length it draws is spent
(0378), and reaches the picture as `bend`: how far each length is drawn from the one before it
rather than travelling evenly into it.
