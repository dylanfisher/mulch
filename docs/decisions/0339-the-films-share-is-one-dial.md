# 0339 — The film's share is one dial

- **Date:** 2026-09-10
- **Status:** accepted, opening the block that makes the scene the body of the picture and the
  film a shade over it, over [0332](0332-a-scene-is-the-colour-and-the-film-is-the-alpha.md)

**One number says how much of the picture the film may spend.** `tunable("film.share")`, declared
in src/ui/moireScreenTile.ts beside `SCREEN_FLOOR` and read once a tile inside `build`, eases the
four keep terms toward one: `1 - share * (1 - keep)`, applied **once to their product** and never
per term, so the beat between the two gratings, the lattice they make and the band survives at
every setting and only its depth moves. At one the tile is exactly what 0332 bakes; at nought the
film spends nothing and the tile is the scene solid. A share per term would be four dials for one
question (0333) and a share per scene would make the film four films (0329).

**It rests at 0.15, and the shots are why.** Two yards — a Foxglove for the bloom, the lightest
scene, and a Willow for the canopy, the darkest — with a click train playing, the zoomed drift
photographed at 1, 0.5, 0.35, 0.25, 0.15 and 0, every reading taken twice with the settings
interleaved. At one the bloom is the picture this block was opened over: a pale vertical comb with
the poppies a stipple between its teeth, mean strip alpha 0.227 (the same figure the block's own
measurement took). At a half and at a quarter it is still a comb — 0.287 and 0.319 on the bloom,
0.287 and 0.319 on the canopy, and the heads are still a stipple. At 0.15 the heads stand in
scarlet over green stems with the beat crawling over them, and the strip settles at **0.331 on the
bloom and 0.332 on the canopy** against 0.350 with the film off outright. The dial's whole useful
travel is in its bottom fifth, because the four terms multiply: the picture is a comb long before
the number reads like most of it.

**What the dial is not the whole of.** The strip's mean alpha barely moves across the dial's top
half because the screen's film is not what spends most of the alpha — the rows' cut (`cutField`)
and the ghost are, and they are untouched here. The share is the screen's, and 0.350 at nought is
the ceiling the rest of the film leaves. The wild end is `min`: a group's push drives the film
toward spending nothing, because the picture nobody can read is the one where it spends
everything.

**The bench argues it under the app's own dial.** Entry 10, "The Film"
(src/ui/sketch/drift/SketchDriftFilm.tsx), draws the shipped bloom under the shipped four terms at
the bench's own pitch, and its dial's range, step and rest are the tunable handle's own — one
number, read where it is declared, so the bench opens at the picture the app ships. The picture is
read along the page's ground and then the bloom's five stops: what a film spends is alpha, and a
picture of spent alpha has to show what is behind it. The readout says what it leaves rather than
what it takes — how much of the field's alpha stands, meaned over the whole picture — because that
is the quantity a hand is judging.
