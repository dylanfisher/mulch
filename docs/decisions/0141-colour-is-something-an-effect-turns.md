# 0141 — Colour is something an effect turns

- **Date:** 2026-08-24
- **Status:** accepted, extending
  [0130](0130-the-fringe-is-the-rows-own-ink-split.md),
  [0137](0137-an-effect-declares-the-wave-it-draws-with.md) and
  [0139](0139-a-row-is-what-an-effect-is-set-to.md); the fourth reviewed crossing of the colour
  boundary ([boundaries](../boundaries.md))

Every hue in the drift was three constants inside one tile — `CHANNEL_MIX`, `CHANNEL_LAG`,
`CHANNEL_FRINGE` — over one ink the canvas resolved once off a `text-*` token. Fixed constants over
one colour is a picture that reads as one hue with a fringe on it whatever the yard is playing:
0130 built a fringe and 0137 pulled it across a blob, and both are working exactly as written. What
neither of them is, is **something a performer can turn**.

**Three dimensions join `DRIFT_DIMENSIONS`, and they are colour where the other four are shape.**
`fringe` is how far the three channel lattices stand apart, as a ratio on the lag the picture rests
at: nothing at one end — three lattices on top of each other, which is a row in one flat hue — and
twice the resting lag at the other, a third of a beat cell each, which is as far as three lattices
stand before they begin closing again. `disperse` is whether they are the same lattice at all.
`hue` is where between two inks the picture is drawn. They are declared reaches like every other
dimension (0139), so a value reaches the picture by an entry saying so and never by a painter
growing a branch: `eq.q` claims the fringe, because a wide band touches everything either side of
it and a narrow one separates; `reverb.predelay` claims the dispersion, because it is how long the
reflections take to arrive; `reverb.tone` claims the travel, because a dark room and a bright one
are the two ends of it.

**A screen is one tile over the whole picture, so these three cannot be per row.** Each is read off
the row that says it loudest — furthest from rest either way, so a knob at nothing takes the
picture monochrome as surely as one at the top takes it chromatic. Not the mean: an effect that
says nothing about colour would dilute the one that does, which is the knob's whole travel. Not the
first: which row that is, is an ordering nobody chose.

**Dispersing a lattice is whole cycles and whole cells, and that is a constraint rather than a
choice.** The tile is one beat cell wide and a whole number of them tall, and it is shifted rather
than rebuilt: anything but an integer divergence is a hue seam riding down the picture once a
cycle, which is the artefact these terms exist instead of. So `disperse` crossfades each channel
away from the shared lattice onto one whose pitch is a whole number of cycles per cell and whose
axes are leaned into each other by a whole cell of the other.

**And a tile is now something a knob moves.** Its other three keys — the colour, the height, the
density — move on a scheme or a resize; these move on a pointer. Each is rounded onto eight steps
of its own reach before it reaches a tile, which is finer than the eye reads a hue shift at and
coarse enough that a whole drag costs eight rebuilds rather than one per pointer event: the loop
over the pixels stays off the frame path, which is what 0129 is for.

**The second ink is the crossing, and it is two tokens rather than a colour.** `--drift-cool` and
`--drift-hot` join `src/ui/tokens.css` beside the three channels, registered as `<color>` for the
same reason those are, and the painter blends the ink its caller resolved between them by however
far a row claimed. No colour literal moves out of that file and no surface but the drift reads
them. What is genuinely new is that the picture's colour is no longer only the token a component
asked for — so it is written here first, the way 0006 and 0015 were.

**What is not taken: the picture's own rows are not cut per channel.** The step that wrote this
asked for a dispersing row to be cut three times, once per channel token, so colour would erupt in
the fringes of the moiré rather than in the screen behind it. `moireCanvas` cannot: every row is
cut with `destination-out`, which reads a source's alpha and discards its colour, and the field is
handed to the canvas the same way. A per-channel cut needs the picture to carry colour rather than
be a mask — three surfaces and a blend, not three fills — which is a change to what the painter is.
The dispersion is at the screen's three lattices instead, where it costs a rebuild and nothing per
frame. It stays available to whichever step is willing to pay for a colour-carrying field.
