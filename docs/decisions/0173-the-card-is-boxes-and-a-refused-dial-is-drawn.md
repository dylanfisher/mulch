# 0173 — The card is boxes, and a refused dial is drawn

- **Date:** 2026-08-25
- **Status:** accepted, amended by
  [0179](0179-an-amount-opens-where-it-lives-and-the-box-is-full-width.md), which retires the
  two-deep clause below — a door's amounts are now siblings of its dial, so `Children.count` is no
  longer the count of dials — and makes each box full width. Everything else here stands.

The mulcher card's body is a small number of bordered boxes, each under an eyebrow saying which
question its controls answer — where a landing goes, what it sounds like, how it is timed, how it
is arranged (`PLAYER_GROUP_LABELS`, `src/lib/copy.ts`). A box of more than two controls stands two
deep rather than running wide, which is `src/ui/PlayerGroup.tsx`'s own answer out of how many
children it was handed, not a flag a hand sets. **A dial added to the module joins a box**: there
is no ungrouped row left to put one on, and `src/ui/PlayerCard.test.tsx` fails on a dial or a door
the card's body draws outside them.

**Why.** Fourteen controls in one `flex-wrap` stand every one of them at the same distance from
every other, so the card is read by counting rather than by looking — and an amount behind a framed
plus on such a row is unfindable by anyone who does not already know it is there. The report that
the walk's old wander was missing was exactly that: it has been the lean amount behind the Distance
dial's own marker since [0162](0162-a-lean-is-an-amount-and-replaces-the-walk.md).

**The dials are drawn whether or not the switch is on** — greyed, unturnable, painting
`PLAYER_DEFAULTS`, which is what a press of that switch would send. So is the card's corner. A
refused control is what [0121](0121-a-framed-plus-is-a-door.md) already asks for everywhere else,
and a body that is not there cannot say what the module offers or at what settings it would start.
The seed is the one number the off card cannot invent, so it is read out only where there is a real
one. The song section is the exception and the reason is that it is not a dial: it is a list a hand
adds to and reorders, and a disabled Add Part is a gesture with nothing to add a part to.

**And a folded card is its heading and nothing else** — no frame, no header, none of the corner's
actions. What a fold puts away is the module; a border with an empty header inside it is a card
still claiming the room the fold was pressed to give back. The fold is no longer refused while the
switch is off, because there is now always a body under it.

The word on that heading is **Mulcher** rather than Jumps. A jump is the unit the module is counted
in — a part lasts so many of them
([0153](0153-a-song-is-a-run-of-parts-the-walk-plays-back.md)) — so naming the module after it left
one word answering two questions on one card. It is the label and only the label: a jump is still
what the module does, so `playerJumps`, every `player*` file and every sentence about the behaviour
keep the word. What the interface calls the module and what the code calls what it does are two
facts, and `PLAYER_LABEL` is the first of them.
