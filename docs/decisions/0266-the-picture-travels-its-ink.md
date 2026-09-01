# 0266 — The picture travels its ink

- **Date:** 2026-09-01
- **Status:** accepted, on
  [0141](0141-colour-is-something-an-effect-turns.md),
  [0142](0142-a-row-is-cut-on-a-coordinate-of-its-own.md) and
  [0235](0235-a-ground-move-is-travelled-not-written.md)

Every colour term the screen is filmed through is the **boldest** row's claim — `screenFringe`,
`screenDisperse`, `screenHue` — so an automator retiring the instance that held one handed the
picture another ink between two frames, and a hand dragging past a stop cut to it. Every other
travel in the picture is rated (0235, 0248); colour was the one that was written.

**A rate, and the repo's one rate.** `easedCentre` is `easedToward` with the anchor's own reach
filled in, and the ink travels through the same function with `DRIFT_FRINGE_REACH`,
`DRIFT_DISPERSE_REACH` and `DRIFT_HUE_REACH`. The reach and not the raw distance, because a rate
stated in one dimension's units means nothing in another's: "a whole reach in `DRIFT_INK_SECS`" is
the only phrasing under which a `fringe` that reaches twice as far as a `hue` arrives with it. Not
an ease, for `easedCentre`'s reason — an exponential never arrives, and a picture permanently
chasing an ink two turnovers back is the smear this replaces.

**Two seconds, because that is what the ladder costs.** The travelled value is what `stepped`
rounds, so a whole reach walks `DRIFT_STEPS` = 8 stops and each stop is one bake: eight over two
seconds, four a second, and none of them twice, the travel running one way. That is what a drag
already spent, spread out rather than added to. Three terms travelling at once and off each other's
step lines is three such ladders — a little over twenty keys, which is `TILE_CACHE`'s whole 24 — so
one travel can evict the resting tile, and what that costs is a rebuild on a later remount and never
one on a frame, which is the cost that cache's own doc already accepts. Nothing here bakes a tile a
frame, which is what 0129 forbids.

**The travel is the field's and rests on the set, not on the painter.** `MoireRowSet.ink` sits
beside `wash`, `age`, `sounding` and `seed`: one screen is one tile, so unlike a pitch or a depth
these three cannot be per row, and the read that fills every other field-level number fills this one
too (`inkTravelInto`, at the end of `refillRows` because `wash` is the number that read answers).
The painter is handed where it has got to. Per picture and not per yard, like the seed: a strip and
an overlay each carry their own and each converges on its own.

**And it is carried across a rebuild, which is the clause that makes a drag work.** A knob touch
rebuilds the row set — that is what a durable move does — so without `carryInk` a drag would drop
the picture back to its resting ink and set off again on every pointer move, never leaving the
middle of the ladder. The knob itself stays immediate: what is carried is where the travel has got
to, never where it is going, and where it is going is the new set's rows.

**The whole reading travels, not the bare claim.** `wash` carries `disperse` and the age carries
`hue`. The age crawls and the travel arrives on it every read. The wash does not: `washAmount` is
gated at a floor, so a deck falling under it moves the `disperse` target half a reach between two
frames, and that half now takes a second to walk where it used to cut. That is the same kind of jump
as a retiring place and it is walked for the same reason — the alternative is one of the three terms
cutting while the other two travel, and a second author for the term that was split off.

**And a yard whose clock is not running arrives outright**, which is what `easedCentre` already
answers for a yard with no landing to time a travel against. A halted picture is painted on a commit
and never on a frame (0144), and the clock this is timed on is the deck's (0126): timed against a
clock that does not run, a colour knob dragged on a stopped yard would move the dial and leave the
picture wherever the last commit left it. `peek.sounding` is the reading that says so, the same one
the age is resolved off.

Cost: no bake a frame and no bake a picture would not otherwise have paid — the same eight stops,
visited one at a time. A resting yard travels nowhere and its key does not move, which
`moireScreen.test.ts` asserts over two seconds of frames.

Durable shape: none. `MoireRowSet.ink` is a per-frame reading like the four beside it, and no
parameter, registry entry or session field knows about it (0128, 0145).
