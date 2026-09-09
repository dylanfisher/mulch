# 0323 — A panner walks a sound across the field in pieces

**2026-09-08.** `src/audio/effects/panner.ts` is a registry entry whose face is Position, Spread and
Slice Rate over three toggles that **stack**: Band splits the signal at two crossovers and sits each
band at its own point in the field; Time gives the two sides their own short delay, and the far one
its own gain, so a move is heard arriving rather than switching; Slice gates the signal in antiphase
off one shaped sine and lands successive slices at their own positions. All three off is a plain
pan, which is where the entry ships.

**A toggle builds its stage and takes it away again.** Position, Spread and the rate are DC sources
and one oscillator that live for the instance; the stages are built and disposed as the toggles
move, and the chain is re-laid in declaration order around whatever is standing. The knobs are
sources rather than bindings onto a stage's node for exactly that reason: a binding onto a node that
has gone is a knob that moves nothing. A stage's taps off the spread source are let go from the
source's side, because a node's own `disconnect` releases what it feeds and not what feeds it.

Its presence is **Spread at nought over the plain pan it ships as**: the position and all three
stages are `held`. Silence here means the input passed through unchanged, which a stage standing is
not — a band split at no spread is three crossovers summed, and a time stage is ten milliseconds of
everything. Held, a run fades a panner in and out through the plain pan and never draws a stage; a
hand stacks whatever it likes on top of it.

**A stage lets go of its own taps before the sources they read.** A stage drops its taps from the
spread source's side, and a node told to release a destination it is not connected to throws — so
`dispose` disposes the stages first and stops the sources after them.

Its look is `stagger`, declared whole in `src/lib/moirePanner.ts`: the picture's rows displaced
across the field in six bands, by the spread, at the position — the field no longer standing in one
piece. Its wave is `cross`, a crest leaning across its own cycle, which is the slot the filter's
`slope` vacated rather than that wave under a new name. It takes the name pool the filter's
instances used to draw from, replaced whole, its nouns disjoint from every other pool.

The rate is a slice rate and not a pan speed. `deck.pan` takes a lane already, and a rate that is
not a lane would be a second kind of motion on an instrument that has one (0128).
