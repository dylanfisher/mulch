# 0119 — A burst is wall seconds; distance and rest stay the loop's

- **Date:** 2026-08-22
- **Status:** accepted

`PlayerSpec.burst` is a duration in wall seconds. `distance` and `rest` remain fractions of the
loop's own grid. The player's time knobs are deliberately no longer one unit.

**Why the split.** A burst is the grain this module has to offer: how long one landing sounds is
what a listener hears as its colour, and under ~50ms the repetition of that window is a pitch.
Measured in slots, `windowOf` computed `step.burst * (grid.slot / rate)`, so that pitch was a
function of the loop's length — moving an out point transposed every burst on the deck, and the
same spec sounded like a different instrument on a 1s loop and a 4s one. Distance and rest are
rhythm, and rhythm is exactly what should follow the loop a performer snapped.

So the unit is chosen per knob by what the knob sets, not by what its neighbours are measured in.
`SYNC_MIN_SECS` had already made this choice for the same reason ([0097](0097-yards-jump-on-one-session-clock.md)):
seconds are the one thing yards with different loops can share.

**The floor is now reachable.** `PLAYER_BURST_MIN` is `PLAYER_MIN_SLOT_SECS` exactly, so the knob
bottoms out where the sound does. In slots it could not: the floor a spec could ask for was above
or below the transport's, depending on which loop it happened to be over, which is what
[0108](0108-the-only-wait-between-two-jumps-is-the-clock.md) and
[0115](0115-the-burst-floor-is-the-seam-and-moves-with-it.md) were each arguing around. The clamp
in `windowOf` is kept anyway and is now unreachable from a valid spec: `PLAYER_MIN_SLOT_SECS` per
repeat is what makes `MAX_PLAYER_STEPS` cover the re-arm cadence, and that has to hold whatever the
knob's own floor becomes.

**What the rate does now.** `windowOf` no longer divides the burst by the rate, so a held rate
changes only how much buffer one window reads — pitch and speed, never length. A step at 2× is
exactly as long as one at 1× and gets twice as far through the loop, clamped at the loop's end the
way any jump is. `rest` keeps its divide, so a fast step still rests proportionally less.

**`PLAYER_FADE_SECS` and `PLAYER_MIN_SLOT_SECS` moved to `src/lib/player.ts`** from
`src/audio/transport.ts`. `PLAYER_BURST_MIN` is the floor and lib may not import from audio
([map.md](../map.md)); declaring the number twice and hoping is the thing the tier rule exists to
prevent. Neither constant ever touched the graph, so this is the promotion map.md describes.
`transport.ts` keeps no import and stays the leaf its `@role` claims.

Pre-release, so a stored spec with a slot-valued burst is refused by `assertPlayer` and the session
discarded rather than converted ([0026](0026-pre-release-has-no-migrations.md)). A burst of 4 —
four slots before, four seconds now — is out of range, which is the loud failure and not a loss.
