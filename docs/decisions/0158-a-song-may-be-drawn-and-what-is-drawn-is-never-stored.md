# 0158 — A song may be drawn, and what is drawn is never stored

- **Date:** 2026-08-25
- **Status:** accepted
- **Extends:** [0153](0153-a-song-is-a-run-of-parts-the-walk-plays-back.md) — an arrangement the
  pattern writes, beside the one a hand types; and
  [0151](0151-a-figure-is-a-run-of-slots-the-walk-plays-back.md), whose four amounts these four are,
  one tier up

`PlayerSpec` grows `arrange`, `arrangeKeep`, `arrangeChance` and `arrangeReturn` — the figure's four
said in **parts and rounds** instead of slots and passes. `createDrawnSong` is `createFigure`'s
cursor one tier up: a run of parts laid one at the jump it begins, played back for as many rounds as
the keep asks, one part of it redrawn on the chance, and let go either onto a new run or back to the
one the walk began with. Saying it is that shape is what kept it small — nothing new had to be
argued, only re-read.

**The drawn song is not stored, and could not be.** It is a function of the seed and the four
amounts at walk time, re-derived by replaying the way the figure and the song cursor already are. A
durable list that rewrote itself while it played would be a session changing without a command and a
performance no seed reproduces ([0089](0089-a-jump-is-the-transports.md),
[0096](0096-a-moved-number-re-derives-the-tail.md)). So a step carries the run it was walked in, the
transport hands that reference on through `DeckPeek`, and every surface reads the arrangement there
— the same seam the standing part already came through ([0157](0157-a-song-is-a-section-and-a-dial-paints-the-voice.md)).
The cursor hands out a copy at each part boundary, which is its one allocation: a run mutated under
a step already armed would be a surface reading an arrangement the ear is not on yet.

**Which author is live is a rule and not a field.** `arrange > 0` draws; anything else walks the
written list, which is held untouched meanwhile and comes straight back. A field saying which one
was live is a thing that could disagree with the amounts, and this module has no such thing anywhere
— an empty list is the whole of "no song" and `phrase: 0` the whole of "no figure".

**A drawn arrangement is a run of characters and nothing else**, which is 0151's "a figure is a run
of slots and nothing else" said one tier up. A drawn part's length, amount and chorus are
`PLAYER_PART_DEFAULTS`: every one of them has a dial or a switch of its own, and a fifth amount here
would be the module drawing what a hand already says. No chorus among them either — a run that comes
home is what `arrangeReturn` is, and that is the same argument 0153 made in the other direction.

**A part's id is minted off a counter and never off the stream.** A drawn part has no gesture to be
minted at, and a badge that spent a draw would put the arrangement's own names inside the one thing
a seed reproduces. The counter replays exactly with the walk, so the badges are the same badges
twice.

**No character may name one of the four, and no character press may write one.** They are
`PLAYER_SONG_KNOBS`, declared once: the fields of this spec that say what the _song_ is rather than
what a part of it is like, which is what `song` itself is and why that field is not a knob at all.
A part names a character, so a region naming one would be a part rewriting the song it is in —
0153's refusal, said for the drawn list — and the registry throws at load if a region does
([0122](0122-a-registry-answers-for-itself-at-load.md)). The press is the other half and is the one
that bites: a press blends from `PLAYER_DEFAULTS`, whose `arrange` is zero, so a name pressed while
the pattern drew its own arrangement would silently swap the author of the song. `PlayerCharacter`
holds the four back at both of its patches. The four stay in `PlayerVoice` regardless, because a
voice is the spec as the standing part reads it and every dial paints from it.

**What is shown is the section P115 built.** A drawn run is drawn in the same list, in the same box
and the same ink, with the standing part lit — read where an arrangement is already read rather than
in a second display. It is read-only because there is nothing there a gesture could edit, and the
rows are painted per frame off the peek rather than held in React, which is the seam every live read
on this card runs on. A row with nothing drawn yet reads as a dash
([0063](0063-an-unanswerable-counter-reads-as-a-dash.md)), so a stopped yard shows the shape of what
it will draw.

`PlayerStep` moved to `src/lib/playerWalk.ts` beside the walk that produces it — `src/lib/player.ts`
was over its hard cap, and the step had been the walk's own shape since P111 took the walk out.

Durable shape: the four amounts, validated by the one validator, projected in declared order and
carried by the ordinary `deck.player` command. Nothing about a drawn arrangement is durable at all.
Pre-release, a stored spec without the four is discarded rather than repaired
([0026](0026-pre-release-has-no-migrations.md)).
