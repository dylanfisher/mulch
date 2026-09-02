# 0283 — A pop sharpens the picture

- **Date:** 2026-09-02
- **Status:** accepted, standing on [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (a look
  is declared on the entry and the chain draws it) beside
  [0280](0280-a-room-blooms-the-picture.md), [0281](0281-a-crusher-blocks-the-picture.md) and
  [0282](0282-a-delay-repeats-the-picture.md), and inside the per-frame line
  [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md) draws — no pixel loop, no
  read-back, and no `ctx.filter`

**Pop's look is the sharpen, and it is the fourth to take a slot in the chain.** The field's own
blurred copy taken out of it and the mask that leaves added back: `LOOKS.sharpen` says `at: "pass"`
and carries the one draw it is (src/lib/moireLook.ts), and the pop entry maps its Mix into `amount`.
The blur's working size is one number and not a term (`SHARPEN_SCALE`, a sixth of the field, about
one cell of the lattice the picture is drawn on) — pop declares two terms and neither of them is a
radius, and a mask blurred as wide as a halo stops being a local mean and becomes the bloom under
another name.

**The mask is added and not laid over, and the shot decided it.** The field is a hole mask: a covered
pixel is ink taken out of the screen and a window is ink the screen keeps (0281), so where the
picture is darkest the field is already at nothing and there is no headroom left to sharpen into. All
a mask can do here is push the _light_ side of an edge the rest of the way to nothing. Laid over the
field `source-over` — which is the draw this step was planned as — it adds a share of what is _left_,
which is most of the picture at the middle of the mask and nothing at either end: the zoomed 1:1 crop
came back with its luminance spread down from 19.3 to 17.1 and its edge energy down from 9.3 to 8.9
against the same rack at `BASE`, a picture visibly hazed rather than sharpened. `lighter` adds the
mask itself — nothing where the field is nothing, the whole of it where the field already stands,
clipped at solid where it is over — and the same crop comes back at 20.8 and 10.7. Sharper, and at
the ceiling this landed with (0.35) the whole picture is 4% lighter where at 0.6 it was 7% lighter
for 23% more edge: the question the pass is asked at the crop is whether it is sharper and not
whether it is louder.

**A third clamped share under a ceiling is a helper, not a third copy.** `weighed(presence, share,
ceiling)` is the bloom's amount, the echoes' first rung and this pass's amount, which is principle 3
exactly — the second occurrence was not a finding and the third is. The ceiling stays each look's own
number and is never shared: what a halo may take of the picture is not what a ladder of ghosts may,
nor what a mask may add back.

**The saturation is not drawn by this pass at all.** Pop's Sheen is the one look term that reaches
the screen's ink instead: `looksSaturate` (src/ui/moireLooks.ts) sums the standing sharpens weighted
by how much of each the picture has taken, and that target travels on the ink's own rate and is
rounded onto the ink's own eight stops before it keys a tile (`inkTravelInto`, `stepped`, 0266).
Colour is the tile's and a per-frame recolour is the pass 0269 refused, so the term walks the same
ladder every other colour term walks and a Sheen dragged across its range moves the tile eight times
rather than once a pointer move. `ScreenInk` gains a fourth field for it and `COLOUR_REACH` does not:
those three are dimensions of a _row_, claimed by a value and ridden by a lane (0150), and no row
says anything about this one.

**What it saturates is the channel split, because that is the colour the picture actually has.** The
ink a row is drawn in is the theme's own token and a saturated variant of it would be a colour no
token holds (0141, docs/boundaries.md), so the term moves `CHANNEL_MIX` instead — how far each third
of a cell is pushed onto its own channel (0130) — from its resting 0.16 to 0.32 at the whole of it.
The three thirds still average to the colour that was sent at either end, which is what a subpixel
is; what changes is how purely each third says it. Twice the resting split and not the 0.45 the split
was first written at, because that number is the one this picture already knows reads as candy
stripes: at the zoomed crop the saturation alone lifts the chromatic spread from 29.9 to 33.8 and
leaves the mean where it was.

**And the ink split off the screen, because the fourth term took the file past its cap.** What a
picture's ink _is_ — which row's claim it takes, how saturated the looks ask it to be, where the
travel has got to and the ladder each term is rounded onto — is now src/ui/moireScreenInk.ts, and
what is laid in it stays in src/ui/moireScreen.ts (0045). `TILE_CACHE` is knowingly left at 24: the
fourth ladder walks the same nine stops the other three do, pop's Sheen walks two of them at once
because it is declared into `hue` as well, and the room was never enough to hold a whole travel — so
what a miss costs is the tile built on a later paint, which is the cost 0266 already accepted, and
the number that would replace it belongs to the step that prices a loaded rack.

**On the strip the pass is nearly under its own scale, which is what the plan allows.** A pop yard
alone reads 0.302 and 0.321 against `BASE`'s 0.354 and 0.356, at swings of 0.039 and 0.035 against
0.032 and 0.034 — less ink, because a sharpened field takes more of it out, and no flash. Rack order
is legible in the same numbers: `[crush, pop]` came back at 0.570/0.136 and `[pop, crush]` at
0.537/0.215, because blocks over a sharpened field keep its blown windows and a sharpened field of
blocks bites their edges instead. That is the chain the picture was for.
