# 0231 — There are two tiers, and a third earns a fact of its own

- **Date:** 2026-08-31
- **Status:** accepted, superseding [0214](0214-a-tier-is-the-tier-under-it-said-again.md) and
  amending [0224](0224-the-drift-has-a-layer-per-tier-and-a-field-the-ground-moves.md)

`PlayerSpec.albums`, a run of albums of songs of parts, is `PlayerSpec.songs`: a run of songs of
parts. 0214 built the album on one true argument — a tier shaped like the tier under it costs one
editor rather than three — and that argument is about the _cost_ of a tier, not its _reason_. An
album carried a name, an order, an id and a count of rounds, which is exactly and only what a song
carries; two tiers that differ in nothing but their depth are one tier a hand has to choose a level
in twice. **What a tier has to earn is a fact of its own.** The part earns a length in jumps, a
voice and a switch; the song earns the parts it is a run of and the draw that may fill it
([0158](0158-a-song-may-be-drawn-and-what-is-drawn-is-never-stored.md)); the album earned rounds,
which the song already counts. A third tier arrives when it can name a fact neither of these has, or
it is not a tier.

**The picture loses nothing it could draw.** 0224's second paragraph already said that
`gratingPitch` saturates both coarse layers, so on most jumping yards the song's row and the album's
were drawn at the same spacing and told apart only by the fold of their ids. A layer nobody can see
a spacing difference in is a layer, not a tier: the song's row takes `DRIFT_BROADEST_PITCH` outright
and there is one coarse layer over the part's, which is the band the picture had before 0224 asked
it for three. `SongPlace` drops `album`, `albumPlay` and `albumLeft`, so the walk's lanes are two,
its boundary rules two weights — the taller going to the song round's end, which is the top
boundary the run now has — and `bedPer` counts on `jump`, `part` or `song` and nothing above.

**A part id stays unique across the whole spec**, and the validator stays keyed that way (0214's
last paragraph): a selection, a solo and an audition still name a part by its id alone. Nothing is
migrated; a stored spec of the three-tier shape has a field this build does not declare and is
discarded rather than repaired ([0026](0026-pre-release-has-no-migrations.md)).

**A file keeps its role under a name that says one tier.** `playerAlbum.ts` is `playerSongs.ts` —
the run of songs, its cursor and its validator, beside `playerSong.ts`, which is still what one
song's parts are; `copyAlbum.ts` is `copySongs.ts`; `PlayerAlbum.tsx` is `PlayerSongRow.tsx`, the
song rows above the parts. They are renamed rather than folded into their neighbours because
`copy.ts` is at the hard cap and `PlayerSong.tsx` is at the line cap, which is the same reason each
was a file of its own to begin with ([0045](0045-the-hard-cap-is-enforced-where-no-waiver-reaches.md)).
