# 0188 — A part can be written as a row of cells

- **Date:** 2026-08-28
- **Status:** accepted, extending [0176](0176-a-part-is-the-dials-it-was-captured-from.md) by one
  field and taking [0163](0163-a-placed-rest-is-the-fields-other-author.md)'s shape one tier up.

**A `SongPart` carries `steps`: a run of cells, each one landing.** A cell is a slot, a count and a
wait — `{ slot, repeats, rest }`, in `src/lib/playerStrip.ts`, every bound of it a bound this module
already declares. While the row is non-empty it is **the other author of where the pattern goes**:
the walk stands on `stripStep(written, wrote)` instead of walking `figure(slot)`, takes the count
off the cell instead of the hold, and the wait off the cell instead of `drawRest`. An empty row is
the whole of "this part is drawn", which is every part until a hand writes one, and a part with no
row lays down precisely the stream it laid before rows existed — no draw is taken for a cell nobody
wrote and none is skipped for one nobody read.

**Because everything this module does was a dial and a roll.** There was no way to say "slot 0 four
times, jump to 3, twice, breathe, then slot 7 eight times" — only ways to make it likely. The row
is that sentence, and it is a control of a kind the card did not have: a thing you read left to
right rather than a forty-first amount.

**There is no jump token and no repeat bracket.** The jump is the _gap_ between two cells,
`next.slot - this.slot`, drawn between them as a readout — a jump of its own would be a second
author of where the cell after it lands. The repeat of the whole row is `part.length`, which
already says how many jumps a part lasts: the row is read modulo its own length, exactly as a
placed rest's figure is, so a row shorter than the part comes round for as long as the part stands.
Both are principle 1 — one fact, one field.

**The row starts again at each part, and the slot does not.** A row belongs to the part it was
written on, so carrying one across a boundary would be a part playing another part's landings; the
slot goes on being the one thing a part inherits, so a drawn part after a written one carries on
from wherever the row left the walk — 0184's argument for the ground, said for the row.

**What the row never touches is how a landing sounds.** The burst, the gate, the hole, the
reversal, the spark, the ratchet and the rate ladder stay the part's dials, and the nine song knobs
stay the song's. A written part still stutters, drops and moves through the source; what it stops
doing is guessing where to go.

The row is drawn in the part's own fold, above the dial boxes, and every gesture on it is one
`deck.player` carrying the whole spec, like every other edit on the card. Which cell the editor is
pointed at is a view preference: no command, nothing durable, no history entry.
