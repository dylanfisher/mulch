# 0176 — A part is the dials it was captured from, and the selected part is what they turn

- **Date:** 2026-08-25
- **Status:** accepted; supersedes the second half of
  [0157](0157-a-song-is-a-section-and-a-dial-paints-the-voice.md) — "turning it still patches the
  spec the parts are a distance from" — and replaces what
  [0153](0153-a-song-is-a-run-of-parts-the-walk-plays-back.md) made a part out of. Everything else
  both decided stands: the section is still a full-width fold under the dials, a part still carries
  an opaque id minted at the gesture that adds one, what is standing is still a per-frame read, and
  a dial the pattern can move still wears a mark saying so.

A **part** is `{ id, voice, length }`: the numbers a hand turns, captured whole, and how many jumps
it lasts. `voice` is `PartVoice` — `PLAYER_PART_KNOBS`, which is `PLAYER_KNOBS` less the four the
song itself is drawn by.

**A part was a plan to draw a character; it is now a pattern.** 0153's part named a character and
an amount of it, which made "another riff" free and made "this part, exactly as the card stands
right now" impossible — the one thing a person arranging a song asks for first. Add Part captures
the dials as they stand, so the character menu becomes one way of filling that spec rather than the
whole of what a part is, and the dials are the other.

**What it costs is the redraw, and the chorus with it.** A riff part no longer deals a new riff
every time it comes round, so `chorus` — the switch that said which part was the exception to that
redraw — has nothing left to be the exception to and is gone. An arrangement that draws itself is
what `arrange` already is ([0158](0158-a-song-may-be-drawn-and-what-is-drawn-is-never-stored.md)),
and it goes on drawing its parts from the cast: a drawn part is drawn whole at the jump the run
lays it down, in the same two draws and the same order the cast and the region were drawn in
before.

**The selection is what the dials turn, and it is a view preference.** One part at a time, held by
the yard the way both folds are — no command, nothing durable, no history entry (plan §2). While
one is selected every dial on the card reads that part and writes into it, in the ordinary
`deck.player` carrying the whole spec; with nothing selected they read and write the pattern, which
is what they have always done. A selection naming a part the song no longer holds is no selection,
so removing a part needs no cleanup anywhere. The four song knobs are never a part's: the Arrange
box reads and writes the card's own however a hand is pointed, which is 0153's refusal — a part may
not rewrite the arrangement it is inside — said for a captured spec instead of for a region.
`PLAYER_PART_KNOBS` and `PLAYER_SONG_KNOBS` are declared in two files, so `src/lib/playerKnobs.ts`
throws at load unless they partition `PLAYER_KNOBS` exactly ([0122](0122-a-registry-answers-for-itself-at-load.md)).

**Two inks, and the hand's wins.** A row a walk is standing on stays `bg-primary/15`
([0172](0172-a-lit-row-is-not-a-pressed-control.md)); a row a hand has selected is `bg-foreground`
at a wash, and every dial the selection reaches wears the same ink in the marker corner the walk's
own mark sits in. Never both at once: a card pointed at a part paints no voice, because the numbers
on those dials are then a thing a hand set rather than a thing the walk is reading, and a dial
standing somewhere the hand did not leave it must never read as one the hand moved — either way
round. A selected row draws no standing variant at all, because what a selected row is _for_ is the
dials above it, and the walk moves on by itself.

**A part is validated by the one validator.** `assertPlayer` checks a part's captured spec by
filling in the three fields a part does not carry and calling itself: the numbers a part holds are
this module's numbers, and a second copy of thirty-two bounds beside `songOf` is the copy that
would drift the first time a range moved (principle 1). A voice keyed like anything but
`PLAYER_PART_KNOBS` — missing one, or carrying `arrange` — is refused before the fill.

**Nothing mints a second name for a part.** `partBadge` and `src/ui/PlayerStanding.tsx` already
say which part is which (P115, P117), and with the character gone they are the whole of it: the
header reads a song out as its parts' badges, the standing readout is the word and one badge, and
the row a hand presses to select a part _is_ that badge. A drawn arrangement's rows say the badge
and how long the part lasts, which is the one field of a part a listener counts.

Pre-release, a stored spec whose parts are the old shape is discarded rather than repaired
([0026](0026-pre-release-has-no-migrations.md)).
