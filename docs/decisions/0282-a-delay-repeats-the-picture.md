# 0282 — A delay repeats the picture

- **Date:** 2026-09-02
- **Status:** accepted, amended by
  [0294](0294-two-delays-share-one-ceiling.md) (the ceiling is shared between the standing delays,
  the spacing band is open at the top and the Time is floored and read logarithmically), standing on [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (a look
  is declared on the entry and the chain draws it) beside
  [0280](0280-a-room-blooms-the-picture.md) and [0281](0281-a-crusher-blocks-the-picture.md), and
  inside the per-frame line [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md) draws
  — no pixel loop, no read-back, and no `ctx.filter`

> **Amended.** The ladder, the wind in its alpha and the count off the feedback all stand. What
> 0294 replaces are this record's numbers: the band it narrowed to a twelfth of the width is open to
> a sixth again, now that the Time is read on a log curve and a long delay reaches the top of the
> knob; the fade is lifted by the spacing as well as by the feedback; and every delay standing draws
> its first rung under a share of `ECHO_CEILING` rather than the whole of it, because three of them
> each taking the whole washed the strip out to 0.127 against a dry 0.224. The maths and the draw
> moved to src/lib/moireEchoes.ts with them.

**Delay's look is the echoes, and it is the third to take a slot in the chain.** The field again
behind itself, spaced along the wind and fading a fixed share every repeat: `LOOKS.echoes` says
`at: "pass"` and carries the one draw it is (src/lib/moireLook.ts), and the delay entry maps its own
Time into `spacing` and its own Feedback into both `count` and `fade`. **One knob into two terms is
new and is right here**: a feedback delay's number of repeats and how slowly they die are one number
in the sound as well, and the registry already refuses only the other direction — two values reaching
one term. The Mix is nowhere in `lookFrom`, because it is the presence the whole look is weighed by.

**The chain hands every pass the wind's veer, and the wind reaches the painter whole.** A pass that
displaces the field needs a direction and the picture has exactly one — the direction the standing
rack blows it in (0267) — so `paintMoire` takes the `MoireWind` rather than one number of it, spends
its reach on the ink as before (the drift, until
[0364](0364-the-ground-crawls-the-lattice-and-the-wind-only-leans-it.md) made it a lean) and the veer
on the chain, and `LookPass` gains a fifth argument the
two passes that displace nothing simply do not declare. Multiplied by the whole veer and never by
its sign: the veer travels through nought over the wind's seconds, so the ladder walks in as the wind
picks up, where a sign would throw every ghost across the picture between two frames.

**And the veer is in the ladder's alpha because it is in its spacing.** A gathered ladder is three
copies of a hole mask laid exactly over each other, which is not a repeat at all: it lifts every
half-covered pixel toward solid and hazes every window in the picture evenly, the one thing a pass
may not do (0269). Fading by the same number that gathers it means the repeats leave as they arrive
on top of one another, and a wind standing still — which is where every picture starts (`windRest`)
and where every reversal passes through — draws the field once and nothing behind it.

**The count is off the feedback alone, and the presence rides the alpha.** That is what tells this
ladder from the crusher's hardening, which is whole and presence-weighted (0281): a whole count
stepping with the travel would pop an entire picture in and out as a delay arrives, so the count is
whole and the travel is carried by the ladder's alpha instead — a delay coming in is its repeats
fading up behind the picture. **One repeat at no feedback at all**, because a delay line with nothing
fed back still repeats once and a picture drawing none would say the effect was not standing.

**The spacing is a narrow band, and the shot is what narrowed it.** Stated in shares of the field
like the bloom's radius and unlike the blocks' grid (0280, 0281) — a ghost lands on nothing, so it
costs nothing to be scale-invariant. But the band this landed with (a thirty-second to a sixth of the
width, four repeats, no ceiling) shot as a **wash and not as repeats**: the picture is nearly periodic
at that distance, so a copy that far off belongs to nothing the eye can pair it with, and the strip
came back at a mean of 0.15 against 0.32 for the same rack at `BASE` — the picture eaten rather than
doubled. A forty-eighth to a twelfth, three repeats, and a first rung under half the picture
(`ECHO_CEILING` — the bloom's reason at a number of the echoes' own, because a halo may take most of
the picture where three ghosts may not) draws ghosts beside the
diagonals they belong to: on the same fixture the strip reads 0.195 against a dry yard's 0.225, at a
swing of 0.176 against 0.009 — the structure the ladder adds, at a mean the picture survives.

**Two delays read as twice as much, and rack order is legible in the same numbers.** Two of them came
back at a mean of 0.142 and a swing of 0.30, with the parallel copies countable at the crop;
`[delay, crush]` shot 0.461/0.213 against `[crush, delay]`'s 0.518/0.133, because blocks over the
ghosts keep their structure and ghosts of blocks average it away. That is the chain the picture was
for.
