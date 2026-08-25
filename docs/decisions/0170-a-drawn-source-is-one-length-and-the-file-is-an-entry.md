# 0170 — A drawn source is one length, and the file is an entry

- **Date:** 2026-08-25
- **Status:** accepted; extends [0136](0136-a-yard-reads-from-its-top.md) and
  [0110](0110-a-tone-is-read-at-the-rate-its-own-parameter-sets.md).

`secs` leaves the generator source. `SourceRef`'s synthetic half is `{ gen, hz? }`, and how long a
drawn source is is its own kind's answer — `genSecs` in `src/lib/waveform.ts`, `GEN_SECS` for
every kind and `TONE_SECS` for the one whose length is a whole number of cycles of its own
reference (0110). The Length field beside the source control goes with the field on the payload,
and so do the bounds it validated against: `MIN_SECS`, `MAX_SECS` and `isGenSecs` existed to hold a
number off the wire, and there is no such number any more. `renderGen` still takes a length,
because it is the sample maths and a length is what makes samples; what it no longer does is judge
one.

**A generator is a fixture to play against, not a clip to trim.** The field asked, of every load, a
question the loop handles under it answer better and the crop answers permanently — and it asked it
of a person who has not yet heard the source. What is left is the whole of what a yard plays said
in its header and nowhere else (0136): one control, naming what is loaded.

**The file that is loaded is an entry of that control's own group.** A yard reading imported bytes
was named on the trigger and was nowhere in the menu, so the group of alternatives had nothing
checked and the one thing the yard was actually playing was the one thing it could not be seen
choosing. It is now the first entry of the radio group, checked, wearing the name read off the id
the bytes are stored under ([0127](0127-an-export-is-a-folder.md)) and truncated there the way it
is truncated on the trigger — and it is checked by that id rather than by that name, because an id
an import minted can never collide with a generator's kind. Import Audio stays below the separator:
it is an action that replaces the source, not an alternative the source can be.

**A short source is now made rather than loaded.** Nine browser scenarios wanted a buffer that
stops inside a render or a burst the rack can be heard decaying after, and they got it by asking
for one at load. They now seek to the tail they want — the same `deck.seek` a click on the peaks
sends — or loop the whole clip when what they want is a source that never stops. That is the
honest reading: a drawn source has one length, and where a pass starts and where it repeats are
what a performance was always made of.
