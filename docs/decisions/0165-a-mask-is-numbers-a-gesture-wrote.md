# 0165 — A mask is numbers a gesture wrote, and a masked jump is snapped

- **Status:** superseded by [0169](0169-the-mask-goes-and-the-grid-stays.md), which removed
  `slots` from `PlayerSpec` outright. Every argument below stands and none of it is why the field
  went; it is read now as what a mask _is_ if there is one, which is the shape P131 spends on the
  characters a song may draw from.

`slots` is which of the grid's sixteen divisions a pattern may land on, carried as the one whole
number those bits pack into — bit _n_ set is slot _n_ permitted. One number rather than sixteen
booleans because it travels in a `deck.player` envelope and is read in a command log: a mask is one
thing a hand did, and sixteen fields spread over sixteen lines is one thing spelled sixteen ways.

**It is ordinary durable numbers and never a live read of analysis.** `decodeAudioData` may
resample, so a source's onsets are not a pure function of its stored bytes
([plan §2](../plan.md)) — a mask that were a live read of `src/lib/analysis.ts` would be a spec that
means one thing on the machine that made it and another on the machine that replays it. So the
road is the one-shot gesture: a hand presses, `maskFromOnsets` reads the onsets that are already on
the deck **once**, and the number it returns travels in an ordinary `deck.player` command — undone,
logged, archived and replayed like any other edit ([0089](0089-a-jump-is-the-transports.md)).
Nothing on a walk-time or render path reads analysis; `playerWalk` reads `spec.slots` and nothing
else.

**A mask outlives the reading, and that is the point.** It names sixteenths of the loop, and the
loop can be moved or resized under it afterwards — the same sixteenths then divide different audio
and nothing re-derives them. That is what "durable numbers" costs and what it buys: the alternative
is a spec that re-reads the sample, which is the thing this decision refuses. A hand that wants the
mask to follow the loop presses the action again; a deck that loads a new source loses the pattern
entirely, because `deck.load` switches the module off (`src/app/execute.ts`).

**A masked jump is snapped, not re-drawn.** `travelFrom` wraps a drawn distance onto the grid and
is the same function `createFigure` evolves a figure with, so the mask has to answer for a figure's
slots too. Re-drawing until a permitted slot came up would take as many draws as the mask is
sparse, so how far a jump went would depend on which slots the sample happened to hit and
`distance` would stop meaning what its caption says. Snapping is the other road: the draws are
exactly the draws an unmasked pattern takes, and then the landing moves to the nearest permitted
slot, measured around the grid the way a jump wraps. Ties go forward, because a tie has to break
the same way on every machine and forward is the direction the loop is read in. A full mask is the
identity, so a pattern under one lays down the stream it laid before the field existed.

**The first landing is snapped like every other.** `playerWalk` opened on `let slot = 0` because a
play begins at the top of the loop. Rather than exempting it from the mask or requiring the mask to
hold slot 0 — two rules where there is room for one — the top of the loop is snapped by the same
`nearestSlot`, and under a full mask that is zero itself. `home` comes back the same way.

**An empty mask is refused.** A pattern that may land nowhere has no next slot to draw, so
`PLAYER_MASK_MIN` is one and `assertPlayer` throws on zero rather than letting a spec play quietly
(principle 5). `nearestSlot` throws on zero for the same reason: reaching it with an empty mask is
a spec that came from somewhere other than the validator.

Durable shape: `PlayerSpec` grows `slots`, bounded in `src/lib/playerSlots.ts` along with
`PLAYER_SLOTS` and the two bounds derived from it, because `src/lib/player.ts` is at the hard cap
([0045](0045-the-hard-cap-is-enforced-where-no-waiver-reaches.md)) and each family of the spec's
numbers now sits beside what reads it. It is no dial and no knob — it is a strip of sixteen presses
and one action, so it carries no caption, no fineness and no curve — and no character's region
names it, which is the written answer [0152](0152-a-character-is-a-region-of-the-spec.md) asks for:
a character says what a pattern is _like_, and where a sample has its transients is a fact about
the material rather than about the walk.
