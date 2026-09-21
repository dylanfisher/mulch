# 0384 — A picture with no screen yet draws nothing

- **Date:** 2026-09-20
- **Status:** accepted

**A painting whose canvas has never stood on a screen tile lays nothing down and asks to be
drawn again** — the bail every other unready tile already takes (0144). The flat-ink fallback
stays for the canvas the engine will not build a pattern for at all, and for every canvas that
has had a screen: a dropped tile costs the screen and never the picture.

**Because the flat ink is a solid rectangle, and on a full window it is the whole picture.** The
popped-out picture opens on a canvas of its own, so the shop holds nothing for its slot and its
first tile is a bake away (`screenTileFor`, src/ui/moireScreenShop.ts). Meanwhile `inkThrough`
filled the canvas flat in the resolved `--primary`, and the rows' own cut took almost nothing
back out of it: a headed run reading the popup's first painted frame found `rgb(225,113,0)`
opaque at all five points of a 720×480 window for about forty milliseconds, twice, before the
grid arrived — the orange the human reported. With the bail it reads transparent at all five,
twice, and the window shows its own background until the picture lands at ~90ms.

**What this costs:** a browser whose engine would give a bake no context to land in now draws no
picture rather than a flat rectangle of ink, because the shop never comes to hold that tile and
the answer stays `BAKING`. Flat ink is left for the canvas whose tile the shop holds and whose
pattern the engine then refuses. Both are told apart at the source — `BAKING` is what `screenOf`
answers where the shop had nothing at all — and a canvas that can draw neither is one that cannot
draw the picture anyway.
The painter was at the 800-line hard cap, so the frame it lays back into itself moved whole into
src/ui/moireCanvasFeedback.ts to make room for the guard.

**Not chosen:** a fade, a held-back canvas or an opaque background under the picture. All three
hide the flash; none of them stops a solid colour being drawn and called a yard's drift.
