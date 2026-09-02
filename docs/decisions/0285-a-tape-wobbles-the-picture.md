# 0285 — A tape wobbles the picture

- **Date:** 2026-09-02
- **Status:** accepted, standing on [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (a look
  is declared on the entry and the chain draws it) beside
  [0280](0280-a-room-blooms-the-picture.md), [0281](0281-a-crusher-blocks-the-picture.md),
  [0282](0282-a-delay-repeats-the-picture.md) and [0283](0283-a-pop-sharpens-the-picture.md), and
  inside the per-frame line [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md) draws
  — no pixel loop on a frame, no read-back, and no `ctx.filter`

**Tape's look is the wobble, and it is the fifth to take a slot in the chain.** The field cut back
down in bands, each slid sideways by a sine of the machine's own clock, with the medium's own grain
taken out of the ink over it: `LOOKS.wobble` says `at: "pass"` and carries the one draw it is
(src/lib/moireLook.ts), and the tape entry maps its Wow into `wobble` and its Hiss into `grain`. Both
shares are weighed the way the other four are (`weighed`, 0283) under ceilings of their own — a swim
of a sixty-fourth of the width, a grain of half the ink.

**The chain now hands every pass the deck's clock, because this is the first pass that moves.** The
veer arrived the same way for the first pass that displaced the field (0282), and this is that
sentence said of time: the picture has exactly one clock and it is the deck's (0126), so `cutField`
takes `sounding` and hands it down, the four passes before this one take five arguments and ignore
it, and a halted yard hands the same second twice and the swim stands still (0144). A pass that
counted its own frames would be a second clock nothing else agreed to.

**The tint is not a term, because it would be a second road to a dimension the picture already
drives.** The plan's table reads `tone → tint`, and the draw column says what that turns out to mean:
tape's Tone is already the row's own `hue` — where between the cool ink and the hot one the row is
drawn (0141) — through the `driftFrom` this entry has carried since long before there were looks. One
knob read twice is not the objection: pop's Sheen is read into `hue` and into `saturation` at once
(0283), and this entry's own Wow and Hiss are read twice each. The objection is where a tint could
land. It may not recolour the field on a frame (0269), so it would have to reach the screen's ink —
and the ink's hue is claimed off the boldest row (0141), which is the claim this knob already makes.
A second path to one dimension is the thing principle 1 forbids, where a second dimension off one
knob is only a knob doing two jobs. So the wobble declares two terms and the registry's "every term
reached" rule is satisfied by two.

**The grain takes ink out rather than masking it in, and this one is arithmetic rather than a
shot.** The plan's draw was `destination-in`, and with a tile baked once it cannot be: that
composite multiplies the field's alpha by the tile's _and by the share the term rides_, so a grain at
half its range would halve the whole field's coverage — and the field is a hole mask, so a halved
field is a picture gone solid rather than a picture speckled (0281). `destination-out` is the same
tile read from the other side: the field times one minus its own share of the noise, so the specks
are the only thing that moves and the term rides its share the way every other pass's does.

**The tile is baked once for the whole app, and it is the first thing `src/lib` has ever kept.** One
canvas of seeded specks (`mulberry32`, src/lib/random.ts, so the grain is the same grain every run),
five hundred and twelve pixels square, three-pixel specks, half of it left clear — sparse, because a
noise laid over the whole picture is a wash that takes the same ink out everywhere. It is swept
diagonally on the same clock the swim rides, on whole pixels — the chain hands every pass a smoothing
context (0281), and a tile placed on a fraction is filtered against what lies outside its own rect,
which under-grains the column where two of them meet — and drawn a dozen times over a popped-out
picture, which is what makes a noise floor crawl rather than a pattern printed on the picture. Kept
in the file the draw is declared in and not handed down the chain: a seventh argument every pass
carried for one look's sake is the veer's mistake made twice. The tiers table in docs/map.md now says
so.

**It is priced once and it is priced _on_ a frame, which is the honest way to say it.** The
per-pixel loop runs inside the first painting whose grain bites, not through the shop that budgets
one curved-row bake a painting (`curvedTileFor`, src/ui/driftTiles.ts, 0142) — that shop is a `src/ui`
cache keyed by a row, and reaching it from a pass declared in `src/lib` would invert the tiers for a
quarter of a million iterations that happen once in the life of a page. What is taken from it instead
is its refusal rule: an engine that will not hand back the tile's context is remembered, because a
refusal retried is a surface allocated and dropped on every painting for as long as the yard stands.
And the tile's speck and sweep are stated in device pixels where the swim is a share of the width:
grain is a property of the medium and not of how much picture you are looking at, so it stays the
same size on the strip and on the overlay — which is the opposite of the choice the echoes' spacing
made, and deliberate (0282).

**The bands are the lens's own sixty-four, and the wrap is `cutAcross` written a second time.** A
band slid sideways leaves a column behind it, and the copy a width over covers it — which is exactly
what the cut does to the screen (`cutAcross`, src/ui/moireCanvasField.ts). It is written twice on
purpose: that one cuts the screen and this one writes the pass's own surface, the file it lives in is
a tier `src/lib` may not import from, and the file that could hold the pure half of it
(src/lib/moireGeometry.ts) stands fifteen lines under its own soft cap. The guard against drawing a
band twice where it already stands comes with it, though a sine returns no exact nought in a double
and nothing reaches it: what is copied is copied whole. Principle 3 says the second occurrence is not
a finding — and the file this pass is declared in now stands at seven hundred lines against a hard cap
of eight hundred, so the look after next is the one that splits it.

**What the picture says, at the zoomed 1:1 crop of a yard holding tape alone.** Against the same rack
at `BASE`, interleaved: the whole-field alpha reads 0.4236 against 0.3864 — a tenth more ink, which
is the grain — and the edge energy 0.0682 against 0.0567. Driven one term at a time the two moves
read apart: at Wow alone the rows visibly stop lining up band to band and every fringe stays a
fringe, which is a swim and not a smear; at Hiss alone the structure is exactly `BASE`'s with a
speckle over it, which is grain and not noise. Rack order is legible in the same numbers —
`[tape, crush]` came back at 0.6322/0.0838 against `[crush, tape]`'s 0.6241/0.0869, blocks over a
swimming field against a swimming field of blocks — and two tapes read as more of it than one
(0.4715 against 0.4236). On the strip the pass reads 0.422 and 0.424 at swings of 0.041 and 0.042
against `BASE`'s 0.390 and 0.390 at 0.030 and 0.034: more ink and more structure, and no flash.
