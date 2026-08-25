# 0174 — An arrangement draws from a cast, and the dial is not a hand

- **Date:** 2026-08-25
- **Status:** accepted
- **Extends:** [0158](0158-a-song-may-be-drawn-and-what-is-drawn-is-never-stored.md) — the drawn
  arrangement, which drew from every declared character; spends the shape
  [0165](0165-a-mask-is-numbers-a-gesture-wrote.md) argued for and
  [0169](0169-the-mask-goes-and-the-grid-stays.md) removed from the grid, on a list of names

`PlayerSpec` grows `cast`: one durable whole number the bits of `PLAYER_CHARACTERS` pack into, bit
_n_ set is that list's _n_th name permitted. `createDrawnSong`'s parts are drawn from the names it
holds and from no others. It is one number rather than six booleans for 0165's own reason — it
travels in a `deck.player` envelope and is read in a command log, and six fields over six lines is
one thing spelled six ways.

**Drawn within, not snapped onto.** This is where the shape parts from the grid mask it is borrowed
from. 0165 snapped because `travelFrom` had to take the same draws under any mask, and slots have a
_nearest_. A list of names has none, so there is nothing to snap to: the draw is taken uniformly
over the permitted names instead, at the cost of the one number the draw always spent. Narrowing a
cast therefore changes which name comes up and never how many draws a walk has taken, which is the
half of 0165's argument that does carry over ([0089](0089-a-jump-is-the-transports.md)).

**An empty cast is refused**, and by the field's own floor rather than a clause beside it:
`PLAYER_CAST_MIN` is one, so `assertPlayer` throws on zero rather than letting a spec play quietly.
`drawCast` throws on one too — reaching it means a spec that came from somewhere other than the
validator (principle 5). The door's press that would empty it does nothing, so no surface can send
what the validator would throw on.

**No character draws it, and no press writes it.** The cast leaves `PlayerVoice` the way `song`
does. A character says what a pattern is _like_; the list a drawn arrangement's parts come out of is
what the songs after this one may be, so a name pressed at half an amount would be a part deciding
which characters follow it — 0153's refusal said one step further along, and 0158's said for the
list rather than the amounts. No region can name it either, because a region is keyed by
`PlayerKnob` and this is no knob: it is a set of presses, so it carries no caption, no fineness and
no curve, exactly as `slots` did not.

**`PLAYER_CHARACTERS` moved to `src/lib/playerCast.ts`.** The mask's bits are that list's
positions, so the names and which of them are permitted are one family of the spec's numbers and sit
in one module beside what reads them — the road every family since P119 has taken, and the room
`src/lib/player.ts` needed to stay under the hard cap
([0045](0045-the-hard-cap-is-enforced-where-no-waiver-reaches.md)). **The order of that list is
durable**: a name inserted in the middle moves every bit above it, which pre-release is a spec from
another build and discarded, never repaired ([0026](0026-pre-release-has-no-migrations.md)).

**And the dial is renamed Compose.** Arrange is what a hand does in the section under the dials, and
this number is the pattern writing its own song; one word on one card cannot be both gestures. Copy
only — `arrange` stays the field, the knob id, and the key all four amounts are declared under
([0124](0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md)). The presses sit behind
that dial's own framed plus with the three amounts already there, which is where an amount that
shapes a draw belongs and the only door in the module holding a control that is not a dial.

**No browser proof.** The one thing a render could show — that a narrowed cast sounds different —
is what the lib suites assert directly, and the last render of a mask was deleted as intermittent
by the step that took its subject away (0169). Proof lives at the layer that owns it
([0117](0117-proof-lives-at-the-layer-that-owns-it.md)).

Durable shape: one whole number, validated by the one validator, projected in declared order and
carried by the ordinary `deck.player` command. Pre-release, a stored spec without it is discarded
rather than repaired (0026).
