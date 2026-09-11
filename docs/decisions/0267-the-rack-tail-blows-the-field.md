# 0267 — The rack's tail blows the field

- **Date:** 2026-09-01
- **Status:** accepted; its drift half — the one-way travel across the screen — is superseded by
  [0364](0364-the-ground-crawls-the-lattice-and-the-wind-only-leans-it.md), where the walk's ground
  takes that travel and the tail leans the lattice by whole cells instead. On
  [0213](0213-a-reading-of-the-output-belongs-to-the-field.md),
  [0248](0248-the-structure-travels-and-its-identity-is-the-automators.md) and
  [0266](0266-the-picture-travels-its-ink.md)

Every entry declares how long it goes on sounding like what it was given — reverb's is decay plus
predelay, delay's is `feedbackSettleSecs` — and nothing outside scheduling read one. So three
reverbs and two delays deep, the picture was the picture a dry yard draws, and washed-out floating
is the first thing an ear names about that rack.

**One reading, and it is `settle`.** `rackTail` (src/lib/moireSound.ts) is the longest heard tail in
the standing rack, weighted by whatever each entry's own `presence` says it is heard at
(`effectHeard`, src/audio/params.ts), normalised onto `RACK_TAIL_BAND` — the floor no settle goes
under to `reverb.decay`'s own ceiling, logarithmic because a tail is a length. The longest and never
the sum, which is `rackSettleSecs`'s argument: the stages run at once. There is no list anywhere of
which effects are washy and there may not be one — that fact is the plugin's, said once, and an
entry added tomorrow is in this reading the day it declares a settle (principle 1).

**An entry that declares no honest presence is in the population and out of the tail.** `effectHeard`
answers `null` there rather than a whole or a nought, and `rackWind` leaves it out of the reading:
the one entry that says so is the automator, whose own `settle` is `Infinity` because a run's
decisions are its tick indices and no window reconstructs them (0239). That is a warm-up, not a
tail, and weighed as one it blew the whole field on every yard holding a run — which is most of
them. Its id still folds into the direction, because it is standing.

**It buys exactly two things.** A **drift** — a term added to `inkThrough`'s `rolled.e`, the same
axis the crawl sweeps and returns on, running one way — and its **direction**, folded off the
standing population the way `fractalKind` is, so adding an effect turns the wind rather than
restarting it. Nothing else reads the tail.

**Smoothness is the tail itself, and the one thing that has to travel is the sign.** The drift is the
integral of the speed, so a tail that moves is continuous in position by construction and needs no
rate at all. A direction is a sign, and a sign that flipped between two frames would reverse the
whole field at once — so it travels through `easedToward` at a whole reversal in `DRIFT_WIND_SECS`,
the repo's one rate (0266), passing through a moment of standing still.

**It rests on the field, and it is read at the rebuild.** `MoireRowSet.tail`, `veering` and `wind`
sit beside `wash`, `age` and `ink`: the wind is the whole picture's and no row's, and no registry
entry declares it (0030, 0128, 0145). The tail and the direction are facts about what the rack is
_set to_, so they are filled when the set is built — a knob touch is that rebuild — and never on a
frame, where a settle would be a plugin call over a fresh value record per instance per painting
(0070). Where the wind has blown to is the read's, and it is carried across a rebuild for
`carryInk`'s reason: a fresh set has been blown nowhere, and a wind that restarted on every pointer
move is the thing this replaces.

Cost: no bake, at any tail. The drift is a term on the pattern's transform and nothing in
`screenOf`'s key, so the key space is exactly what 0266 left it at and `TILE_CACHE` absorbs the
same 24 slots (0129, 0142).

Durable shape: none.
