# 0307. The dial paints from the hand, and the yard follows in a transition

- **Date:** 2026-09-07
- **Status:** accepted, standing on [0144](0144-the-picture-may-fall-behind-the-hand-may-not.md)
  and narrowing [0114](0114-a-capture-lost-is-a-gesture-over.md)

A knob dragged on a yard of ten effects stuttered, and the sound did not: every pointer move ran
the store write, the whole yard's re-render and two session serialisations inside the move's own
task, and the dial was painted only at the end of it. Chrome already frame-aligns `pointermove`,
so the rate was never the cost; the length of each move's task was, and a task over a frame drops
the frame the dial would have been drawn in.

**The dial paints ahead of the store for exactly the length of its own gesture.** A move writes the
arc, the indicator and the readout through the paint the lane path already uses (0070), and only
then sends its value. A gesture the browser ended has nothing to put back, whichever ending it
was: every move committed the value it painted, so what is on the dial is what the store holds —
0114's telling stays, and the knob's answer to it is an empty body.

**A dial steps from the value it last reached, never from the prop.** The yard's heavy surfaces —
the knob row, the drift, the jumps card and the rack — draw the deck as `useDeferredValue` has it,
one transition behind, so React renders them in the gaps between moves and yields to the next one.
So the `value` a render carries can be one commit behind the store, and a key repeated inside that
gap stepped from where the dial had already left: Home then ArrowUp landed on 2. A render that
moved `value` is the store speaking and the dial follows it, unless a hand is on the dial; one
carrying the same `value` as the last says nothing about where the dial is. The three surfaces are
memoised at the one site that hands them the deferred deck, and the view preferences the yard
hands them are stable pairs, because a deferred value only pays when the urgent render passes its
readers by. The transport, the header and the peaks keep reading the store at once.

**A smoke waits on the commit, not the session, before pressing a surface that follows.** The
walk's section is on the page from the loop alone, so a press on it inside the transition read a
picture of nothing; the card's own switch reading on is the same commit that hands the walk its
spec. A person cannot press inside that window. A script can.
