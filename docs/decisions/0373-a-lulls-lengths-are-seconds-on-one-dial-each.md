# 0373 — A lull's lengths are seconds on one dial each, and a switch rounds them onto the beat

- **Date:** 2026-09-11
- **Status:** accepted, resting on the one-declaration-per-parameter invariant
  (docs/boundaries.md) and on [0326](0326-a-tapped-parameter-is-declared-and-drawn-by-the-rack.md)
  for how a beat reaches a length.

**A rest and a gap are each a range of wall seconds on two logarithmic dials, and a stutter is those
dials turned down.** A mode that made the same dial seconds here and beats there was refused: a
parameter is declared once, its readout is its declaration's, and a knob whose unit changed with a
picker beside it is a number nobody can read. Instead the Grid picker names two clocks — Free, and
Beat — and on the beat every drawn length is rounded onto whole beats above one and a beat's
divisions below it, and every edge is snapped onto the session's shared clock. A yard whose beat was
never found lays nothing on the grid rather than inventing one (principle 5).
