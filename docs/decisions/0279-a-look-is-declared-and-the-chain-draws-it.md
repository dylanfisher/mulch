# 0279 — A look is declared on the entry, and the chain draws it

- **Date:** 2026-09-02
- **Status:** accepted, amending [0278](0278-the-rack-shapes-the-picture.md) — the warp, the fold
  and the shatter stop being readings of the rack and become their entries' own declared looks, and
  the lattice alone stays the rack's; extending
  [0122](0122-a-registry-answers-for-itself-at-load.md)'s rule to the whole-field move,
  [0266](0266-the-picture-travels-its-ink.md) (the one rate) and
  [0269](0269-the-rack-scatter-shatters-the-field.md) (a pass is a draw of the field)

**A look is a declaration on the entry, checked at load.** `look` and `lookFrom` sit beside `drift`
and `driftFrom` (src/audio/effects/contract.ts), naming one of `LOOKS` (src/lib/moireLook.ts) and
mapping the entry's own parameters into that look's terms. The registry refuses what it refuses of a
profile: a name the picture has no maths for, a look two entries share, a term reached twice, a
parameter the entry does not own, a term the look does not have, a term nothing reaches, and the
lattice, which is the whole rack standing and no plugin's (0278). A term says how it is read — a
turn on the parameter's range, or the parameter's own units, which the wander needs because it is a
speed. No code outside that file knows which.

**`look` is optional until the last pass lands.** A look is drawn by the maths `LOOKS` holds for it
and the passes land one effect a step, so an entry cannot name one before its own step; three name
one today. The field becomes required on the step that gives the last effect its look, and until
then an entry that maps terms without a look is refused, which is the same silence from the other
side. **Come due**: the scatter's own term was that last step, and
[0290](0290-the-scatter-breaks-the-picture-into-its-own-spans.md) made the field required.

**The picture is `rackLooks`, and it travels per instance.** The standing, unbypassed instances in
rack order, each `{ key, look, presence, terms }` read once when a set is built because it is a fact
about what the entries are set to (0070), resting on `MoireRowSet`, walked per frame by
`looksTravelInto` and carried across a rebuild by instance id (`carryLooks`) — an index cannot do it,
because removing one instance shifts every look after it, and two of a kind are two looks. An entry
declaring no honest presence stands at one: the automator is either in the rack or it is not.
**One rate for every look**, the wind's `SHAPE_SECS`, which takes the fold's own ink-ladder second
from 0278 — a rack whose passes arrived at their own speeds would be a chain the eye could not read
the order of. Everything a look's terms are weighted by is that travelled presence and not the
set-to one, the warp's wander included: a sway coming in speeds the field's wander up as it bends
it, rather than turning the speed on whole a bend before there is a bend to turn.

**A pass is a slot in the chain, and three of the four looks take none.** The chain runs where
`cutField` runs, between the field and the screen, each pass reading one surface and writing the
other in rack order — its own pair of surfaces and not the warp's `between`, which is written after
the chain has finished and which a pass would therefore overwrite. The lattice is the rack's own pattern, the fold is a bake on a curved row's
coordinate before any field exists, and the warp and the shatter are cut through the slices the lens
already reads the field back in — each says so at its declaration (`at`), and the chain steps over
them. So this step's picture is byte-identical to the one before it: what changed is who says the
numbers, not what is drawn with them.
