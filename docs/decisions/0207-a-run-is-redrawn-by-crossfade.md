# 0207 — A run is redrawn by crossfade, and a fresh entry is seeded from its own id

- **Date:** 2026-08-29
- **Status:** accepted, amending
  [0204](0204-a-run-is-laid-on-the-automation-horizon.md)

Every knob that shapes the automator's run is declared `rebuild`, so moving one re-derives the
population from the seed. The redraw used to take the old population out of the rack in the same
breath: a graph edit at full strength, which is the one thing [0202](0202-an-effect-declares-how-present-it-is.md)
exists to refuse. A hand turning `Held` or `Stray` heard six effects vanish.

**Nothing this entry holds is ever removed at strength.** A redraw fades every standing place to
its plugin's own silence over the `Fade` knob and lets the nodes go once that fade is done — the
same departure a retire makes, through the same call. The redrawn run starts at that instant and
arrives on the next pump, so a knob change is a crossfade between two populations rather than a
hole. Two consequences follow: an instance id carries the redraw it belongs to, because the same
seed drawn again would otherwise lay a place's own id on top of the one still fading; and a row
read paints the run first and what is leaving after it, as far as there is room.

**A parameter may be declared `seeded`, and a fresh instance draws it from its own id.** A seed is
which run this is, so two automators added the same afternoon must be two runs — and a default of
`1` made them one heard twice. The draw is a fold of the instance id the adding gesture minted, so
it is random in the hand and identical on every replay of the file that recorded it (0076): the
randomness stays at the call site that writes the command, and nothing downstream of it rolls a
die.
