# 0262 — A fractal row is slotted among the structure's own rows

- **Date:** 2026-09-01
- **Status:** accepted, closing the residue of
  [0249](0249-a-run-standing-nothing-is-not-a-run-gone.md), on
  [0144](0144-the-picture-may-fall-behind-the-hand-may-not.md) and
  [0248](0248-the-structure-travels-and-its-identity-is-the-automators.md)

A curved row's fallback — the tile it draws with while the one it asked for is still being baked —
is held in a slot keyed by which row is asking, and half of that key was where the row stands in the
whole picture's order (`order.slot`, src/ui/moireCanvas.ts). For every other row that is exactly
right. For the picture's own structure it was the last thing still blinking at a turnover: a place
arriving puts a row of its own into the order ahead of the two fractal rows, so both slid down a
slot at the very painting the travel stepped their keys — the last of them had no fallback at all,
and the one before it drew the other's tile.

**So a fractal row's half of that slot is where it stands among the structure's own rows, and not
where it stands in the picture's.** There are two of them, in the order `fractalInto` pushes them,
and their count moves only when the rack's automators do — which is the same thing `fractalKind`
already says the row's identity and its angle are (0248). The picture's order may move under them
freely; the slot does not.

Counted over every fractal row in the set rather than over the ones the painting draws, so a row cut
to nothing does not re-slot the other one on its way past.

The slot's own rule is otherwise untouched: shape, geometry, profile and the picture's size stay in
it, and every other row is still counted where it stands. Slotting all rows by an ordinal among
their like would have been the same fix in general form, and is a bigger change to what a slot means
for a gain nothing has asked for.
