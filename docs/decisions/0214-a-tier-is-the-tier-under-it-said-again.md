# 0214 — A tier is the tier under it said again

- **Date:** 2026-08-30
- **Status:** accepted, extending [0153](0153-a-song-is-a-run-of-parts-the-walk-plays-back.md) and
  [0157](0157-a-song-is-a-section-and-a-dial-paints-the-voice.md)

`PlayerSpec.song`, one run of parts, is now `PlayerSpec.albums`: a run of albums, each a run of
songs, each a run of the parts a song was made of before. Three tiers of one shape — a named thing,
with an opaque durable id, in an order a hand chose, saying how many times it goes round — because
that is what a part already was, and a tier shaped like the tier under it costs one editor rather
than three. **An album is not a new kind of thing, so it gets no new kind of row**: it wears the
gestures a part row wears — add, duplicate, remove, rename, the drag off `src/ui/listDrag.ts` — and
one dial. Nothing was migrated; a stored spec that is not this shape is discarded
([0026](0026-pre-release-has-no-migrations.md)).

**A count of nought is the skip.** A part carries a switch because its own count is jumps and one
jump is the least a part can last; the two tiers over it count _rounds_, where nought is a thing a
hand can mean. A run passed over and a run played no times at all are one fact, so they are one
number and never a second field that could disagree with it — the rule `arrange > 0` and the empty
song already follow ([0158](0158-a-song-may-be-drawn-and-what-is-drawn-is-never-stored.md)).

**The walk sees one cursor, not three.** `createAlbums` answers exactly what the song's own cursor
answered — the part a jump begins, the voice it is walked under, the run in force, and whether it
is the top of that run — so nothing below it knows how many tiers there are. The run that travels
with a step stays the _standing song's_ parts, which is what a ground clocked per song still ticks
on and what every surface still reads out ([0192](0192-the-grounds-period-is-counted-on-a-clock-a-hand-picks.md)).

**There is no album command.** `deck.player` already carries the whole spec, so an album edit is
the gesture every other control on that card sends, and undo, the log, the archive and graph
restore come free ([0089](0089-a-jump-is-the-transports.md)). Which album and which song are
_open_ is a view preference held by the yard — no command, nothing durable, and the first of each
until a hand presses another (`openIn`).

**A part id is unique across the whole spec**, not merely within its song: a selection, a solo and
an audition all name a part by its id alone, so two parts under one id in two songs would be two
things nothing could tell apart ([0157](0157-a-song-is-a-section-and-a-dial-paints-the-voice.md)). The one validator
refuses it, keyed the way every durable list is.
