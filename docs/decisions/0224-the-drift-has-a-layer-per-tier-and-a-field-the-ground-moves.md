# 0224 — The drift has a layer per tier, and the ground moves the field

- **Date:** 2026-08-30
- **Status:** accepted, extending [0159](0159-a-song-is-the-pictures-one-stepped-row.md),
  [0196](0196-the-reference-row-is-cut-by-what-is-sounding.md) and
  [0212](0212-the-picture-draws-the-run-a-read-is-holding.md)

**The jumps module carries one row per tier of the arrangement, not one row.** The part's row is what
it was; a song's row and an album's stand over it, each broader than the layer under it and the
album's at `DRIFT_BROADEST_PITCH`, the coarse end of the band the field's own row already sits at —
so the three sit inside the band the picture has rather than off the end of it, a part changing is a
fine layer moving over a coarser one holding still, and an album coming round moves the picture
wholesale. The song's is the geometric middle of the two, because what one spacing does to another is
a ratio. Each is folded off its own tier's id, off the `SongPlace` the standing step already carries
([0221](0221-a-place-is-the-cursors-and-a-countdown-is-an-estimate.md)) — so each steps at its own
tier's boundary, and nothing re-derives a place. How broad a row is drawn is fixed per tier rather
than folded: it is what says which tier the row _is_, and a spacing drawn out of an id would make an
album's row a second part's. Neither tier over the part claims the picture's colour or its anchor:
the part standing and the ground being read already claim those, and a broader layer saying them
again is one fact drawn twice. Both cut as deep as any row nothing reaches, because a layer that
cuts nothing is a layer nobody can see — which is also what lets one of them own a motion of the
screen where no lane or instance folds into that quarter (`termTurns`, src/ui/moireScreen.ts). That
is the part's row amplified rather than a new kind of thing: the module is one of the instrument's
own rows, and the motions belong to what is moving the sound.

**The picture's band has room for two coarse layers, not three.** `gratingPitch` clamps every row's
drawn spacing into `[middle / PITCH_SPREAD, middle * PITCH_SPREAD]`, and `DRIFT_BROADEST_PITCH` is
the ratio that reaches that ceiling from anywhere inside — so on most jumping yards the song's row
and the album's are drawn at the same spacing, and only the part's, which its own length can put
below one, stays finer than both. No other ratio fixes it: past roughly `across = 2.19 × middle` the
window's own compression alone reaches the ceiling, so every ratio at or over one saturates
whatever it is. Left as it is rather than given the tiers a band of their own: the band has one
owner, an effect's row at `DRIFT_PITCH_REACH` saturates identically, and the three layers are still
three — a part changing is a finer layer moving over a coarser one, and the song and the album are
told apart by the angle each is folded to and by which boundary steps it.

All three are the frame's rows and not the session's — 0212's first question — because every one
rests on a per-frame read of where the walk is standing. They exist exactly where the module's row
already existed: wherever the yard is actually jumping.

**And the ground moves the field the whole picture is beaten against.** Until now the ground reached
one thing: `heardPitch` recut the reference row from the stretch of source under the playhead, which
is what makes two grounds two spacings (0196). The reference row and the wash over it are now
anchored on the ground the way the module's row already is (`playerRowCentre`), and the wash's
identity folds the ground's own band, so a jump to a new stretch re-centres and rotates the field
instead of only respacing it. Folded off `bedGround`'s own whole-number offset, so one ground is one
field however long it is looked at and two grounds a few seconds apart in one file are two fields;
folded with the row's own resting identity beside it, so two rows one ground moves are moved to two
angles rather than drawn parallel.

**The reference row takes the anchor and not the turn.** The step asked for both rows' identity;
`gratingTurns` pins the axis at zero turns because the reference row is what every other row is
fanned either side of, and `termTurns` skips it for the same reason — so an identity written onto it
moves nothing anyone can see, and costs it the zero no fold produces, which is the one thing that
identity says. The half the step wanted is delivered by the row it is actually about: the wash _is_
the field's own row (0213), so it is the layer the whole picture is beaten against that turns.

Nothing durable moved, no analysis field was added, and no `DRIFT_*_REACH` moved. Everything here is
`BeatAnalysis.onsets`, the loop, the duration and the ground, which is what `heardPitch` already had
in hand — a picture may rest on it precisely because none of it is stored
([0145](0145-a-picture-may-rest-on-analysis.md)).
