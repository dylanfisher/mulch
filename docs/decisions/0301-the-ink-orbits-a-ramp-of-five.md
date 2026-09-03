# 0301 — The ink orbits a ramp of five

- **Date:** 2026-09-03
- **Status:** accepted, amending [0141](0141-colour-is-something-an-effect-turns.md) and on
  [0266](0266-the-picture-travels-its-ink.md); the structure bench's Colour argument taken
  ([0295](0295-the-structure-bench-is-its-own-route.md))

The picture's ink was the caller's `text-*` token blended toward one of two tokens, and the only
thing time did to colour was hold a young picture's claim back. A yard with nothing in its rack was
the same hue at the end of an hour as at the start, and a rack that claimed a hue stayed there.

**Time moves the rest, and never a claim.** `orbitHue(sounding)` (src/lib/moireColour.ts) is one
sine over `INK_ORBIT_SECS` of the deck's own sounding seconds, `INK_WANDER` either side of the
middle stop. `agedHue` spends a row's claim against that rest rather than against the middle: what
an effect turns is still how far _off rest_ the picture is drawn, and the age still widens it and
may not invent it (0141). Rest is exactly the middle at no seconds of sounding, so a halted yard
is painted on a commit in the caller's ink (0144) and a deck that has just begun draws what every
yard drew before this. On the deck's clock and not the wall's (0126): a paused picture is not one
that is still going somewhere.

**Five stops, and no new token.** The ramp is `--drift-cool`, `--screen-green`, the caller's own
ink, `--screen-red`, `--drift-hot` (`INK_RAMP_TOKENS`, src/ui/moireScreen.ts) — the structure
bench's ramp with the ground left off, because the alpha is the surface's. The two channel tokens
are ones the screen already reads for its lattices, so the colour boundary is crossed no further
than 0141 crossed it, and `scripts/arch` has nothing new to allow. A sixth would be a crossing with
a record of its own (0236). `ramp` moves from the bench to src/lib/moireColour.ts with the `Ink`
it reads, because the painter spends it now.

**The hue walks its own ladder.** Eight steps across four spans of ramp is a visible jump at each,
so the hue is keyed on `HUE_STEPS` = 32 (`steppedHue`) where the other three terms keep
`DRIFT_STEPS`. The orbit walks it both ways all the while the yard sounds — at rest values, one
bake every few seconds, and `TILE_CACHE` is doubled to 48 so a whole swing's stops are held and
built once a session rather than once a pass. Nothing bakes a frame (0129).

**Tuned, not stored** (0299): the orbit's seconds and its wander are `tunable`s in the "Colour"
group; the ladder is bake-side and stays a const.
