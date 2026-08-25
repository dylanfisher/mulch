# 0155 — A drop lands on a seam, not in a box

A dragged item lands in the slot whose **leading corner** — the seam it would be inserted at, in
reading order — its own leading corner is nearest to (`src/ui/listDrag.ts`). Not the slot whose
centre it is nearest to, which is what the shared gesture resolved a drop against until P113.

A centre is a fine ruler only while every box is the same size. A card declares its own width
([0076](0076-a-card-reads-itself-out-of-its-own-id.md)), so a rack holds full-width cards and
half-width ones at once, and a slot's middle is then up to half a rack away from the seam a hand is
aiming at: a half-width card asked to go in front of a full-width one had to travel past that card's
midpoint before its own centre was nearest, so the drop the hand asked for was refused and the one it
did not ask for was taken — and unlike the live gap
[0111](0111-a-yard-lands-on-an-index-and-a-copy-lands-under-its-original.md) recorded, this one
survives the release, as the wrong order. Corners are also what `paint` already shifts a passed card
by, and for the same reason: a rack lays out `items-start`, so two slots in one row share a top edge
and nothing else.

A column of equal items resolves identically either way — both corners are one constant off both
centres — so a rack of one width is unchanged. **The yard list is not one of those**, because a
folded yard is a header row beside an open one hundreds of pixels tall
([0111](0111-a-yard-lands-on-an-index-and-a-copy-lands-under-its-original.md) says so of the same
list), and there the threshold moves: an item now crosses when its leading edge has travelled half
the distance between the two tops, where it used to be half the distance between the two centres. No
drop becomes unreachable — a column is monotonic in one axis under either rule — but a folded yard
swaps sooner and an open one swaps later than they did.

That is taken rather than corrected, because the correction is refused by the other list. The rule
that would keep a column exact is the _direction-dependent_ seam: measured against the end of the
item being passed when moving forward, and its start when moving back. In a wrapped rack the end
seam is the trailing corner of the last card, so a full-width card dragged straight down the left of
the rack never approaches it and could never be moved to last at all. One gesture serves both lists
(0062), so the rule has to read on the wrapped one; nearest leading corner does, and it is also the
corner the landing placeholder is drawn at, so what the rule decides and what the hand sees flip at
the same instant. Nearest is still the one rule that reads on both layouts (P48): sideways across a
row, downwards onto the next, and diagonally between them.

**A copy lands where the seam beside its original is.** `effect.add` has only ever meant _at the
end_, so `effect.duplicate` puts one more ordinary `effect.reorder` in the group its own expansion
already runs in — the same road a yard's copy takes (0111,
[0092](0092-an-effect-copies-itself-with-one-command.md)). An index field on `effect.add` would be a
second way to say where an instance goes.
