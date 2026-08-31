# 0229 — A reading may move where a row stands, as well as how deep it cuts

- **Date:** 2026-08-31
- **Status:** accepted, amending
  [0128](0128-every-motion-in-the-screen-belongs-to-a-parameter.md) and
  [0142](0142-a-row-is-cut-on-a-coordinate-of-its-own.md)

Every curved row no effect gives a `centre` claim to rested at `DRIFT_REST.centre`, so a rack of
them piled every axis on the middle of the picture: the field's best feature — the rosette two
nearly coincident ring families throw — happened in one place, where nobody had turned a knob, and
held still until somebody did. **A curved row now rests where its own fold puts it**
(`effectRowCentre`), a third independent read of the same number its shape and its period already
are ([0076](0076-a-card-reads-itself-out-of-its-own-id.md)), and its anchor is carried around that
rest by its own phase over its own period. A row whose effect claims the dimension still stands
where its knob puts it: this is the rest value and not an override
([0139](0139-a-row-is-what-an-effect-is-set-to.md)).

**The punch is what needs the amendment.** 0128 amended says a reading may move exactly one thing —
how deep the row of the instance it was read from cuts — because a number no parameter owns must not
be able to answer the question "which parameter is doing what". `row.pulse` now also throws that
row's anchor a little further off its rest. The case for widening it is that an anchor is not a knob
position but _where the row is standing_, and a reading that moves where one row stands cannot be
misread as a knob nobody turned. Everything else 0128 says stands: the screen's four motions are one
parameter each, a motion no row claims is still, and the reading is per frame, never durable and
never in `driftFrom`.

**The travel is stated in steps of the ladder the tile is keyed on, and that is what makes it
affordable.** A curved row's tile is a picture-sized bake keyed by `stepped(row.centre,
DRIFT_CENTRE_REACH)` ([0142](0142-a-row-is-cut-on-a-coordinate-of-its-own.md)), so the swing is one
step of that ladder and the punch half a step: a whole period's travel visits at most four stops,
which is inside what the curved shop holds, and the number of bakes is what it was rather than one a
frame. Written against the raw anchor the same step is a bake a frame, which is the one thing that
must never reach the frame path ([0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md),
[0144](0144-the-picture-may-fall-behind-the-hand-may-not.md)) — so the proof that holds this down
counts distinct tiles across a sweep, not pixels. `DRIFT_STEPS` therefore lives in `src/lib/moire.ts`
beside the reaches rather than beside `stepped`, which spends it: how far an anchor may travel and
how finely a tile is keyed are one fact.

**It is the rows an instance contributes, and not every curved row in the picture.** A lane's row is
curved wherever its effect is, and it still rests at `DRIFT_REST.centre`: what a lane draws is the
gesture (0128), and its own motion is already the phase its knob is being turned through. Giving
every automated knob on a curved effect a drifting anchor of its own would also multiply the tile
shop's key count by the travel — several rows times four stops against a `CURVED_CACHE` of eight —
which is the one cost this step is bounded by. So an automated reverb still stands where the picture
put it, and what moves is the instance's own row and the rows an automator grew.

**And the anchor moves in steps, because the ladder is the whole bound.** What the eye sees is a
handful of positions a curved axis snaps between over a period, not a glide — that is the price of
never baking on a frame, and it is why the reading this step takes by eye is a look at the field's
structure rather than at one row travelling. A fan's apex, which already walks a circle to carry its
phase (0142), now walks it about an anchor moving on the same phase, so it travels an ellipse.
