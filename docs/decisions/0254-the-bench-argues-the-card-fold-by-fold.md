# 0254 — The bench argues the card fold by fold

- **Date:** 2026-09-01
- **Status:** accepted, amending [0247](0247-a-sketch-is-drawn-in-the-real-tokens-and-thrown-away.md) and resting on [0252](0252-the-blend-is-four-arguments-and-every-corner-is-named.md). Its two-list shape is spent: the bench was cleared and now mounts one list, `SKETCH_GROUNDS` (src/ui/sketch/SketchPage.tsx), of eight readings of one seam. What stands is the rule — a sketch argues one fold, and the entry is its identity

**"Six answers to one question" was the wrong question.** 0247 put whole surfaces on the bench and
said the directory is deleted the day one of them wins. Eight are there now and none has won,
because a hand does not reach for "the card" — it reaches for one of the five folds
`PLAYER_GROUP_LABELS` names. Whole surfaces can only be picked between wholesale, and the answer is
far more likely to be a walk from one and a ground from another. So the bench is two lists:
`SKETCH_SURFACES`, each replacing the card, and `SKETCH_PARTS_LIST`, each replacing one fold. Same
entry type, same `SketchFrame`, two headings and two nav groups with a rule between them, and the
numbering restarts per list because a part is not the ninth surface. **0247's "pick one and the rest
of this directory is deleted" becomes "pick one per fold."**

**The entry list is the identity, so the test walks it rather than a copy of it.**
`SketchPage.test.tsx` mounts off both exported arrays: a sketch added without an entry, an entry
that renders no section or no nav link, and two entries sharing an id all fail, where the old case —
eight ids written out beside the eight it was checking — passed whatever the page did. The narrower
import rule lives beside it: `scripts/arch` lets any `src/ui` file read `src/state`, `src/app` and
`src/audio`, which is right for the tier and wrong for this one directory, where 0247 forbids a wire
outright, so the bench's whole tree is read off disk and every import specifier in it is resolved —
alias and relative alike, because a wire written `../../state/…` reads nothing like the alias and
would walk straight past a check on the alias alone. It is a check on the directory's own imports
and not a transitive one.

**A fixture's numbers are read off its landings, never written beside them.** The first part is The
Walk, in three readings — the strip as the card draws it, the same loop as a ring, and the landings
as a piano-roll against the slot of the source. The roll is the only one where `distance`, `bias`
and `home` are _somewhere_ rather than numbers in a drawer, so `SKETCH_WALK` grew a `slot` per
landing and `SKETCH_REACH` derives the three amounts from those slots — the module's own reading of
a side included, where a bias of nought is even. A reach drawn beside landings that do not obey it
is a legend, which is the thing this reading exists to stop being. 0252's naming rule reaches it the
same way it reached the blades: each amount names itself on the mark that _is_ the thing — home on
the home line, distance along the furthest step, bias along the last step that goes back — inside
the roll's own picture, sliced by `data-reading` and asserted.

**A label a line runs through reads as a shorter word.** 0252 caught `stutter 38` drawn as
`stutter 3`; the same trap cost this step two shots. The ring's playhead ran from the middle,
straight through the standing character's name, and the roll's `distance` and `bias` labels landed
on adjacent steps and overlapped. Both are fixed in the geometry — the head starts at a hub clear of
the hole, the roll is drawn wide rather than square so sixteen landings are further apart than the
names beside them are tall, and the two amounts are named on steps at opposite ends of the run. The
shot is what found all three; none of it is visible from the whole-page view.

**The dark shot is not taken, because the harness cannot take it.** `./scripts/drive` has no theme
switch and the theme is a `localStorage` choice, so shooting `#/sketch` dark would mean editing
`scripts/`, which the gate forbids. The bench is drawn in `bg-muted`, `stroke-border`,
`fill-primary`, `fill-current` and `text-muted-foreground` — the tokens every surface beside it
already uses at both themes — so the light shot is the proof taken and this is what was left out.
A theme flag on the harness is its own step.
