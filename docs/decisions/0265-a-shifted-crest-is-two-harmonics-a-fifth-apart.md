# 0265 — A shifted crest is two harmonics a fifth apart, and its proof is a render

`fifth` is the second harmonic against the third, a quarter each — reaching a wholly open slit where
their crests coincide and stopping short of a shut one elsewhere, which is a depth and not a family.
It is the one wave in the list
whose shape is a frequency relationship rather than an envelope — a crest and the same crest heard
again a fixed ratio along — which is what a transposition is and what nothing else in the picture
says.

It carries no fundamental at all, and that is the property to keep. Every other profile has a first
harmonic, so no depth of any of them is this one; the pair worth checking is `twin`, which is also
two harmonics in step, but `twin`'s are an octave and these are a fifth, so the two beat into
different fringes at every pitch they are drawn at (0122). A future wave built on 2 and 3 at another
share would be this one at a depth ratio, which the registry does not catch and `moire.test.ts`
does.

The kernel's pair of heads is constant power or it is nothing. Each head's gain is a sine over its
own window and the second head stands half a window along, where that sine is `|cos|` — so the two
square to one everywhere, and each is silent exactly where it jumps a window's worth of capture.
Any other envelope on the pair pumps once per window, at the window's own rate, which is a tremolo
the knob never advertised. Constant power is not constant amplitude, and that is not a defect to
fix: the heads are one signal read half a window apart, so where the input's period divides that
half window an odd number of times they stand antiphase and cancel. That is the comb every two-head
shifter has, it is why Window is a knob rather than a constant, and both sides of it are pinned in
`shift.test.ts` so neither is rediscovered as a bug.

And the window is a read position, so it is glided and never assigned. A window that arrived between
two blocks would move both heads by the whole of the change at whatever gain they stood at, and a
crossfade cannot hide a jump it did not make — `shift.window` carries an automation lane, so this is
reachable from a knob as well as from a lane. Glided, what moves is the head's velocity rather than
its position: a window swept under a sounding tone bends it, the way `tape.js` glides its own time
and for the same reason.

And the entry's correctness is a claim about a frequency, so it is proved where a frequency exists:
`scripts/smoke.d/renderShift.js` renders a tone through `buildDeckChain` on an OfflineAudioContext,
decodes the file that render wrote and scans it for where the energy stands. A fingerprint cannot
say this — an RMS window reads the same whichever pitch it is holding — and neither can a knob.
