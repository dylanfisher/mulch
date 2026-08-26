# 0178 — A part is a card, and it carries a name it was given

- **Date:** 2026-08-26
- **Status:** accepted; extends [0176](0176-a-part-is-the-dials-it-was-captured-from.md). Everything
  0176 decided stands — a part is still the dials it was captured from, the badge is still the
  Select toggle, the two inks are still the standing part's and the selected one's and never both.

A **part** is `{ id, name, skip, voice, length }`. Two fields are new and both are durable.

**`name` is a name a hand typed, and never a character.** A part no longer stores which character
it came from, and "a list of names has no nearest"
([0174](0174-an-arrangement-draws-from-a-cast-and-the-dial-is-not-a-hand.md)), so a label derived
from the numbers would be an invention. What the numbers _can_ honestly say is which of a part's
own dials are furthest from `PLAYER_DEFAULTS`, as a fraction of each dial's own declared range —
that is `partSignature`, read-only, three knobs, and none at all for a part sitting exactly at
plain. The name goes through `assertDurableText`, which **refuses the empty string**: a part is
minted with `partBadge(id)` as its name and an emptied field puts the badge back, so there is no
absent case and no default masking a missing value (principle 5).

The card's own readout follows: `songLabel` reads a song out by its parts' names rather than their
badges. It was badges because a part had no name but the one it was minted with — that reason is
spent, and an un-named part still reads as its badge, because that _is_ the name it is minted with.

`partSignature` lives in `src/lib/playerCharacter.ts` and not beside `SongPart`, which is where a
fact about parts belongs: it needs `PLAYER_KNOB_DIALS`, and `src/lib/playerKnobs.ts` reads the
arrangement's own bounds back out of `playerSong.ts`, so declaring it there would close a
load-time import cycle. It sits with `PLAYER_DEFAULTS`, which is the point it measures from.

**`skip` is held in the song and passed over by the walk.** `createSong` filters the list once at
the build rather than testing per jump — the walk is rebuilt whenever the spec moves
([0089](0089-a-jump-is-the-transports.md)) — and the run it hands each draw is the one being
played, not the one being held. **A song whose every part is skipped is the empty song**, which is
no arrangement at all: the walk plays the card's own spec, because a run of nothing is not a run.

**The row is a card: name, proportional bar, signature, and its own dials under a fold.** The fold
draws `playerDials` — the same three boxes `PlayerCard` draws, called rather than mounted, because
what a part's fold and the card show is the same boxes and not a thing that owns them. The fourth
box stays the card's: the four amounts the song is drawn by are not a part's
([0158](0158-a-song-may-be-drawn-and-what-is-drawn-is-never-stored.md)). This is the direct edit
that replaces reaching back up to the card; the selection stays, because it is what a _closed_ part
offers. Which part is open is a view preference held in `Deck.tsx` beside `songSelect`, one at a
time.

The four actions are duplicate — a fresh id, so identity is the one thing a copy may not take
([0092](0092-an-effect-copies-itself-with-one-command.md)), landing directly after its original —
skip, audition and remove. **Audition is refused rather than absent** until there is something to
play ([0121](0121-a-framed-plus-is-a-door.md)).

Two consequences the name has beyond the row. A **yard's copy** re-mints part ids
(`renamedSong`, `src/app/restore.ts`), so a name that is still the badge it was minted with is
re-minted with it — a name a hand typed is carried across untouched. And the fold's dials are
**named after the part they belong to**: an open fold draws the very boxes the card draws, so
`PlayerDoorProps` carries a `named` prefix that the card leaves empty and a part fills, because a
caption is a dial's whole accessible name and two sliders under one word are two nothing can tell
apart (0055).

What this constrains: a later field a part carries has to say whether a copy takes it, and whether
the walk reads it before or after the skip. `PLAYER_PART_DEFAULTS` may never carry the name — it is
minted from the id, and a constant there would be one name every part shared.
