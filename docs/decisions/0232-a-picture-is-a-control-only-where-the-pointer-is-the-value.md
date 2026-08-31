# 0232 — A picture is a control only where the pointer is the value

- **Date:** 2026-08-31
- **Status:** accepted, narrowing [0197](0197-the-card-has-a-front.md) and
  [0198](0198-the-front-is-what-the-card-opens-on.md)

The walk's picture is a picture. A press or a drag across `[data-slot="player-scope"]` sends no
command: `scopeAim`, `scopeMark`, `ScopeAim`, the crosshair, the three pointer handlers, the grab
cursors and `PLAYER_WALK_AIM` are gone, and `distance` and `repeats` keep their declarations, their
bounds and their dials in Fine Tune, which are now the one road to both.

0197 made the picture a control on the ground's precedent — `player.bed` is turned by its dial and
dragged on its own picture, and both send the one field ([0191](0191-the-ground-is-a-picture-a-hand-moves.md)).
**The precedent does not carry, because the two pictures are not the same kind of picture.** The
ground's rectangle is a _place_: dragging it points at a stretch of the file, and where the pointer
is _is_ the value. The walk's sheet is a _shape_, and the crosshair on it wrote how far a jump
travels across and how many bursts a landing is cut into up — neither of which is anywhere on the
sheet. A hand aiming at a landing it can see got two numbers about landings in general, and the
sheet redrew under the pointer into a sheet it was not aiming at: the gesture was a drag whose
target moves in answer to itself.

So the test is not "is this a picture of something a number shapes" — every picture in the
instrument is — but **is the point under the pointer the value the gesture writes**. Where it is,
the picture may be dragged. Where it is not, the picture is a readout and the number is reached by
the control that declares it. The ground's picture keeps its drag on that argument and not by
omission.

`src/ui/PlayerScope.tsx` keeps its `max-lines` waiver: the gesture was not what put it over the
400-line cap. It fell from 624 lines to 548, and what is over is the fed window, the two lanes and
the wait's own sentence.
