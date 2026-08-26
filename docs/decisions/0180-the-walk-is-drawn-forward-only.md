# 0180 — The walk is drawn, forward only

- **Date:** 2026-08-26
- **Status:** accepted, resting on
  [0070](0070-a-per-frame-read-refills-and-never-clears.md),
  [0144](0144-the-picture-may-fall-behind-the-hand-may-not.md) and
  [0159](0159-a-song-is-the-pictures-one-stepped-row.md), and reshaping the player half of
  [0157](0157-a-song-is-a-section-and-a-dial-paints-the-voice.md)'s per-frame read.

**The peek hands over the step.** `PlayerPeek` was `{ part, voice, song, sparkPosition }`; all three
of the first are fields of the standing `PlayerStep`, so one fact was declared three times and
everything else a picture needs — the repeats, the gate, the hole, the reversal, the spark — was
unreachable. It is now `{ step, at, sparkPosition }`: the very object the walk drew, handed on and
never copied (0070), plus the ordinal of that landing in this pass. The transport's queue entry
keeps the step for the same reason and drops the five fields it used to copy off it; `armStep` is
handed the ordinal explicitly rather than reading `laid` beside a `draw()` that has already moved
it. Nothing durable moves and no fingerprint depends on a peek.

**The scope draws the future only, and that is a decision.** When a dial moves, `rearm` re-derives
the _tail_ under the new spec while the landings that already sounded were laid down under the old
one. Any re-walk from zero under the current spec would therefore reproduce a past that was never
played — a picture disagreeing with the sound, which 0159 already names as worse than no picture.
Recording what actually sounded would mean per-landing state on the frame path. So the window
begins at the landing the clock is inside: that block is the ink at full strength, and the landings
after it fade towards `FUTURE_FADE`. "Past blocks in the muted ink" has nothing to draw.

**And that first block is the transport's, not the caller's own walk.** `rearm` keeps the entry
already sounding and lays only the ones after it down again, so a walk of the spec held now agrees
with the sound from the second block on and not at the first. The peek hands the standing step
over, and `scopeGeometry` takes it as the block the playhead runs across.

**The window is an append-only cache, never a re-walk.** `playerWalk(spec, from)` burns `from`
steps, so a memo keyed on the ordinal re-walks from zero at every landing boundary at linearly
growing cost, and one keyed on the spec re-walks on every stepped pointer move of a drag — on top
of the full walk `rearm` is already paying there (0144). `src/ui/PlayerScope.tsx` holds a ref of the
steps it has drawn and the cursor that drew them, extends it as the ordinal advances, and throws it
away only when the `player` object changes identity. The geometry is folded when the window moves —
a landing boundary, a dial move — and every painting between two of those draws the one already
held. The painter is a budget on the one loop at `PLAYER_SCOPE_PAINT_MS`, not a second RAF loop.

**One ink and no new token.** The picture is the card's `--primary` at three alphas: the standing
block, the future, and a ghost at the spark's own level. The colour boundary's fifth crossing is
not worth spending here.

**The reach fan is odds, and it is offsets from here.** `travelReach` in `src/lib/playerTravel.ts`
spends the same arithmetic `travelFrom` spends one random number on over every outcome at once, and
`src/ui/PlayerReach.tsx` draws the likeliest few as legs from a hub. It is labelled by how far the
jump goes rather than by which slot it lands on: an absolute origin is a per-frame read, and
threading an instrument handle through the seven doors `playerDials` is called with to get one
would buy a number the four travel dials are already taught by. It redraws on a commit and never on
a frame, which is what makes it the one surface that says what the pattern _might_ do.
