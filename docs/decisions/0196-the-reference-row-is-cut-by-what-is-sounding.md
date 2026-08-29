# 0196 — The reference row is cut by what is sounding

- **Date:** 2026-08-28
- **Status:** accepted, extending
  [0145](0145-a-picture-may-rest-on-analysis.md) — the picture may still rest on analysis, and
  still stores none of it — and answering for the drift what
  [0185](0185-the-ground-crawls-in-sixteenths.md) and
  [0191](0191-the-ground-is-a-picture-a-hand-moves.md) made a gesture: a yard reading one part of
  its file is not a yard reading another.

**The loop's row is recut, once a painting, from the stretch of source under the playhead.** Its
spacing is the onset density of a window either side of where the deck is actually reading
(`SOURCE_HEARD_SECS`, `heardPitch`), read through the same band and the same reach the whole file's
own cut is read through — so a mulcher that has moved the ground to a busy passage draws a finer
reference row than the same pattern reading a sparse one, and every other row in the picture beats
against a different grating for it. Until this, the row every other row is read against said the
same thing wherever the ground had crawled to, and two beds drew one picture.

**It rests at the whole file's cut.** A source nothing has measured, one with no length, one the
analyser found nothing in, and a playhead whose window falls outside the file all draw what
`sourceCut` says — the answer and not a fallback, exactly as 0145 argued for the file-wide cut. The
profile stays the file's own: a crest is measured over the whole envelope, and a wave that changed
under the playhead would be a rebuild rather than a slide.

**And its depth follows the deck's own level.** The reference row belongs to no parameter, so the
one reading that may reach it is the deck's own meter: quiet draws it shallow, loud draws it as
deep as it rests, and it is bounded to half its travel (`DRIFT_HEARD_SHARE`) so a silent yard still
draws its loop. Down and never up — a reading may never make a row deeper than a knob asked for
(0128 amended) — and nothing about it is stored.

**It costs a binary search and no allocation.** `onsetsIn` searches both edges of the window on a
list that already ascends, at the drift's own cadence rather than at 60fps (0144) — so the per-frame
read stays what 0070 asks of it. A long dense file saturates `MAX_ONSETS` before it reaches here, so
its local counts are a share of the strongest onsets rather than all of them: that moves the whole
row together and does not pick one passage out of another falsely.
