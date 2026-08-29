# 0191 — The ground is a picture a hand moves

- **Date:** 2026-08-28
- **Status:** accepted, extending
  [0185](0185-the-ground-crawls-in-sixteenths.md) — whose crawl, `bedGround` seam and plant all
  stand — and resting on [0184](0184-the-ground-is-the-songs-and-a-part-plays-back-on-it.md), whose
  one ground per song is what makes one picture of it possible.

**The Which Ground box opens with a strip of the whole source, and the strip is the control.** The
loop's own window is marked on it, the ground the song opens on is drawn over that as a block, and
dragging that block writes `bed` — the very field the dial under it turns, through the same
`deck.player` every other control on the card sends (principle 1, 0089). Five numbers said only as
numbers is a box a hand cannot answer "move it until it sounds right" with; the dials stay, because
a number is how a place is _said_ once it has been found.

**Dragging moves whole beds, because `bed` counts whole beds.** The sixteenths between them are the
crawl's — drawn by the pattern from `bedDistance` and `bedBias`, not placed by a hand (0185). A
press past the end of a short file writes a bed that wraps exactly as a walked one does, because
which grounds a buffer actually holds is folded at the one place that knows (`bedWrap`); the drag
clamps to the dial's own reach and nothing else.

**The blocks ahead are read off the walk, not drawn again.** `groundsAhead` walks the held spec and
takes the next few grounds the pattern reaches, so the strip shows the moves being made rather than
a second opinion about them — the rule the scope's own sheet follows (0089, 0180). The look is
bounded at 96 jumps: a period reaching 64 would otherwise walk 256 steps at every commit of a drag
on the dial beside it, and what the picture is for is the next little while. A ground that never
moves draws none, which is the honest drawing of `bedEvery: 0`.

**It is not a second waveform.** [0171](0171-a-drawing-that-says-only-that-goes.md)'s rule is that a
drawing saying only what another surface already says goes. The yard's own peaks are where the
_loop_ is set and where the playhead runs; this strip is where that loop is _read_, and it says the
one thing nothing else does — where the ground is going next. It is also the only picture on the
card a hand can take hold of, which is the other half of why it earns its pixels.

**The sentence is on the box's eyebrow, not on the picture.** A canvas is not a thing a pointer can
rest on or a keyboard can reach, so the words go where the scope's and the written row's already go
(0080, 0188). They live in `src/lib/copyGround.ts` rather than `src/lib/copy.ts` for the reason
`copyKnobs.ts` and `copyStrip.ts` do: that file is at the hard cap (0045).
