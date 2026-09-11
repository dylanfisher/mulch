# 0356 — the part picks the alphabet

The picture is written in one of three alphabets — the shipped marks, the rings, the strokes — and
which one is a fact about the section of the song that is standing. `src/lib/moireAlphabets.ts`
holds the three tables, `alphabetOf` refuses any of them that is not ten marks of strictly rising
ink at load, and `ALPHABETS` names them. `markCoverage` and `markWeight` take the alphabet they
read; the ramp onto a mark — `GLYPH_PHASE`, `GLYPH_PUSH`, `pushRead`, `markAt`, `markBlur` — stays
in `src/lib/moireGlyph.ts`, which now holds no table.

**The alphabet is a name on the tile's key, never a table.** `ScreenBake.alphabet` is one of three
strings and the key `screenOf` writes carries it, so a section changing is one rebake and never a
cell moved — and it crosses to `src/workers/screen.ts` by `postMessage`, which a function could not
(0354). The worker looks the table up out of its own constant. All three lattices of a tile read
the one alphabet — the fine one, the rack's second (0351) and the specks' scatter (0352) — because
they are one picture in one hand, and so does the frame-side stamp (0350), whose mark tiles are now
minted on the alphabet beside the bit and the ink.

**A part's character is not durable, so the picture folds the part's identity instead.** A part
carried a character until 0176 and carries a spec now, and a label read back off that spec is
refused outright: a list of names has no nearest (0174, `partSignature`). What a part really has is
the opaque durable string that says which part it is (0157), which the peek already carries as
`step.part`. `partAlphabet` folds that string onto `PLAYER_CHARACTERS` — the same declared list a
drawn part takes its own name from — and `CHARACTER_ALPHABET` maps the six names onto the three
alphabets. **Off bits no other pick of that badge spends**: the module's own row already reads the
fold's last two for its tint, the two above those for its geometry and the two above those for its
profile (src/lib/playerDrift.ts), under that file's rule that a second pick off one slice is a
fourth name for the same thing — so the alphabet is read six bits up, and does not change exactly
when the colour does. So the picture reads _which_ section is standing and never guesses what it sounds like;
the fold is pure and spends nothing off the walk's stream (0089), so a drawn arrangement takes the
hands it takes and takes them again on a replay. Three hands over six names, so about a third of the
section changes leave the picture in the hand it was already in. A yard with no part
standing writes the shipped marks, which is the picture drawn before there was a song behind it.

The read costs nothing: `MoireStrip` writes `set.alphabet` off `step.part` beside the sounding and
the age, so no moiré file walks the song for a part it already has the id of, and `standingPart`
keeps its one walk for the tier rows.
