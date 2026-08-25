# 0150 — A lane carries the colour it claims

- **Date:** 2026-08-25
- **Status:** accepted, amending
  [0139](0139-a-row-is-what-an-effect-is-set-to.md) for the three colour dimensions
  [0141](0141-colour-is-something-an-effect-turns.md) added

0139 wrote that a row is what an effect is _set_ to and that the value is read whether or not a lane
is riding it. For shape that is right: a lane already draws a row of its own, and a period, a depth
or a pitch that moved under it would be the gesture drawn twice. For colour it reads as a fault. A
lane on `tape.tone` travels the knob's dial, moves the sound from a dark machine to a bright one and
leaves the picture in exactly the hue the knob was parked at — the one dimension the ear hears
travelling is the one the eye cannot see travel.

**The three colour dimensions follow the lane; every other dimension stays what the knob is set to.**
Where a lane rides the parameter that claims `hue`, `fringe` or `disperse`, the row reads that
parameter live — `automationValueAt` at the phase `peek()` already files, which is the one reading of
a lane there is (0035) and the same one the dial beside it paints from. A lane the voice has not
armed reports no phase and the dimension rests where the knob is, which is what it draws with no lane
at all.

**Period is the reason the line is drawn here and not further along.** The recurrence estimate beside
the picture and the window every row is drawn across are built from the periods once per set of rows;
a period that moved under a lane would make both of them jitter at the paint cadence, and the
estimate is the one number in the picture that must hold still long enough to read. The rest of the
shape dimensions stay with it because 0139's argument still holds for them.

**It costs no more than a knob does.** `COLOUR_REACH` is one table in `src/lib/moire.ts`, spent by
`driftReached` when a row is built and by `refillRows` per frame, so a colour has one reach and one
spend (principle 1). What reaches a tile is still rounded onto the eight steps 0141 put there, so an
automated hue rebuilds at most those eight tiles and then draws from the cache — the loop over the
pixels stays off the frame path, which is what 0129 is for.
