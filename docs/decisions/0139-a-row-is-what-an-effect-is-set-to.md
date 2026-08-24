# 0139 — A drift row is what an effect is set to

- **Date:** 2026-08-24
- **Status:** accepted, extending
  [0137](0137-an-effect-declares-the-wave-it-draws-with.md)
- **Amends:** [0138](0138-the-drift-opens-a-window-the-instrument-drives.md) — the click zooms in
  place, and the header pays for the window

The picture read the rack by counting it. A delay at 30ms and the same delay at two seconds drew
the identical row, and an effect nobody could hear drew one anyway, so the drift was a picture of
what a rack holds rather than of what a yard sounds like.

**A rack instance's row is read off the instance.** Each registry entry declares how its own values
reach the picture, in a `driftFrom` beside the `drift` profile 0137 already declares: one parameter
into each row dimension it claims, out of `period`, `depth`, `pitch` and `bend` — how long the row's
cycle is, how deep it cuts, how fine it is drawn, how far it breathes across that cycle.
`validateEffects` throws at load for an entry that declares none, for a parameter it does not own,
and for two mappings into one dimension, the way it already throws for a duplicate profile
([0122](0122-a-registry-answers-for-itself-at-load.md)). Declaring per entry rather than branching
per effect in a painter is the trade 0137 made for the profile: an effect contributes uniquely by
declaring uniquely, and no painter grows a branch for a plugin it must not name.

**A dimension no value reaches keeps what the row has always had** — the period the fold of the
instance's id picks, the one depth every row is cut at, the pitch its period sets, and no bend. The
fold stays the row's identity, its angle and where in its cycle it starts ([0076](0076-a-card-reads-itself-out-of-its-own-id.md)), so two instances set alike still cross rather
than coincide. And the value is what is read, not whether it is automated: a knob at rest says what
its effect is doing, and a lane on that knob goes on bending the row it already bends.

**A bypassed instance draws nothing** — neither its own row nor any lane riding it. It leaves while
the switch is off and comes back unchanged when it is on, because nothing about a row is stored.

**The click zooms in place, and the zoomed header pops out.** A click on the strip covers this page
with the same picture; the window 0138 opens is asked for from that picture's own header, so the
cheap gesture stops paying for a window. Nothing 0138 decided moves but which of the two the click
reaches first — one component either side of the seam, closed by the header, by Escape or by the
window itself. The strip goes on drawing behind a window, so `useSecondWindow` says whether it is
`showing` at all and a second click on the strip does nothing: two pictures of one yard would be
two frame loops for one of it ([0070](0070-a-per-frame-read-refills-and-never-clears.md)). Where a
browser refuses the window the picture stays where the zoom put it and the pop-out is withheld —
a control that cannot work is not offered (principle 5).

Consequences. The pitch a value asks for is an argument to `gratingPitch` rather than a
multiplication at the call site, so the band that keeps a grating off the pixel grid keeps one
owner ([0098](0098-a-row-is-drawn-against-its-own-band.md)). A depth reaches a floor rather than
zero: an effect turned all the way down is still in the signal path, and a row that vanished at one
end of a knob's travel would be the bypass switch saying what a knob may not. `gratingDepth` still
solves for the share the row _count_ takes, which is the part a yard's contents must not say; what
a row then cuts of that share is what its effect is set to. And a row's period now moves with a
knob rather than being fixed when the instance was built, so the recurrence estimate moves with it.
