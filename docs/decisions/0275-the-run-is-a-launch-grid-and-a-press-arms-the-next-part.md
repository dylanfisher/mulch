# 0275 — The run is a launch grid, and a press on a cell arms the next part

- **Date:** 2026-09-01
- **Status:** accepted, closing the playback bench of [0255](0255-the-ground-and-the-arrangement-have-their-own-benches.md) under [0254](0254-the-bench-argues-the-card-fold-by-fold.md)'s rule, and adding a second transport gesture beside [0190](0190-an-audition-is-a-solo-a-hand-holds.md)

**The song section is a grid.** A column per song, a row per part; the cell playing is lit and the
one coming is ringed. Of the eight readings on the bench, this is the one where the next thing is
the thing a hand presses, and that is the gesture a run is heard as — "this now, that next".

**A press on a cell arms it, and the pass lands it at the next part boundary.** `deck.playerArm`
is transport on the solo's terms: nothing durable moves, no history entry, and it dies with the
pass. The pass drops the steps past the lookahead, lays the rest of the standing part again, and
on the first step that opens a part winds the walk to the queued part's own first jump — the wind
a solo's release already takes, taken at a boundary. The walk says which step opens a part
(`PlayerStep.opens`) rather than letting the transport count jumps for itself. A jump drawn and
not yet heard stays remembered: a knob moved before it lands queues it again on the same boundary,
a disarm takes it back out, and the read says it is armed until the clock reaches it. Arming under
a solo is refused — a run of one part has no boundary the jump could land on.

**Nothing armed rings the run's own next turn** (`songsAfter`), so the ring is never dark while
something plays. The ring is a third ink beside the two 0172 already keeps apart.

**Editing lives in one row under the grid**, for whichever song or part is picked. A pick names a
song always and a part sometimes, because a song with no parts has to be pickable to be given one;
the part picked is what points the card's dials somewhere (0176). Reorder is two presses per tier
rather than a drag: two axes on one hook is an abstraction nothing else wants yet.

**The bench's song half is deleted**, eight drawings and their fixture, as 0254 said it would be.
