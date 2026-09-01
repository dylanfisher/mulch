# 0257 — A press that writes nothing is a reading

- **Date:** 2026-09-01
- **Status:** accepted, narrowing [0232](0232-a-picture-is-a-control-only-where-the-pointer-is-the-value.md)

The walk's picture takes a pointer again. `[data-slot="player-scope"]` holds a button that fills
it, a press picks the landing under it, and the numbers of that landing are drawn underneath
(`blockAt`, src/lib/playerScope.ts; src/ui/PlayerLanding.tsx). **It sends no command.**

0232 is not overturned by this, because 0232's test is about what a gesture _writes_. Its case was
that the crosshair wrote `distance` and `repeats` — two numbers about landings in general, neither
of them anywhere on the sheet — so the sheet redrew under the pointer into a sheet the hand was not
aiming at: a drag whose target moves in answer to itself. A press that writes nothing cannot do
that. The sheet under the pointer is exactly the sheet that was pressed, and it holds still.

So the rule 0232 states — is the point under the pointer the value the gesture writes — governs
gestures that write. A gesture that writes nothing is a **reading**, and a reading may land wherever
a hand can see something worth reading. `distance` and `repeats` keep their declarations, their
bounds and their dials in Fine Tune, which are still the one road to both.

Which landing is being read is view state and never durable. It is kept as that landing's own place
in the run rather than as an index into the sheet it was picked on: the geometry is rebuilt at every
landing and the sheet turns over whole at its end (0187), and a pick held against the object it was
taken on went at the very next jump — a reading a hand cannot keep while the pattern plays is a
reading on a picture that is always playing, which is to say no reading at all (`pickOnSheet`,
src/lib/playerScope.ts). It is let go of when the walk carries it off the sheet, and not before.
Nothing per-frame goes through React state: the readout is rewritten only when the landing it is
about is drawn somewhere else, which is once a landing rather than once a frame.

The keyboard road is the button's own: it takes focus, says the picture's name, and the arrows step
the pick along the sheet. A picture a pointer can read and a keyboard cannot would be half a
control, which is the reason a `tabindex` on the box was refused in favour of a real button.
