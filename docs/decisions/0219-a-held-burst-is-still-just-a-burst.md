# 0219 — A held burst is still just a burst

- **Date:** 2026-08-30
- **Status:** accepted

The mulcher card can arrive at its burst three ways now — the dial, a number typed into its readout
([0201](0201-a-dial-can-be-told-a-number.md)) and a tap — and it can hold what any of them writes to
the beat. **None of that is a field of `PlayerSpec`.** The burst stays what
[0119](0119-a-burst-is-seconds-and-the-rest-is-slots.md) made it: one number in wall seconds, and
the walk, the transport and the archive cannot tell which gesture wrote it.

**So the hold is the card's own state, held by the yard beside its folds.** It writes no number of
its own, it changes nothing the walk reads, and a burst it rounded is an ordinary burst — which
makes it a view preference and not an edit (plan §2, [0026](0026-pre-release-has-no-migrations.md)).
Storing it would mean a session in which the same spec means two different things depending on a
toggle nobody can hear, and a hold restored onto a deck whose source no longer has a tempo.

**The rounding lives in one place**: the patch the card hands every control that writes a burst
(`usePlayerBurst`, src/ui/playerBurstControls.ts). "Rounds whatever is written" is one rule and
three writers, and a rounding repeated per control is three places for the fourth writer to be
forgotten at (principle 1).

**The beat is the sounding one** — `analysis.bpm * deckRate(params)`, the figure the yard's own
waveform reads out (0031). A burst is wall seconds and the sample is played at a rate, so a burst
held to the unscaled tempo would be held to a beat nobody in the room can count. A deck whose
analysis is null or whose `bpm` is nought has no grid at all, so the toggle is refused rather than
absent ([0121](0121-a-framed-plus-is-a-door.md),
[0173](0173-the-card-is-boxes-and-a-refused-dial-is-drawn.md)) and `beatBurst` throws on a tempo of nought
rather than guessing one (principle 5).

**Divisions are nearest in ratio, not in difference.** They are a halving sequence and the dial that
draws them is logarithmic, so the crossover between two of them is their geometric mean — the middle
of the dial's own travel. By difference the beat itself would take a third of the sweep and the two
shortest divisions would share a hair of it.

**A part's fold draws the dial alone.** It holds neither the yard's toggle nor the deck's analysis,
and half a gesture drawn where the other half cannot follow is a control that means one thing on the
card and another under a part (0176).
