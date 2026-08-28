# Ideas

Unscheduled vocabulary ideas. Nothing here is committed work — the roadmap is
[`plan.md`](plan.md), and an idea becomes a step only by being written there with its proof.

- **Seasons, for scenes.** If scenes or presets are ever scheduled, saved states as seasons of one
  yard fits. Nothing to do until then.
- Effect plugin system, custom effects.

## Effects

- Create an effect with CV cable style routing.

## Jumps

Two directions the module could go that are **not** work, because each reverses a decision rather
than extending one. The other seven that were here have run, and each is one record in
[`docs/decisions`](decisions/).

- **A burst locked to the grid.** A burst is wall seconds on purpose
  ([0119](decisions/0119-a-burst-is-seconds-and-the-rest-is-slots.md)), so moving the loop's out
  point cannot transpose the grain. A _lock_ snapping it to a subdivision would make the grain
  rhythmic instead of timbral — the strongest of these, and the one that reverses 0119 head-on: it
  re-introduces exactly the coupling that record removed, for a different reason. A decision before
  it is a step.
- **A spark across yards.** One yard's landing throwing a quieter one at another yard is a follower,
  which [0097](decisions/0097-yards-jump-on-one-session-clock.md) considered and refused: it makes
  one deck's transport a function of another deck's identity. The shared clock is the sanctioned
  road, and reopening it is a decision. The spark _inside_ one yard is P123.

## Beds

Two directions for the ground the loop stands on that are **not** work, for the same reason as the
jumps above: each reverses a decision rather than extending one. The two that were work have
shipped, as [0185](decisions/0185-the-ground-crawls-in-sixteenths.md) and
[0186](decisions/0186-the-picture-is-anchored-where-the-yard-reads.md).

- **A part's length said in beds.** `SongPart.length` is in jumps, by
  [0119](decisions/0119-a-burst-is-seconds-and-the-rest-is-slots.md)'s argument. A second unit —
  "this section lasts four beds" — is the closest the module comes to bars. It is a second author of
  one field, so it is a mode rather than a third amount, which is the shape
  [0163](decisions/0163-a-placed-rest-is-the-fields-other-author.md) settled for the placed rest. A
  decision before it is a step.
- **A bed chosen by the source.** The move lands on the bed whose onset density is nearest the
  current one rather than on a drawn one. Blocked as written — §2 of the plan, nothing durable rests
  on derived analysis — so it would have to take
  [0165](decisions/0165-a-mask-is-numbers-a-gesture-wrote.md)'s shape: a one-shot gesture that reads
  the analysis once and writes ordinary durable numbers.
  [0169](decisions/0169-the-mask-goes-and-the-grid-stays.md) took that exact shape back out of the
  module for being a control nobody could hear, so this reverses a decision rather than extending
  one.
