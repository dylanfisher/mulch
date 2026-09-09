# 0328 — A landing's sparks are counted, and spaced by the one delay

**2026-09-09.** `SparkSpec` (`src/lib/playerSpark.ts`) gains `sparkCount`, a whole number
`PLAYER_SPARK_COUNT_MIN`…`PLAYER_SPARK_COUNT_MAX` — 1 to 4 — stepped whole in
`src/lib/playerKnobs.ts`, captioned "Count", and drawn as the fourth dial of the spark's own run on
the sound box. A landing that sparks throws that many companions, each at a slot of its own from
one ordinary `travelFrom` jump, held on `PlayerStep.sparked.slots` beside the one level and the one
delay the family already had.

**Whether is the Spark dial; how many is the Count.** The odds are rolled once per landing, exactly
as the drop and the reversal above them are, and the count says what that one roll is worth. That
is why the count's floor is one and not nought: a nought would be a second way to say the Spark
dial is off, and two dials saying the same thing is a state a hand cannot resolve. It is also why a
pattern at the floor lays down the stream it laid before the field existed — one companion is one
draw off the walk's own generator, which is the guarantee `SPARKING_LEAVES` in
`src/lib/playerSpark.test.ts` is the golden for (0089, 0096).

**The delay is the last one's, and the rest divide the stretch before it.** `sparkStartOf(index,
count, delay)` is `delay × (index + 1) / count`, and it is the one place that arithmetic is
written: the transport opens the companions at it (`src/audio/playerSparks.ts`) and the picture of
the walk draws their ghosts at it (`src/lib/playerScope.ts`). At a delay of nought every one of
them sounds with the landing, a chord of regions; at the top of the dial they are evenly across the
landing's window with the landing itself as the first read of it. The alternative — one delay
applied to all of them — is a pile rather than a rhythm, and a per-spark delay would be the second
clock P123 refuses.

Because the last spark still lands exactly where the delay says, the bound the delay carries is
untouched: it is a fraction of the landing's own window less a seam, so no reading of either dial
can start any companion at or after its own stop, at any burst, count or rate (0175, 0166). Every
companion is still one source through one level gain into the _landing's_ fader, stopped by the
landing's stop and held on the landing's own queue entry — so `position` goes on answering off the
landing, and the read reports the companions separately: `sparkPosition` on the per-frame read is
`sparkPositions`, a list refilled in place holding only the ones actually sounding, and the peaks
mount `PLAYER_SPARK_COUNT_MAX` cursors of which the rest stay hidden (0070, 0166).

Four is the ceiling because a landing already reads once for itself: five reads of one loop at once
is a wall rather than a rhythm. Pre-release, a stored spec carrying no `sparkCount` is discarded by
the wire's exact key set rather than filled in at a default (0026).
