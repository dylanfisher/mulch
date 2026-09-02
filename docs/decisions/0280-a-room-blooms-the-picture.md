# 0280 — A room blooms the picture

- **Date:** 2026-09-02
- **Status:** accepted, standing on [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (a look
  is declared on the entry and the chain draws it), and inside the per-frame line
  [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md) draws — no pixel loop, no
  read-back, and no `ctx.filter`

**Reverb's look is the bloom, and it is the first that takes a slot in the chain.** The field drawn
small and back up over itself at the wet, with the field itself underneath: `LOOKS.bloom` says
`at: "pass"` and carries the one draw it is (src/lib/moireLook.ts), and the reverb entry maps its own
wet into `amount` and its own decay into `radius`, both turns of their own ranges. A room reads its
wet twice — once as the presence every look's terms are weighted by, once as the amount — which is
what makes a wet room bloom and a dry one leave the picture alone.

**The radius is a working size, not a distance.** A blur by downscale and upscale _is_ its working
size, so the band is stated in shares of the field (`BLOOM_SCALE`, a third down to a
twenty-fourth) rather than in pixels: the strip, the overlay and an export at any scale then bloom
by the same amount of picture rather than by the same number of pixels. And the amount stops short
of the whole of itself (`BLOOM_CEILING`), because a halo at one is the picture and the rows under it
are gone.

**Three draws, no surface of its own.** The pass keeps the small copy on the surface it is writing
into — the only place a downscale can be kept without allocating a third — and takes it back up with
`copy`, which replaces the corner it was left in rather than blending over it and which carries the
amount. `destination-over` then puts the original underneath, which is the same picture as the halo
laid over it `source-over` and one draw cheaper. Headless SwiftShader draws the self-read at size
without an artefact, which is the thing that had to be shot before this landed.

**The draw lives beside the declaration, which puts one `drawImage` in `src/lib`.** 0279 made where a
look lands and whether it carries a draw one fact, so a look that says `pass` carries its own; the
painter then draws whatever `LOOKS` says a look is and names no effect id. That is worth the tier
line it costs: `src/lib` is otherwise DOM-free, and the lib row in docs/map.md now says so with the
exception named rather than leaving a file header to contradict the table. Nothing here holds state,
allocates a surface or reads a pixel — it is maths and three composites over a context it is handed.

**The field is a hole mask, so a bloom pales the picture rather than brightening it.** More field
alpha is more ink taken out of the screen, so the halo fills the thin places between the rows and
the picture washes out: on the strip a full-wet room moved the mean from 0.411 to 0.292 and the
swing from 0.04 to 0.10 — softer, paler, more structure at block size, and against a dry yard
(0.223) still more picture and not less. That is the bloom this table asked for, and it is why the
row no longer names `source-over`: what the pass composes to is the table's picture, and which two
operations get there is the draw's own business.
