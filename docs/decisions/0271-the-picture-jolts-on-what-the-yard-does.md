# 0271 — The picture jolts on what the yard does

- **Date:** 2026-09-01
- **Status:** accepted, on
  [0213](0213-a-reading-of-the-output-belongs-to-the-field.md) and
  [0270](0270-a-row-arrives-as-the-fraction-it-is.md)

The one extreme movement the drift had was an accident: adding an effect restacked the picture's
weight in a frame, which 0270 removed. The movement was worth keeping and the trigger was not — a
picture that lurches only when a hand touches the rack is a picture of the hand.

**A jolt is a reading of the yard, on the field, spent through every row's own `pulse`.** It rests
at nothing, snaps up outright to whatever struck this frame and falls back over `DRIFT_JOLT_SECS`.
Up outright because a hit that eased in is not a hit; down at a rate because one that vanished on
the next frame is not a jolt.

**Two things strike it, and both are already read.**

_The output._ The crest of a window is one reading with three bands: under `WASH_CREST_SMEARED` the
gaps between the transients are filled and the field washes; between that and `WASH_CREST_STRUCK`
the picture says nothing about the window's shape; past `WASH_CREST_STRUCK` a transient is standing
further and further clear, and that is the hit. The jolt begins exactly where the wash stops, so
there is no second measurement of the same window.

_The walk._ How far the pattern just jumped, as a share of the furthest it could on the grid's own
ring. The distance and not the fact of a step: a pattern creeping round its neighbours and one
thrown across the loop are two different things to watch. A hole strikes nothing, which is the test
every row in the picture is already built through. Once per landing, told by the ordinal `peek()`
already counts.

**How far a jolt throws is the age's** (`agedJolt`). A fresh performance lurches over half the room
and one that has been running over the whole of it — the age widening what a term may reach rather
than inventing one (0141). Not multiplied by the run standing as well: a busier rack is more rows to
throw, so the population already reaches this, and 0244 refused exactly that doubling once.

**Spent as a floor under every row's own reading** rather than as a fourth argument to the painter.
`pulse` already means "how hard is this working", and everything that reads it — how shallow the row
is cut (`pulsedDepth`), how far its anchor is thrown (`DRIFT_CENTRE_PUNCH`), what the picture weighs
(`drawnGratings`) — is exactly what the accidental flash used to move. The field writes it onto
every row the way the one ground is written onto every row standing on it.

Refused: an event queue of things worth jolting for. Every strike here is a number already on the
per-frame read, so a jolt costs one comparison and no state but its own.
