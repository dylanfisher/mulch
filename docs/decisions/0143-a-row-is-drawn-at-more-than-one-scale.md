# 0143 — A row is drawn at more than one scale

The drift said one thing at one size. Every row was a single spacing, every profile a
fundamental with at most one decoration, and every frame was drawn as though no frame came
before it — so the picture had texture but no structure inside its own texture.

Four things a row may now be at more than one scale, and the bound each of them carries:

- **A profile may be an octave stack.** A profile is any zero-mean wave at mean ½, so `lobe` —
  reverb's, a tail — is now `cos t + ½cos 2t + ¼cos 4t` scaled to swing between an open slit and
  a shut one. It stops at the fourth harmonic because the drawing does: `TILE_PX` samples one
  cycle sixty-four times and `gratingPitch` draws it at between three and a half and fourteen
  device pixels, so a harmonic past about the eighth is a spacing the pixels alias rather than
  beat. Raising the tile to buy the higher octaves is its own step and not a side effect of this
  one ([0012](0012-no-one-feature-jumps-the-gate.md)).
- **A row may claim `octaves`.** It is then drawn N times, each copy an octave coarser and half
  as deep, so one effect lays down a fine texture and a coarse one. A copy is drawn outside the
  band `gratingPitch` holds a row's own pitch inside, on purpose: what a copy beats with is every
  other row's copy at _its own_ octave, which stands at the ratio those two rows already stood at.
  `tape.feedback` claims it — the regen is how many repeats come back, and a repeat of what has
  just been heard is one more copy of the same texture. Neither value the step named could take
  it. Reverb's decay could not because reverb is radial: a ring family cut on a logarithm moves by
  being scaled, so an octave of one is a different ring count and a picture-sized bake per copy —
  the one thing that must never reach a frame
  ([0142](0142-a-row-is-cut-on-a-coordinate-of-its-own.md)), which is why `octaves` joins `chirp`
  in `STRAIGHT_DIMENSIONS` and the registry refuses a curved entry a claim on either at load
  ([0122](0122-a-registry-answers-for-itself-at-load.md)). And `tape.time` could not because an
  octave count is three steps: a tape's repeat time is the one value it has that varies its row
  continuously, and mapped onto three steps a tape at its own default would have said nothing at
  all through it, which is the state [0139](0139-a-row-is-what-an-effect-is-set-to.md) ended.
- **A frame may carry the frame before it.** The last field is laid back onto this one, a little
  larger and a little turned, at `feedbackAlpha` of it — `delay.feedback`'s value, which is a
  repeat of what has already been heard. **The share is bounded by `DRIFT_FEEDBACK_CEILING` and
  not by the knob's own range**, because this is the only thing in the picture that compounds:
  laying a field back onto itself at a share of one takes it to opaque, which is a picture with
  nothing left in it. Under one it settles at `feedbackSettles` instead, and that fixed point is
  what the proof asserts. The turn rides the asking row's own phase and never a count of frames
  ([0126](0126-the-screen-rides-the-pictures-own-phase.md)), and **so does the accumulation
  itself**: the stack deepens once per turn of the asking row and never once per painting, because
  a canvas is painted on every commit as well as on every frame and a halted yard is painted and
  not animated ([0040](0040-automation-holds-where-the-transport-left-it.md), `src/ui/canvasSurface.ts`) — a stack
  that advanced per painting would make a stopped picture a function of how often React committed.
  The kept frame is forgotten by every path that draws no picture, so a field is never laid back
  into a picture the yard has since stopped drawing.
- **The yard's recurrence is a row.** `recurrenceLength` already knows when every period in the
  picture next lines up, so the picture carries a grating on it — the one period no knob owns.
  It is added after the periods are read and is not one of them: it is the estimate's own
  answer, so feeding it back in would let a row the picture added to itself decide how wide a
  window the picture is drawn across and how long the whole thing takes. It is drawn **only where
  it comes round twice inside that window**: `gratingPitch` bands every spacing, so a recurrence
  of eighty seconds and one of a hundred million draw the same grating and the second never moves.
  The usual answer is on the order of geological time, so most yards get no macro row — a period
  the picture cannot show it coming round on is a line and not a band.

Durable shape: none. Nothing about a picture is stored
([0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md)).
