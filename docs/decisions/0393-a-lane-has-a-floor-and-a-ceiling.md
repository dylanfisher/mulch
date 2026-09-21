# 0393 — A lane has a floor and a ceiling

- **Date:** 2026-09-21
- **Status:** accepted

**One lane may carry a window in its parameter's own units — `laneBounds`, beside the lane rather
than inside it, on the deck's record and on the instance's (src/state/session.ts).** Its sibling
is `drawn` in every respect 0314 set: keyed by the same parameter, written by one command of its
own (`automation.bounds`), restored in a stage after the lane, carried by an `effect.duplicate`,
and cleared by the lane's own reducer, because a window on a parameter holding no lane is a fact
about nothing.

**The window squeezes the gesture; it does not clamp it.** `squeezeLane` (src/lib/automation.ts)
is one call of `rescaleLane` with the parameter's own range as the source and the window as the
target, so the whole range is read onto the two ends and every point keeps its share of the swing.
A clamp would answer a quieter gesture with a different one — every point past the edge flattened
onto it — which is the failure 0035's rescale already refuses (principle 5).

**The squeeze lands on the way out, through one function, at every road out there is.**
`playedLane` (src/lib/automation.ts) is that function, and the roads are the three commands in
`automationEdit.ts`, the re-base a `param.set` performs, and the two that never see a command at
all: the deck's lanes armed by `prepareRestore` (src/app/engine.ts) and an instance's by
`armInstanceLanes` (src/app/rackRebuild.ts), which is what an undo, a redo, a rollback, an import
and a second Stop stand a rack up with. A window honoured on some of them is a picture and a sound
that disagree, and `drawn` — the field this is modelled on — never had to know, because nothing it
holds reaches the graph (0314). The session keeps the gesture, so a window can be widened,
narrowed or taken off afterwards; storing the squeezed points instead would make the squeeze
one-way.

**A stepped parameter's window stands on that parameter's own grid.** The squeeze counts its steps
from the floor, so a floor half a semitone off the grid puts every point of the played lane half a
semitone off it. `automation.bounds` snaps both ends the way `param.set` snaps a value.

**The window is read in the picture's own linear space**, unlike a run's window, which is read in
the parameter's (0208, src/ui/PoolEntries.tsx). A lane's values ignore the curve its dial is drawn
on (`rescaleLane`), so the slider's two ends mean exactly the heights they stand at in the preview
above them, and the dashed rules there are those heights.

**What this costs:** a squeeze restarts the lane's cycle. `deckLanes` keeps a playing lane's
anchor only where the new points are the same gesture by value (`sameGesture`, 0035, 0079), and a
squeeze moves every value — so putting a window on a lane mid-pass re-phases it, where a stretch or
a re-base would not, and taking the window off does not (the lane comes back untouched). Teaching
`deckLanes` that a squeezed lane is the same gesture is a change to what "the same gesture" means
for every writer of a lane, and belongs to a step about that rule rather than to this one.

And `src/app/execute.ts` crossed the 800-line hard cap and the three lane
commands left it, with the address rule they share, for `src/app/automationEdit.ts` — the second
subject to leave that file after the clips (0007, 0045). And every stored session written before
this is discarded rather than migrated: a deck or an instance with no `laneBounds` is refused by
the validator (0026).
