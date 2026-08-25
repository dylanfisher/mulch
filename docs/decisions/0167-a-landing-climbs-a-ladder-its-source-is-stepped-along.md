# 0167 — A landing climbs a ladder, and its own source is stepped along it

- **Date:** 2026-08-25
- **Status:** accepted

The rung ladder moved per hold: `hold` counts jumps and a landing read at one ratio for its whole
length ([0118](0118-the-rate-walk-is-the-performers.md)). `climb` is how far it moves between one
repeat of a landing and the next — signed, whole, bounded by `PLAYER_RATE_RUNGS`, zero at the
switch. It is an arpeggio rather than a speed change.

**One source, stepped, and not a source per repeat.** [docs/plan.md](../plan.md) named two roads
and said the step is written only after it says which. A source per repeat multiplies the node
count of the busiest thing in the instrument and puts a seam inside every landing; a scheduled
`playbackRate` is one `setValueAtTime` per boundary on the source the landing already has, so a
climbing landing costs no nodes at all. Stepped and never ramped: what lies between two rungs is
not a rate this module may read at, and a stepped automation is what keeps the cursor exact.

**What the cursor becomes.** `position()` multiplied one rate by one elapsed time. It now sums the
repeats a landing has finished, each at the rung it was climbed to, plus the part of the one it is
inside (`readInto`, src/audio/player.ts). That is a sum and not an integral, because inside one
repeat the rate does stand still — the windows are the `spans` the landing was already cut and
ended on ([0161](0161-a-ratchet-moves-the-windows-not-the-grain.md)), so no second arithmetic is
introduced. `PlayerStep.rate` became `rates`, one ratio per repeat and always exactly `repeats` of
them, because a landing no longer has _a_ rate.

**The climb moves how fast the region is read, never which region.** The source's loop window and
the rest after the landing are both cut at the rung the jump let it go onto — `rates[0]` — so
everything about _where_ a landing lives is untouched and only the grain inside it moves. This is
the ratchet's own division of labour said for the rate.

**Folded at the spread, not clamped and not wrapped.** The other two answers each have a silence
in them: clamped, every repeat past the edge piles onto one rung, so eight repeats at a climb of
two are three notes and five of the same one; wrapped, a climb that divides the window evenly
comes back where it started, so a climb of three inside a spread of one is a dial reading three
and doing nothing. A fold has neither dead spot. A spread of zero silences a climb, which is the
same answer `drawRung` gives — there is nowhere on the ladder to go.

**The spark climbs the same ladder.** A companion reads at the landing's rate or it is the two
reading at two rates, which is the one thing a spark may never do
([0166](0166-a-spark-rides-the-landings-entry.md)). The ladder goes onto both sources off the one
speed the chain wrote, rather than the spark copying the rung the landing started on.

**No character's region names it**, and that is the written answer
[0152](0152-a-character-is-a-region-of-the-spec.md) asks for: it is the ratchet's argument, the
other amount that shapes what happens inside a landing rather than between two. `slide` stays
about the walk between landings. The knob sits behind the Hold dial's own marker with `chance`,
`spread` and `drift` — the same ladder, walked per repeat instead of per hold — rather than
carrying three amounts of its own ([0124](0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md)).

Pre-release, so specs without it are discarded ([0026](0026-pre-release-has-no-migrations.md)).
