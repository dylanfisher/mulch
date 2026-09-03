# 0294 — Two delays share one ceiling

- **Date:** 2026-09-02
- **Status:** accepted, amending [0282](0282-a-delay-repeats-the-picture.md) (a delay repeats the
  picture), whose numbers were the argument for the band this opens; standing on
  [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (two of one kind are two passes) and
  inside the per-frame line [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md) draws
  — no fill over the picture, no read-back

**Two delays are twice the repeats and never a whiter picture.** 0282 shot two delays at a mean of
0.142 against a dry 0.225 and called it "twice as much"; three of them, shot for this step, read
0.127 against 0.224 — the strip washed out to little over half the ink a dry yard has, with the
structure smeared rather than doubled. Every ladder was drawn under the whole of `ECHO_CEILING`, and
a ghost is drawn over what is already there, so the coverage compounded with the count. The ceiling
is now shared: `echoCeiling(crowd)` is `1 - (1 - ECHO_CEILING) ** (1 / crowd)`, which is
`gratingDepth`'s arithmetic (src/lib/moireGrating.ts) said of ghosts rather than of rows — solve for
the share that leaves the picture where one delay leaves it once all of them have been laid over it.
Same fixtures, this build, each read twice: one delay 0.241/0.244, two 0.266/0.270, three
0.286/0.293, against a dry 0.225/0.230, at a swing that holds at 0.15 rather than climbing to 0.30. The repeats are still countable at the crop and the
count of them still doubles, and the ink no longer washes out — it climbs a sixth from one delay to
three rather than collapsing to half a dry yard's. Exactly one ceiling's worth would be the claim if
every ladder covered the same pixels; displaced ghosts do not, so what the bound gives is a picture
that never falls past what one delay already costs, which is what the shot was asked for.

**The chain counts, and hands the number down.** `looksCrowd(looks, name)` in src/ui/moireLooks.ts
is the reduction, beside `looksWarp` and the other five, and `passLooks` calls it once per slot and
hands the result to the pass as its seventh argument. Two instances are still two passes drawing
their own repeats in their own slots — 0279 stands, and what is shared is the alpha and not the pass
— and the bound is on a number the passes are handed, never a fill over what they drew (0129, 0269).

**Weighted by how far in each delay has travelled, and not a tally.** The first cut counted whole
and the review shot it down at the desk: `looksCrowd` sees a look on the frame its instance enters
the set, when its own ladder is drawing nothing at all, so a whole count dimmed the delay already
standing to two delays' share for the whole `SHAPE_SECS` the newcomer took to arrive — a picture
whiter than one delay for six seconds, which is the one thing this bound exists to prevent, and
invisible to a shot that reads the settled state. Weighted by `at`, which is the shape `looksWarp`
and `looksFolds` already have, the share standing and the share arriving move together and neither
end of the travel steps. A delay leaving fades out of the crowd exactly as its own ladder fades off
the field, because `carryLooks` keeps it in the set at no presence until its alpha has drained
(src/ui/moireCarry.ts) and `at` is what this reads. And a rack holding less than one whole look's
worth asks nothing of the ceiling: `echoCeiling` floors the crowd at one, so a single delay heard at
half draws the same first rung it always did.

**The Time has a floor of ten milliseconds and a log curve.** A delay of nothing is not a delay: the
wet path is the dry signal arriving twice at once. The floor is also what the curve needs — a
logarithmic range has no bottom at nought — and the curve is what the knob needed: on the old linear
range four fifths of the travel lay between one second and two, where every setting is the same long
echo, and every slap and every quarter-second repeat was crowded into the first eighth. The default
quarter-second now sits at 0.61 of the knob. This is a change to how the delay _sounds_ as well as
how it draws, which is the point, and it is free pre-release. **And the picture reads the curve
twice, not once**: the look's `spacing` is one reader, and the row's own anchor is the other —
`effectReach` normalizes every `driftFrom` value on that parameter's declared curve
(src/ui/moireRows.ts), and delay maps its Time into `centre`, so a default delay's row rests at 0.61
of the centre band where it used to rest at 0.125, and short delays that used to pile at the bottom
now spread across it. That is the same knob read the same way in both places, which is what the
curve being a property of the declaration buys (principle 1).

**And the spacing band opens at the top, with the fade following it.** `ECHO_SPACING` was a
forty-eighth to a twelfth of the width because a repeat further off read as a wash — which held while
the knob spent its travel near the bottom of the band and every setting drew nearly the same gap.
With the Time on the curve the top of the knob is a second and a half of delay and has to look like
one: the top is now a sixth, so the whole ladder is half the picture. Shot at 20 ms against 1.6 s,
the swing goes 0.090/0.103 to 0.140/0.142 and the diagonals stand visibly further apart at the
crop. The spacing
also lifts the fade's **floor** by half the band (`ECHO_TIME_FADE`), because a long delay is slower
repeats as well as wider ones — the feedback still decides the tail and still reaches the top of the
band at every Time. The floor and not the fraction: the first cut summed the two terms and handed
the sum to `denormalize`, whose clamp then ate the top of the Feedback knob — at the default Time
every feedback above 0.63 of its range drew the same tail, a knob the picture had stopped answering
(the review's finding).
