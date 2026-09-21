# 0389 — A beat count sets the loop's end

- **Date:** 2026-09-21
- **Status:** accepted

**A loop may be said as a count of beats, and the count is derived both ways rather than stored**
(`beatsLoop` and `loopBeats`, src/lib/analysis.ts; the field, src/ui/LoopBeats.tsx). The field
beside the snap toggle reads the loop's length back as the whole count a hand could have typed,
and a count typed into it sends the same `deck.loop` a drag on the handles sends — the start it
already has, and an end that many beats along: "Add ability to set loop based on beat count".

**Nothing durable holds the count.** A loop is two numbers in seconds and stays that way, so no
stored session changes shape (0026) and the same loop reads as a different count the moment the
analysis is remeasured — which is right, because the analysis is not a pure function of the bytes
(plan.md §2). A stored count would be a second source of truth for one edge.

**In the buffer's own seconds, not the sounding ones.** The count multiplies `analysis.bpm` and
never `soundingBpm`: a loop is a region of the buffer, so four beats of the source stay four beats
of the source at any speed, while the readout beside the field reports what the ear hears (0031).

**A count that does not fit is refused, not shortened.** Anything but a whole count of at least
one beat, and any count whose end would run past the source, leaves the yard's loop alone and puts
the field back to the loop's own number — a hand that asked for eight beats and was handed six has
been told nothing (principle 5, the refusal src/ui/LoadField.tsx already makes of a load). So does
a field still reading what it was handed: the read is a rounding, so a blur that typed nothing
would otherwise square a 4.03-beat loop up behind the hand — restarting the yard and landing an
undo step nobody asked for, on every click away from a field that was only looked at. The price is
that squaring that loop up takes another count and four again. The field is uncontrolled and
remounted on the loop itself rather than on the count it shows, because two loops read as the
same four beats are still two loops and a half-typed count must not outlive the start it was
typed at.

**Withdrawn where there is no tempo.** `analysis.bpm` is 0 for a source with no beat in it, and
the field is not drawn at all rather than drawn dead — the way a tone is offered no loop toggle
(0110). Both helpers throw on a tempo-less call, so a caller that skipped that refusal is a bug
rather than a guess (the throw `beatBurst` already answers one with).

**The blur-or-Enter commit is now one hook, and so is the beat.** `useFieldCommit`
(src/ui/InlineField.tsx) replaces the four copies of one handler pair the inline fields had grown
— src/ui/DeckTag.tsx, src/ui/LoadField.tsx and src/ui/PlayerSeed.tsx read it from there — and
`beatSecs` (src/lib/analysis.ts) replaces the three copies of `60 / bpm` and the refusal in front
of it, which src/lib/lull.ts and src/lib/playerBurst.ts now call. Principle 3 on the occurrence
that earns it, in both cases. A field that answers more keys than Enter (src/ui/KnobReadout.tsx)
is a different gesture and stays its own.

**Not chosen:** a stored beat count; a count that moves the loop's start as well, which is what
the handles are for; and clamping an oversized count to the end of the source.
