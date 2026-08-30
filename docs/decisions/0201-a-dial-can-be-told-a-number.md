# 0201 — A dial can be told a number, and a unit is read back where it is spelled

- **Date:** 2026-08-29
- **Status:** accepted, extending the knob rather than replacing any of it: the drag, the fine
  drag, the keyboard steps and the double-click reset are all exactly what they were.

**Every readout is a field.** A dial is aimed, not addressed: a sweep of 270° across a range twelve
doublings wide cannot land on 220Hz, and a hand that already knows the number it wants had no way
to say it. So the number under every knob in the instrument is pressed to open it, holding exactly
what was on screen, and Enter or leaving it commits — through the same `snapToStep` a turn commits
through, so nothing enters by the keyboard that a turn could not reach. Escape puts it back. A
reading nothing can be read out of — an empty box, a stray letter, a half-typed minus sign — leaves
the dial standing rather than snapping it to a zero nobody asked for (principle 5).

**And the way back from a reading lives beside the reading itself.** A readout is free to spell its
value in a unit of its own — `1.25s`, `500`, `100%` — and the field opens on that spelling, so
every format that is more than the number needs an inverse declared next to it: `secondsValue`
beside `secondsLabel`, `burstValue` beside `burstLabel`, `groundValue` beside `groundLabel`. A
parser is handed the dial's own bounds, which is what tells two units apart without a second
declaration of which unit is which — a burst of `500` is milliseconds precisely because the dial
does not reach 500 seconds.

The readout is torn down and rebuilt every time a hand types into it, so the per-frame painter
compares against the text that is actually on the element rather than against one it remembers
(`src/ui/Knob.tsx`). That is the whole cost of this, and it is cheaper than the cache it replaced.
