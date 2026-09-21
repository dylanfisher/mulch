# 0388 — A burst that outlives the loop wraps it

- **Date:** 2026-09-21
- **Status:** accepted

**The burst reaches sixteen seconds (`PLAYER_BURST_MAX`, src/lib/player.ts), and a burst with
less than that much loop left in front of it loops the whole bed instead of the window it asked
for** — entered at the slot it landed on, so it plays its slot, runs off the bed's end and carries
on from the bed's head (`slotRead`, src/audio/playerWindow.ts). The report: "increase mulcher burst
timing to be up to 8 or 16 seconds. if a burst needs to wrap around a loop to satisfy the length
requirement it should do that, rather than get cut off at the end."

**Because the clamp that was there turned the ceiling into a stutter.** The source's window was
`min(burst × rate, bed end − slot)`, so a landing near the top of the grid looped a fragment of the
tail for the whole of its burst: at two seconds that was audible, and at sixteen it is the one thing
the new ceiling would be good for, played back as a few hundred milliseconds repeated forty times.
Nothing was ever cut to silence — the window is what was cut — so the wrap is a bigger window and
not a second source, and a burst still sounds for exactly as long as it says.

**The bed's own end, never the buffer's.** The clamp's reason survives the wrap: a landing on the
last slot of a moved loop that read on past the bed would read audio the pattern never chose
(0183). The wrap is the same refusal said the other way round — the read cannot leave the bed, so
where it would it comes back at the head.

**Read backwards it enters at the bed's end.** A reversed landing reads a mirrored copy, so its
window is `[duration − from − span, duration − from)`; a wrapping one therefore walks the whole bed
from its end down to its head and round again. A burst that covers the bed has no slot left to
begin at, only a phase, and entering where the clamped read already entered leaves that one
subtraction — the only place this module can land before frame zero (P121) — exactly as it was.

**The cursor follows the source, not the slot.** The queue entry carries how far into its window
the slot is (`enters`), and the playhead takes its modulo over the window and adds it, so a
wrapping landing's cursor runs off the bed's end and comes back at its head. A cursor that snapped
back to the slot there would be the instrument showing one thing and playing another (P121).

**What this costs:** the readout drops a decimal where a hundredth would spend a fifth character
(`burstLabel`, src/ui/Knob.tsx) so a compact dial's column stays four wide at every reading, and
its parser now reads the unit off the spelling rather than off the dial's top: the ceiling passed
the smallest reading the box draws, so typing back the `5` the floor itself reads out would have
set five seconds. A whole number is milliseconds unless milliseconds would fall under the dial's
own floor, where it can only have been seconds, and every reading the box draws round-trips. The
tap's run-restart gap becomes the dial's own top rather than the burst's, or the delay's Time
would hold a run for sixteen seconds on a range that stops at two. `PLAYER_VARY_MAX` follows the
burst's ceiling up, as it always has. A stored spec above the old ceiling is still refused; one
below it is unchanged, so nothing durable moved.

**And a landing with repeats becomes one read the fader re-gates**, where before each repeat
re-entered at the slot: the bed is not a multiple of a repeat's length, so a wrapping landing's
second repeat opens wherever the read had got to. That is the wrap heard rather than a fault —
the clamped window already broke the retrigger, since the tail it looped was not a burst long
either — and the cursor takes its modulo over the same window, so the picture says it too.

**Not chosen:** a burst longer than the loop played as two bursts, which is a landing per pass of
the loop and a seam in the middle of one grain; and divisions of the beat _above_ the beat, which
is what a held sixteen-second burst would need to be anything but the beat itself — the hold
rounds onto the six divisions it already had.
