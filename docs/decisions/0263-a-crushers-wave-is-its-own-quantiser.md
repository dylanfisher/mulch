# 0263 — A crusher's wave is its own quantiser

- **Date:** 2026-09-01
- **Status:** accepted, on [0122](0122-a-registry-answers-for-itself-at-load.md) and
  [0148](0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)

The rack's ninth entry is `crush`: a sample-and-hold and a quantiser in one processor
(src/audio/worklets/crush.js), behind `CRUSH_BITS`. It needed a profile of its own, and the ten
already in `PROFILE_WAVES` are all smooth between their turns — a sum of harmonics, or a ramp.

**So `stair` is the plain cosine put through the same rounding the effect puts a sample through**
(src/lib/moireProfiles.ts): three steps either side of nothing, on the same levels — nothing among
them — and each riser taking the last fraction of the way to its boundary for the reason
`SLOPE_FALL` is a fraction of a cycle: an instantaneous edge shimmers under the tile's own
filtering rather than beating. Flat between its risers is the family nothing else in that list has,
and a quantiser is not a multiplier, so it is not `plain` at a depth ratio however deep either row
is cut (0122).

Its mean is exactly a half by construction and not by tuning: the rounding is odd about nothing, and
a cosine is its own negative half a cycle along, so the two halves cancel whatever the step count is.
A step count picked for the eye therefore cannot cost the picture its brightness.

`crush.bits` reaches `pitch` rather than being written down as unreached (0148): a bit depth is how
finely the signal is resolved and `pitch` is how finely the row is drawn, which is the same sentence
about two things. `crush.rate` is the cycle the stage works over, so it is `period`, and `crush.mix`
is `depth` as every other entry's blend is.
