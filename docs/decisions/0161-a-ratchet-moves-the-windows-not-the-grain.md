# 0161 — A ratchet moves the windows, not the grain

`ratchet` shrinks each repeat of a landing against the one before it, so the count is a geometric
run rather than a run of equal windows. `repeatSpans` in `src/lib/player.ts` is the one place a
repeat's length is computed, and its three readers spend it rather than restate it: `windowOf` ends
the landing at the sum, `seam` cuts the gate on the partial sums, and `playerRowPeriod` runs the
module's picture row on the same sum, because a picture that disagrees with the sound about how
long a landing is is worse than no picture ([0159](0159-a-song-is-the-pictures-one-stepped-row.md)).

**What it does not reach is the source's own loop.** `armStep` gives one looping
`AudioBufferSourceNode` a `loopEnd` of one burst, and a looping source has one period — so under a
ratcheted landing the grain goes on repeating at the burst's own length while the windows over it
shrink. At a shut gate a ratchet is therefore heard as a landing that ends sooner, and at an open
one as a stutter that accelerates. A ratchet heard in the grain itself needs a source per repeat,
which multiplies the node count of the busiest thing in the instrument and is a question the plan
already holds open for the rung walk; it is not a field.

**The gate's daylight is asked of each repeat, not of the landing.** A shrunk repeat reaches
`PLAYER_MIN_SLOT_SECS`, where a fade is a fifth of the window and the band a gate may be cut inside
is narrow ([0089](0089-a-jump-is-the-transports.md)). Read once off the shortest repeat, a deep
ratchet would switch the Gate dial off for the long repeats too; read per repeat, the long ones
stutter and the tail plays through. That is the rule `seam` always had — cut only where a whole fade
of daylight clears on both sides — asked where the answer can now differ.

Durable shape: `PlayerSpec` grows `ratchet`, behind the Repeats dial's own framed plus
([0135](0135-the-repeats-dial-gets-its-own-door.md)) because it is an amount of the count.
