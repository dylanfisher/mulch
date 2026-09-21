# 0390 — A second stop clears the tails

- **Date:** 2026-09-21
- **Status:** accepted

**A global Stop that lands on a session where nothing is playing asks every rack for its tails**
(`session.silence`, src/app/commands.ts; `silenceRacks`, src/app/rackRebuild.ts): "if possible,
make it so pressing stop when already stops clears all noise (feedback, etc.)". The first press
moves every playhead home and ends the run; the delays and reverbs go on ringing behind it,
because a master lane rides the context's own clock and that clock never stops (0321). The second
press is what takes them away.

**Fresh nodes, because nothing else empties a delay line.** Each rack is torn down and stood back
up out of the entries the session already holds — the same walk a restore makes over the master
rack, now written once and read by both (`rebuildRack`). There is no parameter that means "forget
what you are holding": turning a mix down leaves the feedback loop circulating behind it, and a
ramp to nought and back would only cover the tail while it was down. Nothing durable moves and no
deck is told; what is lost is exactly what the nodes were carrying.

**The tail is cut, not faded.** A rebuild is instantaneous, so what was ringing stops between one
sample and the next. That is the same cut a restore already makes when the rack it comes back to
differs, and it is the gesture's own meaning — a hand pressing Stop twice is asking for silence
now, not for a release. A fade would need a gain per rack that no rack has.

**The clocks go down again behind the rebuild.** A rack remembers neither its sync nor its tempo
— both fan out over the instances standing at the moment of the call, and a fresh instance is
built from its values alone — so an entry that paces itself by the session's beat would come back
at nought and lay nothing (`lull`, src/lib/lull.ts). Every other rebuild in the app already pushes
them down beside itself; this one does too, per rack, after its instances are standing (0097,
0371).

**"Already stopped" is the pair one yard's own Stop button is disabled on** — not playing _and_
holding no playhead (src/ui/DeckTransport.tsx). A paused yard has something to stop, so Pause then
Stop is a first Stop and the reverb the hand paused under is still its to hear out. A source that
ran out by itself reads as stopped, because it is: the step's own words are "a Stop pressed with
nothing playing", and there is nothing for that press to stop.

**And the rest of it is read off `playing`.** The graph writes that field false the moment a halt
returns, and the lookahead it lags by is on the way up (0052), so the answer to "did the last
press stop everything" is already in by the time the next one arrives. This is the read the Space
key may not make, for the opposite half of the same fact: a play is not visible for a lookahead,
so resolving a toggle here would rewind every yard (P66). A session holding no yards at all reads
as not playing, which is honest — the master rack is there whether or not a yard is.

**No third button.** The gesture is the Stop already on the bar; what it means is decided at the
press, from the session the press can see (P41). The palette's stop is one yard's own
(src/ui/CommandPalette.tsx) and sends none of this, for the reason a yard's own row sends no
rewind: one yard stopping is not the session ending (P66).

**Not chosen:** a transport button of its own; a ramp to nought and back; clearing on the first
Stop, which would cut a reverb a hand had just stopped a yard under and wanted to hear out.
