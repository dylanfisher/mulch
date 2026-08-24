# 0146 — A row's own gesture moves its phase

- **Date:** 2026-08-24
- **Status:** accepted, constraining
  [0139](0139-a-row-is-what-an-effect-is-set-to.md) and
  [0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md)

`turnsOf` was linear in the read position, so every row slid at a constant rate and the fringe
families the picture is made of reorganised at a constant rate too. A gesture that swept hard and
stopped read as the same steady drift as one that never moved.

**A row's `bend` moves where it stands, not how fine it is drawn.** The table is the same one —
`laneBend` samples a lane's own gesture across its cycle, `bendSwing` fills it from a declared
amount — and what it does with it changed: it is added to the row's turn instead of multiplied
into its pitch. A row therefore surges and stalls across its own cycle, and two rows surging at
different moments cross at a rate that is not constant, which is the burst the picture had no way
to show.

**Its pitch is the one its period and its knobs say, and nothing else.** That is what makes this a
replacement rather than a second term: the band `gratingPitch` holds every spacing inside has one
owner (0098), and a lane crowding fringes across it was a second hand on the same dial.

**A row surges and stalls and never reverses, and the bound is derived rather than picked.** What
could run a row backwards is the _slope_ of its bend table, not the size of the swing: `bendAt`
interpolates `BEND_SAMPLES` points across a turn, so a gesture falling its whole range between two
of them reaches a slope of `BEND_SAMPLES`, and a swing chosen by eye would have reversed on it.
`BEND_TURNS` is therefore `1 / (2 × BEND_SAMPLES)` — every possible lane between half speed and one
and a half, monotone by construction. A picture whose rows reverse is a picture that stopped being
of a playhead, and that is a thing to make impossible rather than unlikely.

**A curved row is now the same row as a straight one.** Its spacing was already fixed, because a
picture-sized tile may not be rebaked as a knob moves
([0142](0142-a-row-is-cut-on-a-coordinate-of-its-own.md),
[0144](0144-the-picture-may-fall-behind-the-hand-may-not.md)), so its gesture already rode its
phase and the two kinds of row moved by different rules. One rule now, and the exception that
proves it goes away.
