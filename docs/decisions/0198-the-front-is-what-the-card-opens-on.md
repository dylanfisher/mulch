# 0198 — The front is what the card opens on, and a picture says it is a control

- **Date:** 2026-08-29
- **Status:** accepted, amending [0197](0197-the-card-has-a-front.md) in three places and keeping
  everything else it decided. [0195](0195-every-amount-stands-beside-the-dial-it-shapes.md)'s "no
  number is behind a door" holds: what changes here is weight and legibility, not what exists.

**The fine tune is a fold, and it opens shut.** 0197 gave the card a front and put an eyebrow over
the forty dials under it — and then drew all forty anyway, so the rank it declared was a word and
the page was the flat field it had been before. A caption is not a rank. The eyebrow is the fold
now, the yard holds its state beside the card's own and the song's, and it starts closed: what
stands above it — the picture, the six names, the amount, the reseed — is the whole of what a hand
needs to get from a loaded sample to a pattern worth hearing.

Nothing is _gated_. The caret is on the heading, no gesture is behind a menu, one press opens every
number the module declares, and the dials come back exactly as they were. 0197's "nothing may be
folded away behind that word" is the one sentence of it this reverses, and it is reversed on 0197's
own argument: the answer to forty controls is weight, and a fold is the heaviest weight there is.

**A run is an outline, not a fill.** 0197 drew the bracket at the muted token's full strength. A
knob's unturned track is `stroke-muted` — the same token — so every dial inside a bracket lost the
arc that says how far round it is, and the run drawn to make the dials legible was the one thing
hiding them. It is a ring now, over the card's own ground, and it is stronger than the box it
stands in because a box has an eyebrow naming it and a run has nothing: the line is the only thing
telling one run from the next.

**A picture that is a control says so, and shows where it stands.** 0197 made the walk draggable and
left the surface an invisible pad with its sentence on an eyebrow nothing marked as a hover target.
Two things fix that and neither is a word. The sentence gets a press of its own — an info icon,
which is `Explains`, a sibling of `Says` for the controls a sentence cannot be read off; it is the
one icon outside `ACTION_ICONS`, because opening a sentence is not an action the instrument offers.
And the picture draws the crosshair the drag writes, at `scopeMark` — the exact inverse of the
gesture's own reading, so the handle a hand grabs is where a press on it would land. A marker a
fraction off its own gesture would be worse than none: it would say the mapping is something other
than what it is.

**The words for it live in `copyCard.ts` and the wire validator moved out of `player.ts`.** Both are
the same fact: `src/lib/copy.ts` and `src/lib/player.ts` each stand at the 800-line hard cap, and
the fix for a file at the cap is a split and never a shave. `playerWire.ts` is what the command wire
and storage are allowed to say a spec is; `player.ts` is what a spec is and where every bound is
declared with its reason. Neither halves a subject.
