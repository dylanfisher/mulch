# 0108 — The only wait between two jumps is the clock, and the burst floor is musical

Two questions about the player's own timing, measured rather than argued.

**A yard with no clock waits for nothing between two jumps, and it already did.** A pattern
resting for zero lays each step's start exactly on the previous step's end, so the two sources
overlap by one seam and the crossfade sums to one. `PLAYER_MIN_SLOT_SECS` was the other suspect
and is not a wait: it lengthens a window, it never inserts one. So the waits are the clock's tick
(`session.sync`, 0097) and the gate closing inside a repeat — both numbers a knob holds — plus one
that is neither: an arming tick that arrives after the queue has drained skips the cursor to the
clock, which is the recovery 0089 records rather than a timing choice, and is unreachable offline.
Nothing was moved. The claim is now held by `scripts/smoke.d/renderPlayer.js`, which renders an
ungated zero-rest pattern and asserts its fingerprint carries no silence span beginning after
frame zero, against a resting one that does.

**A burst may be a slot's sixteenth, and the seam floor is not the spec's floor.**
`PLAYER_BURST_MIN` is `1 / PLAYER_SLOTS`, so the shortest burst stands to a slot as a slot stands
to the loop. It is a musical range in slots and owes nothing to the fades: what a burst shorter
than its own two seams is, is the transport's answer, and the transport already gives it —
`windowOf` plays such a window at `PLAYER_MIN_SLOT_SECS`, exactly as a loop whose slots fall under
that floor is played straight rather than jumped (0089, plan §4). That per-repeat floor is also
what keeps one arming ahead of the next, so it holds whatever `PLAYER_BURST_MIN` becomes.

**Amended, 0119:** `PLAYER_BURST_MIN` is `PLAYER_MIN_SLOT_SECS` — a burst is wall seconds now, so
the knob's floor and the seam's are one number and the paragraph below is settled rather than
argued. The rest of this decision, which is about waits and not units, stands.

**Amended, P82:** `PLAYER_BURST_MIN` is now `1 / (PLAYER_SLOTS * PLAYER_SLOTS)`. The sentence
above about the seam floor being the transport's answer is exactly why: a slot's sixteenth sat
above `PLAYER_MIN_SLOT_SECS` on every loop a person snaps, so the knob bottomed out before the
sound did, and the number that had to move was the seam. See 0115.

The validation range widened, so a spec written after this does not load in a build before it.
Free while pre-release (0026).
