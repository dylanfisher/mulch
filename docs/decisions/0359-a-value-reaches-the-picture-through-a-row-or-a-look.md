# 0359 — A value reaches the picture through a row or a look

- **Date:** 2026-09-11
- **Status:** accepted, widening
  [0148](0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)

0148 gave every parameter two lists to be in: a dimension of its effect's row, or a written reason
there is no honest dimension for it. That was one list short. A row's dimensions are all quantities
— how fast, how deep, how far apart — so a knob that is a _choice_ can never reach one, and the
only place it was allowed to land was the silence. The eq's shape was already living in both, drawn
by the band look and written off for a row at the same time, which is an entry giving two answers
about one value.

So the registry now takes a look's term as an answer: every parameter is drawn — by a dimension of
its row, by a term of its look, or honestly by both — or it stands in `driftUnreached`, and a value
its own look draws may not also be written off (`effect declares a value its look reads unreached`).
A look is where a choice lands.

**What that closes.** The panner's three stage toggles reach the stagger as `count`, `spacing` and
`size` — how many pieces the field is taken in, how far down the field a piece is read from, and how
much of the width each is taken from — and `STAGE_UNREACHED` is gone. The compressor's Makeup reaches
the squash as `lift`, carrying the floor and the ceiling back up together until the ceiling is at the
field's whole range and there is nothing left of the squash to put back; read as the gain's own value
and not as a turn, because unity is what "unchanged" means and the middle of a knob is not it. The
eq's shape keeps the look it always had and loses the silence. The registry's written-off list is
now the automator's knobs and nothing else, which step 10 of this block owes.

**A stage moves where a band is read from, never how many times it is drawn.** All three new stagger
terms are source-rectangle arithmetic inside the two draws a band already pays, so the whole-field
move costs what it cost — except the band split, which is three more bands of the same total picture.
Nothing here reaches a tile key, so nothing here is a rebake (0353, 0354).
