# 0305. Nearest is read by row, then along it

- **Date:** 2026-09-07
- **Status:** accepted

A drop still lands on the slot whose leading corner the dragged card's own is nearest
([0155](0155-a-drop-lands-on-a-seam.md)), but "nearest" is read in two steps in
`src/ui/listDrag.ts`: the row whose top the corner is nearest, then within that row the seam it is
nearest across. Not one straight-line distance over both axes.

A straight line weighs a rack's width against a card's height, and a rack is wide: a half-width
card standing at the right of its row has a corner half a rack from every full-width seam, so the
seam of a half slot two rows away — under its own corner — outscored the wide seam the hand had put
the card on, and a drag straight up or down between two full-width cards was refused. A column
reads identically under either rule, one slot per row, so the yard list is unchanged.

The room after a row's last card is a seam of that row too, offered only when the dragged card
would stay on the row: a half card alone between two wide ones leaves half a rack beside it, and a
hand that drops a card there has asked for _after_ the lone one, which no card's corner says. The
list's own column gap and width at the press say whether it fits.
