# 0221 — A place is the cursor's, and a row's countdown is an estimate

- **Date:** 2026-08-31
- **Status:** accepted; the cursor is `createSongs` and the tiers are two since
  [0231](0231-there-are-two-tiers-and-a-third-earns-a-fact-of-its-own.md) — the album's id, round
  counter and jump counter are gone from the place, and every sentence below holds of the song's

**Where a run is standing is `SongPlace`, and the run's own cursor is its one author.** The cursor
that advances the tiers is the only thing that knows which round of which song it just handed a part
out of, so it answers the whole place — the song's id, its round counter, and the jumps still to
come of the standing part and of the song round over it — instead of the single `first` it used to
hand out. Anything deriving a tier's place from an
ordinal of its own would be a second walk, and two walks of one run disagree the first time a count
of nought passes a tier over (principle 1,
[0157](0157-a-song-is-a-section-and-a-dial-paints-the-voice.md)).

**It rides the step, for the reason `part` and `bed` do.** A step is armed seconds before it
sounds, so every surface that draws the arrangement asks where the pattern is _now_ rather than
where the list is (0157, [0180](0180-the-walk-is-drawn-forward-only.md)). The cursor speaks once a
part; the walk brings the three counts down one per jump and hands each step its own frozen copy,
because a count moving under a step already armed would say a part has less left than the landing
being drawn ([0070](0070-a-per-frame-read-refills-and-never-clears.md)). A run the pattern drew for
itself carries **no** place at all: an arrangement that moves as it plays is not a row a hand could
point at ([0158](0158-a-song-may-be-drawn-and-what-is-drawn-is-never-stored.md)).

**The seconds on a row are an estimate and are drawn as one.** Every jump still to come is priced
at the landing the standing part's **dials** say. That is `stepSecs`, the one spelling of how long
a landing occupies whether it is being laid out on the picture or counted down on a row, so the
dials move the countdown exactly as they move the automator's own. The dials and not the step they
drew: `burst` strays and `rest` is rolled per jump, so a row costing its whole tail at the last
landing drawn would bounce by a factor at every jump with no hand near it, which is a clock nobody
can read rather than an estimate. It is said in `growthLeft`, this instrument's one spelling of
"how long is left", and it stays one spelling wherever it ends up living. A yard whose loop has no
grid has no seconds to say and says none, which is the answer the picture above it already gives by
not being there ([0159](0159-a-song-is-the-pictures-one-stepped-row.md)).
