# 0397 — The picture has a switch, and off is not mounted

- **Date:** 2026-09-21
- **Status:** accepted, resting on
  [0070](0070-a-per-frame-read-refills-and-never-clears.md) for what the picture's frame path
  costs, and following [0379](0379-a-yards-sequence-is-a-fade-over-its-own-gain.md) for the shape
  of a switch on the header bar.

**The drift is switchable, and the switch is a view preference.** One toggle beside the sequencer's
and the theme's, kept under `mulch:drift` through the one guarded read and write every preference
outlives a reload by (src/ui/preference.ts, src/ui/driftShown.ts). It sends no command, changes no
session state and leaves no history entry (plan §2): a machine too slow to draw the picture is a
fact about the machine, and nothing a session carries between them may rest on it.

**Off is not a cheaper picture: it is no picture.** `MoireStrip` reads the switch and mounts
nothing under it — no canvas, no surface asked of the tile shop, no bake on this thread or in the
worker, no frame callback, no observer, no estimate and no second window. This is the rule the closed
overlay and the halted yard already keep, said for a third seam. A picture
drawn at a lower cadence, or drawn once and left, would be a second drawing path to keep in step
with the first, and the whole of what a slow machine is asking for is the loop gone.

**The switch is not a guess about the machine.** Nothing samples a frame rate and decides; the
picture goes off because a hand switched it off, and it is on for everyone until then. A mode that
guesses would be a fourth thing that decides how the picture is drawn, and the one it would most
often be wrong about is a machine the human has already tuned by hand (0299).

**The switch covers the drift and nothing else.** The waveform, the lane previews, the scope, the
clip thumbnails and the master meter each draw a picture of their own, and each is a reading a hand
is looking at rather than a field being worked out behind the sound. What the seven-yard reading
behind this step found is that the drift is what the frame budget goes on: five more yards, each
carrying a strip, took the frame rate from 104 to 48 a second and the rAF p95 from 24.9 ms to
69.6 ms, on the same rack and the same walk. A switch over the rest would be four more preferences
buying what this one buys.

**A folded yard is not a yard with its picture off.** Folding unmounts the yard's body — its knobs,
its peaks, its mulcher card and its rack — but the strip moves into the header and goes on painting
at the same cadence, narrower. So the answer to "does collapsing a deck free resources" is: it
frees everything except the expensive thing. Whether a fold should also take the picture is a
choice for the human, and it is written down in plan §4 rather than taken here.
