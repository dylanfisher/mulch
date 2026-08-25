# Ideas

Unscheduled vocabulary ideas. Nothing here is committed work — the roadmap is
[`plan.md`](plan.md), and an idea becomes a step only by being written there with its proof.

- **Seasons, for scenes.** If scenes or presets are ever scheduled, saved states as seasons of one
  yard fits. Nothing to do until then.
- Effect plugin system, custom effects.

## Effects

- Create an effect with CV cable style routing.

## Jumps

Where the module could go after [0151](decisions/0151-a-figure-is-a-run-of-slots-the-walk-plays-back.md).
Each line names the durable shape it would move, because that is what makes a step expensive.

- **Sparks.** A landing may throw a second, quieter one at another slot, so two regions of the loop
  sound at once and in rhythm. `PlayerStep` grows an optional companion and `armStep` builds a
  second source through a level gain; `position()` keeps answering off the landing and never the
  spark. A spark _across yards_ is different ground:
  [0097](decisions/0097-yards-jump-on-one-session-clock.md) considered a follower and rejected it,
  so the shared clock is the sanctioned road and reopening it is a decision rather than a patch.
- **Wander shaping**, behind the Distance dial's own framed plus, which
  [0124](decisions/0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md) says is where a
  drawn number's amounts belong: _Bias_ (which way the walk leans, −1…1, with the `variation`
  toggle left as the named choice it is), _Stride_ (the odds a jump travels the full distance
  rather than a drawn one — at a stride of one, a distance of three closes into a rotating cycle),
  _Home_ (the odds it returns to the top). Four fields on `PlayerSpec`.
- **Ratchet.** The bursts inside one landing shrink geometrically instead of staying equal — a roll
  that accelerates. `windowOf`'s `repeats * burstSecs` becomes a geometric sum; one field.
- **Reverse landings.** The odds a landing plays backwards. `AudioBufferSourceNode` has no negative
  rate, so it needs a reversed copy of the buffer cached per deck — cheap to state, moderate to
  build, and the cache is the part to decide about.
- **Rate inside a landing.** The rung ladder moves per hold today; letting it step between the
  repeats of one landing is an arpeggio rather than a speed change.
- **Drop.** The odds a landing is silent while keeping its place in the grid — a hole, which is not
  what `rest` is (a wait _between_ two landings, measured in slots).
- **A slot mask, filled from onsets.** Which of the sixteen slots a pattern may land on, as durable
  numbers. §2 forbids anything durable resting on derived analysis — `decodeAudioData` resamples,
  so onsets differ across machines — so the road is a one-shot _action_ that reads
  `src/lib/analysis.ts` once and writes the mask as an ordinary command, never a live read.
- **Euclidean rests.** Rests placed by a Bjorklund pattern rather than by a chance roll:
  deterministic emergent rhythm, ~20 lines of pure maths in `src/lib`.
- **A burst locked to the grid.** A burst is wall seconds on purpose
  ([0119](decisions/0119-a-burst-is-seconds-and-the-rest-is-slots.md)), so moving the loop's out
  point cannot transpose the grain. A _lock_ snapping it to a subdivision would make the grain
  rhythmic instead of timbral — the strongest of these, and the only one that reverses a decision
  rather than extending one.
