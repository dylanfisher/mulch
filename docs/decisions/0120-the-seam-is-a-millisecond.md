# 0120 — The seam is a millisecond, and the floor is five

- **Date:** 2026-08-22
- **Status:** accepted

`PLAYER_FADE_SECS` is 1ms, so `PLAYER_MIN_SLOT_SECS` and `PLAYER_BURST_MIN` are 5ms: the burst dial
reads `5` at its floor and the module draws two hundred grains a second. `PLAYER_REPEATS_MAX` is 64.

**Why both, together.** The two knobs are one gesture. At 5ms a landing that repeated at most
sixteen times was over in under a tenth of a second, which is a grain and not a landing — the
shorter the burst, the more of them one position takes to be heard as a position at all. Sixty-four
of them at the floor is a third of a second, which is a landing again.

**What moved with the fade**, the three [0115](0115-the-burst-floor-is-the-seam-and-moves-with-it.md)
named, checked in that order:

- `MAX_PLAYER_STEPS` doubled to 1024. One arming must cover `AUTOMATION_REARM_SECS`; the floor
  halved, so the cap doubled to keep `PLAYER_MIN_SLOT_SECS * MAX_PLAYER_STEPS` at 5.12s against a
  4s cadence — the same margin, not a new one.
- `gridOf` refuses less: a loop divides into jumpable slots down to 80ms now, half what it was.
- `PLAYER_BURST_MIN` is still `PLAYER_MIN_SLOT_SECS` and `PLAYER_BURST_STEP` still its sixteenth,
  so the dial reaches its floor and an arrow key on it still moves. The log curve is unchanged.

**What 0115 asked for and this did not get.** 0115 says the next halving is not arithmetic that can
be done on paper and is measured in a room first. It has not been: 1ms is ~48 samples at 48kHz for
one equal-power crossing, which is a common anti-click fade and is above the ~10 samples where a
crossing itself becomes the click — but the floor of this instrument is now a number argued from
the literature rather than heard. The three costs the re-arm pays scale with it: the steps alive
across the horizon at the floor, the tail a knob's drag rebuilds, and the wind-forward
`playerWalk(spec, laid)` does, all double again at the bottom of the burst dial
([plan §4](../plan.md)). If the seam is ever heard as a click, this is the decision that moved it,
and the fade is the number to move back.
