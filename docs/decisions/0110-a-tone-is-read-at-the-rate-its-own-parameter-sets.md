# 0110 — A tone is a reference buffer read at the rate its own parameter sets

A tone's pitch was an argument of `deck.load`: `{ gen: "tone", secs, hz }`, a `LoadField` that
committed on Enter and re-loaded the deck, which stopped the tone to change it. Every other
continuous value on this instrument moves with the hand and is heard where it is turned. So the
pitch leaves the stored `SourceRef` and becomes `deck.tone`, declared once in `src/audio/params.ts`
like any other deck parameter — which puts it in the registry, in the knob row, in a clip and in
the archive without a second path for any of them. A stored tone that still carries an `hz` no
longer validates and is discarded (0026).

**The buffer is the reference, and the pitch is the read rate.** The tone renders once at
`TONE_REF_HZ` over `TONE_SECS` — a whole number of cycles, so the loop join is seamless at every
rate — and `deck.tone` in hertz is `hz / TONE_REF_HZ` on the read rate, alongside speed's
multiplier and pitch's semitones. That is why the tone loads at length 1 and loads looped: one
second of the reference is one second of wave with no beginning, and an unlooped one would stop.
The alternative was an `OscillatorNode`, whose `frequency` is an AudioParam of its own — but the
whole transport is written against a buffer: an offset to start at, loop points, a plan the
worklet counts cycles against, a jump pass that builds one source per step. A second kind of
source is a second transport, and there is one signal chain.

**Which makes it a rate parameter, so it is stepped and not automatable — 0031's exclusion,
not a new one.** `deck.tone` joins `deck.speed` and `deck.pitch` in `playbackRate`, which is now
the one statement of all three; the three UI call sites that spelled the first two out reach it
through `deckRate` instead, so a fourth input would find one site rather than three (plan §4).
A move steps at `when` and rebases the plan exactly as a speed change does, so the source keeps
playing and only the arithmetic is told: a pitch move mid-render is a continuous bend, and the
render's click count is what says so. A lane would make the rate a continuous function of time,
which every piece of position arithmetic on both sides of the worklet seam is written against not
being — the same reason speed and pitch carry no lane.

**Two parameters, one AudioParam.** Pitch in semitones and tone in hertz both land on the buffer
source's `detune`, which the chain writes as their sum in cents. One declaration each, one binding
each, one node value — the deck's `held` map is where they meet, and it is the only place they do.

**A generator is what the menu picks between.** `SOURCE_LABEL` said "Source", which is the shape
of the thing and not the thing: every entry in `GEN_KINDS` makes a sound from nothing. It is
`GENERATOR_LABEL` and it says "Generator", once, in `copy.ts` with the rest of the instrument's
words.

**A control is offered where its value can be moved back.** The loop's handles and the Shift
sweep are drawn on every source except a tone, and so is the loop toggle: a wave with no
beginning has no boundary to place, and a tone that is always looped has no loop state a toggle
could move. That invariant is stated in the reducer rather than at the controls, so a hand-sent
`deck.loop` meets it too — a clear on a tone is refused with an error and the loop put back —
which is what keeps the stored session, the restore and the render from disagreeing about
whether the tone loops.

The tone's own knob goes the other way: it is drawn on every yard, because its value bends every
yard. `deck.tone` is a rate input alongside speed and pitch, so a knob withdrawn with the source
would strand a yard reading at a ratio nothing on screen could put back — pick a tone, turn it to
880, pick a sine, and the sine is an octave up with no dial for it. One declaration, one value per
deck, and one control that always reaches it; a deck at the default carries a ratio of one and
hears nothing.
