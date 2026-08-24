# 0144 — The picture may fall behind; the hand may not

- **Date:** 2026-08-24
- **Status:** accepted, constraining
  [0070](0070-a-per-frame-read-refills-and-never-clears.md),
  [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md),
  [0141](0141-colour-is-something-an-effect-turns.md) and
  [0142](0142-a-row-is-cut-on-a-coordinate-of-its-own.md)

A curved or tinted row's tile is the picture's own size and is written a pixel at a time. 0142 said
it runs on a rebuild and never on a frame, and it did — but a _rebuild_ was every commit, and a
knob turned on a claiming parameter commits on every pointer move, so a drag paid a picture-sized
bake per stepped move on the thread the hand was on. The knob and the yard under it stuttered.

**The drift is a visualization of the sound and never the sound.** It may lag, drop frames and
arrive late, and nothing about the instrument may wait on it. Everything below follows from that
one sentence, and the direction the error is allowed to run in is always: the picture pays, the
hand does not.

**A bake asked for is not a bake taken.** A curved row asks the tile shop
(`src/ui/driftTiles.ts`); the shop answers with the tile it holds, and takes at most one bake a
painting. A drag that asks for forty costs the number of paintings it lasted.

**The picture keeps its own cadence, declared in one place and slower than the frame rate.**
`DRIFT_PAINT_MS` in `src/lib/moire.ts`, spent through `paced` in `src/ui/frame.ts` — a _budget_ on
the one loop and not a second RAF loop, which plan §2 forbids. Every ask goes through it, a
commit's as much as a frame's, so forty commits inside one frame are one painting. A drift at a
third of sixty is a drift; a knob at a third of sixty is a broken knob, and the knob is on the loop
at the loop's own rate either way.

**A late or dropped bake draws the previous tile, never nothing.** The shop holds what each row was
last drawn with, and the _place_ that tile was baked at travels with it — so the row is drawn where
its tile is rather than where the knob has since moved it. A row the picture has never drawn yet is
the one case that draws nothing, for the painting or two before its first tile exists. A row is
identified for this by where it stands in the picture's own row order as well as by what kind of row
it is: a row's shape is folded off its parameter, so two lanes on one knob of two instances of one
effect are the same kind, and a fallback keyed on kind alone would hand each the other's rings.

**Neither cache may evict what the painting it is inside is about to draw with.** A tile now lands
mid-walk, so "wanted this painting" is not enough — everything after the bake still carries the last
painting's stamp. Both caps keep what was wanted in either, and a rack over the cap goes over it for
as long as it is up and shrinks back after, rather than rolling.

**The bake leaves the main thread where the browser allows it.** `src/workers/drift.ts` bakes into
an `OffscreenCanvas` and sends an `ImageBitmap` back, through the port in `src/app/drift.ts` — the
shape `src/workers/analysis.ts` and `src/app/analysis.ts` already establish, and the tier that may
reach a worker at all (docs/map.md). Feature-detected on `Worker` and `OffscreenCanvas` together; a
browser with neither, and one whose worker will not load, falls back to the one-bake-a-painting
path above and draws the same picture a beat later rather than a different one — said once on the
log, because a picture quietly costing the hand a bake a painting is the silent fallback principle 5
forbids, and a tile is a picture and not session state so there is no bus to say it on. The pixel loop
itself is `curvedField` in `src/lib/moireGeometry.ts` and is shared by both, so there is one of it.

**A tile that lands between paintings asks to be drawn.** `onDriftBaked` is how a worker's reply,
and a bake a painting could not afford, reach the surface — a halted yard is painted on a commit
and not on a frame, so nothing else would ever draw it.

**What is not taken: durability.** A cadence is not a view preference and a tile is not session
state. Nothing here is stored, no command is sent, and `src/app/drift.ts` writes no state despite
its tier — it is a port and nothing else.
