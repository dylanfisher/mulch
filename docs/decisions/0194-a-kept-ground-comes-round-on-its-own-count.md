# 0194 — A kept ground comes round on its own count

- **Date:** 2026-08-28
- **Status:** accepted, extending
  [0184](0184-the-ground-is-the-songs-and-a-part-plays-back-on-it.md) and
  [0192](0192-the-grounds-period-is-counted-on-a-clock-a-hand-picks.md) — the ground is still the
  song's and is still counted on the clock a hand picks — and taking the shape
  [0163](0163-a-placed-rest-is-the-fields-other-author.md) and
  [0188](0188-a-part-can-be-written-as-a-row-of-cells.md) settled one and two grids down: a hand's
  own list is the field's other author.

**A song holds a list of grounds it comes back to, each with the count it comes round on.**
`beds` is a list of `{ bed, every }` beside the one the song opens on. Where a count is due, the
walk stands on that ground instead of the one the crawl reached. The crawl is what a pattern does
on its own; a kept ground is what it returns to — which is the thing a performer asks for after
hearing a loop worth hearing, and which no amount of distance, lean or homing could say, because
all three are about how far to wander and none of them is about _where_.

**A count and not a weight.** A kept ground could have been a share of the homing roll, and that
would have made a favourite ground merely likelier. What a hand keeps is a place it wants to arrive
at _on time_ — every fourth part, every sixteenth — so the field is a period on the same clock the
crawl's own period is counted on (0192). One arrangement, one idea of what a period is: the count
is in whatever `bedPer` names, and `PLAYER_BED_ROUND_MAX` is `PLAYER_BED_EVERY_MAX` because they
are the same period counted on the same clock.

**The longest period wins where two are due.** A ground kept for every sixteenth part against one
kept for every fourth is the rarer arrival, and a pattern that spent the sixteenth on the every-
fourth ground would never sound it at all. Ties go to the first in the list, which is the earlier
ground on the source, because the list is held in the source's own order.

**A kept arrival takes no draw.** It is read after the crawl and over the top of it: the crawl's
roll is still taken whenever its period is due and whatever comes of it, so keeping a ground leaves
the stream every other field is drawn from exactly as it was (0134, P87). What a kept ground
authors is where the pattern _is_, never what it draws — which is what lets a hand keep one
mid-performance and hear the same pattern arrive somewhere else. It lands once per count and not
once per jump, since a count names the same number for every jump of the part it is on.

**No id, because a kept ground is which ground it is.** Two kept on one bed are one ground said
twice, so the wire and storage refuse them (`bedsOf`) rather than lighting two blocks over one
window. That is 0157's argument answered the other way for a thing that _is_ its position, exactly
as a written cell answers it.

**It is the song's, so no character draws it and no part carries it.** The refusal the five bed
knobs and the ground's own clock already carry (0184, 0192): a list of places a hand chose is not a
texture a die may draw, and a part carrying one would be the parts disagreeing about where the loop
is. `beds` is out of `PlayerVoice` for the reason `song` is.

**Two gestures write it, and one arithmetic.** An Option press on the Which Ground picture keeps
the ground it landed in or lets a kept one go, and the row under the picture keeps whatever the
walk is standing on — read off the peek at the press, the way Plant reads it, and rounded onto the
nearest bed because the crawl may leave the ground between two of them (0185). Both write
`plantBed`, so a list a hand edits from two places cannot be edited by two arithmetics.
