# Feature roadmap

Mulch is a local-first browser instrument for turning samples into evolving loop performances.
Audio stays on the device. A performance stays editable, portable, reproducible through commands,
and identical through the live and offline signal paths.

---

## 1. Ordered next work

Finish one step, including its full gate, before starting the next. A step delivers a usable
vertical slice, not infrastructure for a feature nobody has asked for.

An entry says what durable shape it moves before the step is started. That is what makes a step
expensive, so it is the first thing to state. A step is written against §2, §3, and the standing
clauses in [subagent-prompt.md](subagent-prompt.md).

A block that adds N of one thing — a look per effect, a sketch per question, a worklet per entry —
names the file layout before its first step: one file per thing from the first, with its `@role`
line and its map.md row, rather than one file that hits the 800-line cap and pays a split on four
consecutive steps.

### Block: the lattice is played

The picture is a still lattice of the screen's own cells, each cell one of ten marks off a wrapped
ramp, in one ink, with the sound's cut read a cell at a time (0345, 0346). The marks bench at
`#/marks` drew eight ways past that ([0347](decisions/0347-the-marks-bench-is-its-own-route.md)),
and an inventory of what reaches the picture found the rest of the instrument standing outside
it: twenty-one effect parameters reach nothing (`comp.output`, the panner's three stage toggles,
seventeen of the automator's knobs), the `chirp` row dimension is drawn and claimed by nobody,
`MasterPeek.left`/`right`, `DeckPeek.waits`, `player.sparkPositions` and `player.armed` are read by
no moiré file, a step's `repeats`/`burst`/`rest`/`rates`/`ratchet`/`reversed`/`voice` reach no
row, the walk's cast is invisible, and every colour term rests at nought or one — `glyph.flat` at
one, `CHANNEL_MIX` at nought — so a scene's five stops are spent on mark density and never on a
mark. This block lands the bench's eight as the lattice's own moves, then opens the lattice to
every effect, every facet of playback, and colour, one step apiece, with a performance
checkpoint after each group (added 2026-09-10; the budget below). Every step keeps 0129: a
pixel is chosen once per cell in the bake, and a frame pays composites and `drawImage` only.

**Layout, before the first step.** A **cell pass** is the new thing: a function over the cell
grid's marks, run in `build` (src/ui/moireScreenTile.ts) after a cell's mark is chosen and before
its coverage is written. The contract is `src/lib/moireCells.ts` (`CellPass`, `runCellPasses`,
`CELL_TERMS`) with its test beside it, and one file per pass from the first — `moireCellEchoes.ts`,
`moireCellBloom.ts`, `moireCellScatter.ts` — each declared on its look's entry
in src/lib/moireLook.ts as `cells`, read by `rackCells` in a new `src/ui/moireCells.ts` the way
`rackLooks` reads looks (src/ui/moireLooks.ts). The alphabets are `src/lib/moireAlphabets.ts`
(the shipped `MARKS` table moves there from src/lib/moireGlyph.ts, with rings and strokes beside
it, ordered by ink and refused at load otherwise). **Frame-side marks** — anything that changes
a cell after the bake — go through one machine, `stampMarks` in a new `src/ui/moireCanvasMarks.ts`:
the boxed field (`boxField`, src/ui/moireCanvas.ts) read through ten threshold passes, one
pattern fill of one mark per pass, so a frame pays ten draws whatever the cell count. Painter
cases go in `src/ui/moireCanvasMarks.test.ts` (new; moireCanvasFilm.test.ts stands near the cap).
A **Cells** group in src/lib/copyDriftGroups.ts holds every dial this block mints. Decision
numbers from 0369; bench tags from bench-28. The bench's own entries name the file each lands in;
when a step lands, its entry is deleted from `src/ui/sketch/marks/` and the whole directory, the
route, the member, the branch and the menu item go with the last (0247).

**The budget, before the first checkpoint (2026-09-10).** The instrument's own page comes first
and the picture is a guest on it: nothing this block adds may make the page jank, and a popped-out
picture on a large screen was found doing exactly that. So the block carries four **performance
checkpoints** — steps like any other, run in the order they stand, each landing as a decision with
its numbers — and one budget, stated here once. _The setting:_ the picture popped out (0138,
src/ui/popupWindow.ts) into a window of 2560×1440 CSS pixels at two device pixels each, a full
rack (the one scripts/smoke.d/drift.js stands up: eq, panner, sway, two automators, a reverb wet)
on two yards, a walk playing, measured headed on a real GPU over eight seconds — headless
SwiftShader lied about the last jank (0344) and is not evidence here. _The numbers:_ no long task
the picture is the cause of; the frame loop's rAF gap p95 under 20 ms and nothing over 50 ms; a
tile bake under 4 ms mean and 8 ms worst; and on the instrument's page beside the popped picture,
a knob drag on the dev server (0307's proof, 480 moves at 60 a second) drops no frame. _The
method:_ a one-off headed Playwright script in the scratchpad, never committed — the strip's
pop-out button, `context.newCDPSession` with `Profiler.setSamplingInterval(500)`, self time by
`functionName url:line` and inclusive time by file, a `longtask` observer and a rAF-gap histogram
— run in the foreground, base and head interleaved three times each per subagent-prompt.md. _What
a checkpoint may do that a step may not:_ revisit a refusal an earlier step made, on the numbers
(a per-frame `getImageData`, a bake below device resolution, a rebake held back a frame), add or
retarget a scenario under scripts/smoke.d/ so a cost it fixed stays fixed as a boolean, and open a
new block in §1 for work it qualifies and cannot land itself — including a kernel in WASM and the
build step it needs, which the human has authorised in principle on 2026-09-10 where the
measurement qualifies it (0058's bar: instruction throughput over its own memory floor; 0211's:
the picture does not move). _What it may not do:_ hide a cost with a governor and call it fixed. A
picture that paints every other frame under load is a lever, and it may land, but only beside the
numbers that say what still stands over the budget and why. _What holds it in the gate:_ every
checkpoint leaves one stable boolean behind — a recorder count of picture-sized draws a frame
against one declared budget, a bake-count per ink step, a scenario's `fail(` — because a timing is
the profiler's and a count is the gate's (0051). A checkpoint that cannot reach the budget lands
the levers that hold, records what stands over it with its cause, and the next checkpoint owns it.

**The bench's eight (steps 1–8).** Each is the bench's argument landed where its `built` note said,
in the order that builds the machine before what rides it. Steps 1, 2, 3, 4 and 5 landed as 0348,
0349, 0350, 0351 and 0352, checkpoint A after them as 0353, checkpoint A2 after that as 0354, step
6 after that as 0355, step 7 as 0356 and step 8 as 0357, which closed the bench; checkpoint B
landed after it as 0358, steps 9 to 14 as 0359, 0360, 0361, 0362, 0363 and 0364, and checkpoint C
after them as 0365.

**Step 1 — the field is mostly ground (bench-28, 0348).** _Durable shape moved:_ none. The bench's
first entry: a cell's read pushed toward the ends of its ramp before it is cut into marks, one
dial `glyph.push` beside `glyph.phase` in src/lib/moireGlyph.ts, read in `build` where the cell's
mean is cut. Its rest is chosen on the bench and the zoomed drift so most of a bloom is a sparse
mark and a band of it is dense; the bench found one, where the heavy share of a bloom's cells fell
from a half to under a fifth. **Stands on:** `markAt`; entry 01 in src/ui/sketch/marks/.
**Outcome wanted:** a bloom and a meadow that read as the reference's sparse ground with ribbons
through it. **Tests that must fail first:** at the rest, fewer than a third of a bloom tile's
cells are marks heavier than the plus; at nought the tile is the one 0346 shipped. **Refused:**
touching a scene's ground; a second wrap. _Landed_ 2026-09-10 as
[0348](decisions/0348-the-field-is-mostly-ground.md): `GLYPH_PUSH` and `pushRead` in
src/lib/moireGlyph.ts, read in `build` where the cell's mean is cut, resting at one. On a bloom
tile the share of cells heavier than the plus falls from 0.73 to 0.21 — the bench's fixture read
about a half, this one is denser — and the push spends no ink at all: every pixel's three channels
stand the same at nought and at the rest, because a cell's colour is read at its own stand before
the cut. The meadow the outcome also names is not a ground at any setting of the dial, which §4
holds. The bench's entry 01 goes with it, and its `plainMark` now reads the shipped push, so
entries 02–08 argue against what ships.

**Step 2 — a look may act on the cells (bench-29).** _Durable shape moved:_ none. The cell-pass
contract and its runner in src/lib/moireCells.ts, and `cells` on a look's declaration read by
`rackCells`; the tile key carries every standing pass's terms stepped the way look terms already
step, so a knob turned is a rebake and a knob held is not. The first two passes are the bench's:
**the echoes** (src/lib/moireCellEchoes.ts) — a cell's mark repeated along its row `echoCount`
times at `echoCells(spacing)` apart, each copy one mark lighter, the cell written in the heaviest
of what stands on it; and **the bloom** (src/lib/moireCellBloom.ts) — a cell's mark spread into
its neighbours one lighter per cell of distance over `bloomCells(radius)`. The delay's and the
reverb's field passes stay: the cell pass is what the marks show and the field pass is what the
cut shows, and both are one declaration on one entry (boundaries: one declaration per parameter,
here one look with two draws). **Stands on:** `LOOKS` and `rackLooks`; `echoSpacing`,
`echoCount`, `bloomScale`; entries 03 and 04. **Outcome wanted:** a delay standing in a rack is a
ladder of lighter marks behind every dense one, and a reverb is a halo of them, on the zoomed drift
with a click train and one effect. **Tests that must fail first:** a tile baked with an echoes
pass at spacing s has, on every row, no cell lighter than the cell s to its left less one; a bloom
pass at reach r lightens no cell and raises the cells within r of the heaviest; a pass declared by
no standing effect runs nothing and the key is unchanged. **Refused:** a pass that reads the
frame; a pass whose terms are not the look's own. _Landed_ 2026-09-10 as
[0349](decisions/0349-a-look-may-act-on-the-cells.md): `CellPass`, `CELL_TERMS` and
`runCellPasses` in src/lib/moireCells.ts, `cellEchoes` and `cellBloom` in files of their own,
declared as `cells` on the bloom's entry and — through `withCells`, because a look in a file of its
own cannot import its own cell pass back — on the echoes'. `rackCells` and `cellsKey`
(src/ui/moireCells.ts) read the standing looks once a painting and step presence and terms onto the
ink's own ladder, so a rack declaring no pass leaves the key and the tile exactly as they were.
A pass's reach is whole cells — the echoes' read off `echoSpacing` across the grid, the bloom's on a
band of its own — bounded by the row the tile actually is, and presence is in the count of rungs
rather than in an alpha; §4 holds what that cost. The grid the passes run
over is `cellGrid` in a new src/ui/moireScreenCells.ts: src/ui/moireScreenTile.ts stood at the cap,
so the box read and the cut moved with them (0045). The bench's entries 03 and 04 go with it.

**Step 3 — the marks are stamped on a frame (bench-30, 0350).** _Durable shape moved:_ none. The
frame-side machine the next steps ride: `stampMarks` reads the boxed field — one pixel per cell,
the mean the gratings leave (0346) — through ten threshold passes and fills each with one mark's
pattern, so the sound's cut becomes a second lattice of marks in the same alphabet, read without
the wrap so a cell the rows leave quiet writes nothing. This is the bench's **rows** (entry 08),
and it lands beside `boxField` in src/ui/moireCanvas.ts, laid _over_ the tile's own lattice rather
than cut out of it, at a depth `cells.rows` that rests where the zoomed drift keeps the page
between marks. The destination-out cut stays — the picture is still the rows' product (0131) —
and what the stamp adds is the rows _as marks_ where the product is strong. **Stands on:**
`boxField`, `cutGratings`; the pattern cache in src/ui/moireCanvasPattern.ts. **Outcome wanted:**
a row going by on the strip is a run of marks going by, not holes. **Tests that must fail first:**
the recorder counts ten fills a frame whatever the cell count; at depth nought no fill is drawn;
a frame whose boxed field is all nought stamps nothing. **Refused:** a `drawImage` per cell; a
per-frame `getImageData`. _Landed_ 2026-09-10 as
[0350](decisions/0350-the-marks-are-stamped-on-a-frame.md): `readMarks` and `stampMarks` in a new
src/ui/moireCanvasMarks.ts, read beside `boxField` and stamped after `cutField`, at `cells.rows`
resting at a half. Ten passes a frame whatever the cell count — each band the boxed read taken down
to its own floor, amplified sixteen-fold, folded twice into a step and cut out of the bands above
it, blown back up on whole cells and filled through one mark's pattern — so the bands are disjoint
and a cell carries one mark. The read is unwrapped, so the first band's mark is the empty one and a
quiet cell writes nothing. Two calls and not one, because the surfaces a painting mints must be the
same whatever the rack is doing and the patterns must be asked for after the picture's own two; §4
holds what that cost and what the rest was chosen on. The bench's entry 08 goes with it.

**Step 4 — the second lattice is the rack's (bench-31, 0351).** _Durable shape moved:_ none. The
bench's **beat**: a second lattice of marks at a held ratio, unioned into the tile's alpha — and
the ratio is held to whole device pixels, five and seven, because a bit that is a fraction of a
pixel is the smear 0346 took out; the tile grows to the two cells' common multiple. Its presence is
the rack's lattice fold (0278, the reserved `lattice` look): the second lattice appears as the
rack fills and never for one effect. **Stands on:** `cutLattice`, `latticeCut`; `beatPx`,
`sceneCells`; entry 02. **Outcome wanted:** a full rack beats grid against grid where an empty one
is one lattice. **Tests that must fail first:** with nothing standing the tile is one lattice; with
`LATTICE` standing every cell of the seven-pixel lattice is written; the tile width is a whole
number of both cells. **Refused:** a ratio that is a dial; a second alphabet on the second lattice. _Landed_ 2026-09-10 as
[0351](decisions/0351-the-second-lattice-is-the-racks.md): `beatLattice`, `beatInk` and
`beatTilePx` in a new src/ui/moireScreenBeat.ts, read in `build` beside the first lattice's grid
and unioned into the alpha as the solider of the two coverages. The ratio is the two pitches the
picture already stands on — `gridPitchPx` against `rowPitchPx`, five CSS pixels against seven — so
it is whole device pixels on every display and nothing new declares it. The tile's width is
`screenTilePx` (src/ui/moireScreenTile.ts): the gratings' own beat cell where the fold is nought,
which is the tile 0350 shipped, and a whole number of those cells — seven at every whole display
ratio — where the fold stands one. Presence is
`latticeFold` (src/lib/moireLattice.ts) reading `shape.cells` back as a turn, so the second lattice
arrives on the travel the gutter already thickens on and a rack of one entry draws none of it. On
the shipped bake at two device pixels to the CSS one the share of a tile's pixels carrying ink goes
from 0.71 to 0.83 when the rack fills. §4 holds what the wider tile costs. The bench's entry 02
goes with it.

**Step 5 — the flock is a scatter of big marks (bench-32, 0352).** _Durable shape moved:_ none. The
bench's **scatter** as the specks' own layer: a speck is a point smaller than a mark, which 0345
found turns a flock into a blanket or loses it; instead the body's third channel (the specks) is
read per three-by-three cells and written as one big mark without the wrap, over the fine
lattice, in the scene's own ink. The threshold is the scene's `specks` reach, not a new dial.
**Stands on:** `bodyOf` channel 2, `standSpeck`; `SCATTER_SPAN` from entry 07. **Outcome wanted:**
a canopy's flock and a water's glints read as a scatter of big marks over the ground. **Tests that
must fail first:** a tile with specks has big marks where the specks' channel peaks and none
where it is nought; a big mark covers exactly nine cells' worth of coverage. **Refused:** big
marks off the ground channel; a scatter that moves per frame. _Landed_ 2026-09-10 as
[0352](decisions/0352-the-flock-is-a-scatter-of-big-marks.md): `SCATTER_SPAN`, `scatterLattice` and
`scatterInk` in a new src/ui/moireScreenScatter.ts, read in `build` beside the other two lattices
and unioned into the same alpha, and skipped outright where the yard is read for a scene's own
specks. The threshold is the channel's own spread over the tile — between what it means and what it
reaches — and no dial was minted; §4 holds what reading it that way gives up. The bench's entry 07
goes with it.

**Checkpoint A — the frame at a window's size (bench-46, 0353).** _Durable shape moved:_ none. The
first checkpoint, and the one the budget was written for: a picture popped out on a large screen
is slow and the page under it janks. Measure it as the budget says, on the commit that landed
step 5 against the commit that opened the block, and attribute every millisecond over the budget
to a file and a line. The suspects, by what a frame now pays: `stampMarks` (0350) lays three
picture-sized composites a mark and a pattern fill a mark, thirty full-canvas draws a frame at
whatever the window is, where the read it thresholds is one pixel a cell; `boxField` draws the
field down, up and `BOX_HARDENINGS` times over itself at full size; the tile a full rack bakes is
seven of the tiles it was (0351), so an ink step that was under two milliseconds (0344) is a
bake of seven, on the frame, at every step of any travelling term; `readMarks` mints four
surfaces and ten tiles and must mint them once a canvas and never a frame. Land what the numbers
say — a band cut at the cell grid's own size and blown up once a pass, a boxed read kept at cell
size, a bake paced across frames or moved off the thread, a tile cache keyed so a step rebakes
what moved and not the rest — and no more than the numbers say. **Stands on:** the recorder
(src/ui/moireCanvasPainted.ts), `frameCostMs`, `paced` (src/ui/frame.ts), `canvasSurface`;
0344's method. **Outcome wanted:** the popped-out picture at 2560×1440 on a full rack holds the
budget, and the page under it drags a knob without dropping a frame. **Tests that must fail
first:** the recorder counts the picture-sized draws a frame pays and the count is under one
declared budget constant, so a step that adds a full-canvas pass fails here before it fails a
hand; a bake on an ink step touches only the tile the step moved. **Refused:** a fix judged on
headless timings; a governor without its numbers; moving the frame loop into the popped window
(one loop, src/ui/frame.ts). _Landed_ 2026-09-11 as
[0353](decisions/0353-the-stamp-runs-on-the-marks-bit-grid.md): at the budget's own setting the
head of the block did not paint the popped-out window **at all** — the one frame loop stopped on
the frame the window opened and a knob drag landed 0 of 480 moves — where base held 120 frames a
second, a rAF gap p95 of 9.8 ms, no long task and a drag that dropped no frame. The whole of it
was `stampMarks`, and inside it the ten repeating-pattern fills and not the pass count or the
pixel traffic: the passes now run on the marks' own bit grid, a mark is a sheet of its own tile
doubled onto itself rather than a pattern fill, and the ten are laid together and reach the
picture in one draw against a declared `STAMP_PICTURE_DRAWS`. Head paints again at 86–88 frames a
second with every one of the drag's 480 moves landing, the stamp costing 1.2 ms mean a frame.
**It does not reach the budget**, and what stands over it is the tile bake at 36–38 ms mean and
83–98 ms worst against 4 ms and 8 ms — 0351's sevenfold tile with 0349's passes and 0352's
scatter in one pixel loop — which is every long task, the rAF p95 of 25–33 ms and the 63–90 frames
a drag still drops. §4 holds what that is qualified for; checkpoint A2 took it off the frame (0354)
and checkpoint B found it unchanged and still over the budget there (0358), so step 18 owns it now.
The second test the
step named — a bake on an ink step touching only the tile the step moved — went with it, the
numbers having put the bake's own shape past what this checkpoint may land.

**Checkpoint A2 — the bake is off the frame (bench-49, 0354).** _Durable shape moved:_ none. Added
2026-09-11 on checkpoint A's numbers, and run before step 6 because the page comes first: with the
stamp fixed, every tile bake at the budget's setting is a long task — 36–38 ms mean and 83–98 ms
worst against 4 and 8, fourteen to eighteen of them in eight seconds, and they are the whole of
the rAF p95 of 25–33 ms, every gap over 50 ms, and the 63–90 frames a knob drag drops (0353). The
cause is one pixel loop, `build` (src/ui/moireScreenTile.ts), over a tile 0351 made seven of the
cells it was, with 0349's passes and 0352's scatter read inside it, run on the frame at every rung
of any travelling term. The instrument already has the shape for this: the curved rows' tile shop
(src/ui/driftTiles.ts, 0142, 0144) takes at most one bake a painting on the main thread, hands the
bake to src/workers/drift.ts where the browser has one, and a late tile costs the previous tile and
never an empty picture. The screen tile takes the same shape — the body and the ink's terms cross
to the worker as plain data, the bytes come back as an `ImageBitmap` or an `ImageData`, and the
frame draws the last complete tile until the new one lands, so a rung is never a bake on the frame
loop's own task. Where a worker is refused, the fallback is a bake in slices under a per-frame
budget through `paced`, never the whole loop in one task. Measure as the budget says, head against
0353's commit, and read the bake's cost where it now runs as well as the frame's. Then price the
loop itself per 0116 — its time against the memory floor of writing the same bytes — and record
in the decision whether it clears 0058's bar for a kernel; if it does, open the WASM block in §1
that step 18 describes, with the measurement quoted, rather than waiting for step 18. Also measure
the fact 0353 found and could not use: a popped window put fullscreen or moved to a second display
stops the opener's frame loop, so the picture a person pops out to a big screen stops drawing.
Read `document.visibilityState` and the rAF cadence in both documents in that state; if the
opener's loop is what stops, the decision names the fix and it lands in §1 as a step of its own
— a popped document that ticks its own canvas from its own `requestAnimationFrame` while the
opener holds the one set of callbacks (frame.ts's one-loop rule amended for a second document,
not a second loop). **Stands on:** `driftTiles`, `driftOffThread`, `src/workers/drift.ts`;
`paced`; `TILE_CACHE`; 0116's pricing, 0211's byte bar. **Outcome wanted:** at the budget's
setting no bake runs on the frame loop's task, the knob drag on the page drops no frame, and the
picture on a second display draws. **Tests that must fail first:** a painting whose tile is not
yet baked draws the last complete tile and asks the shop once, never `build` on the frame; the
shop hands a bake to the worker port where one is given and to the paced fallback where none is;
a rung of one term rebakes one tile. **Refused:** a governor in place of the shop; a tile that
paints empty while a bake is late (0144); a bake below device resolution; a rest moved.

**It landed as [0354](decisions/0354-the-screen-tile-is-baked-off-the-frame.md)**, and the outcome
is met on the two halves the machine could answer. At the budget's setting the bake now runs in a
worker and the frame draws the last complete tile until the new one lands: interleaved three times
each against 0353's commit, base put **seven long tasks** in every eight-second window, worst 122
to 140 ms, with eight to ten rAF gaps over 20 ms and seven over 50; head put **none at all**, its
worst gap 18 ms, at 124 frames a second against base's 107. The bake is not cheaper where it now
runs — 42 ms mean and 123 ms worst against base's 45 and 134 — it is off the one loop the hand is
on. The knob drag landed all 480 of its moves and dropped no frame in either tree. Two things the
machine could not answer and one it answered against the step: its **audio output device is gone**,
so the deck clock does not advance and the rebakes were driven by walking the rack's own reading
three times a second, the same walk in both trees (the gate's `drive` step is red at base for the
same reason); a **second display** could not be reached from the harness; and a popped window put
**fullscreen goes on drawing** at 120 frames a second with its opener behind it, in both trees, so
0353's finding did not reproduce and no step is opened for it. The loop, priced per 0116, is 118 ms
at p95 against a 4.9 ms floor for writing the same bytes — instruction-bound by twenty-four times,
with real headroom — but **0058's bar is absolute milliseconds on a path someone waits on**, and a
bake in a worker that no gesture awaits is the same ground 0058 rejected the analysis kernels on.
No WASM block is opened; step 18 still owns the question.

**Step 6 — a landing pushes its rows (bench-33, 0355).** _Durable shape moved:_ none. The bench's
**decay**, frame-side through the stamp: a landing (`jolt.at`, src/ui/moireJolt.ts, off
`player.step`) lifts the threshold passes one mark for the cell rows the sounding row's `centre`
stands in, at the landing's level, decaying on the deck clock over `cells.decay` of a loop — so a
row flares when its landing sounds and settles after, and the lattice stands still between.
**Stands on:** `joltWalked`, `meterPulse`; `stampMarks` from step 3 (0350); entry 05. **Outcome
wanted:** on the zoomed drift a walk is rows flaring in turn. **Tests that must fail first:** a
frame at a landing's edge stamps one mark heavier in that row's cells than the frame before; a
quarter of a loop later it stamps lighter than at the edge; no cell outside the row moves.
**Refused:** a rebake per landing; a push that outlives the loop. _Landed_ 2026-09-11 as
[0355](decisions/0355-a-landing-pushes-its-rows.md): `CELL_DECAY`, `cellPushInto` and `pushedRows`
in a new src/ui/moireCellPush.ts, stepped in `refillRows` beside `joltInto` and spent in `readMarks`
(src/ui/moireCanvasMarks.ts) as one `lighter` fill of `bandFloor(1)` — one mark's worth of the ramp
— over the pushed rows of the boxed read, before a band is cut out of it. The level is `joltWalked`
read once and spent twice, so a landing that jumps nowhere pushes nothing; the falling landings ride
on `MoireJolt` itself, four of them, carried by the carry the jolt already had; the band is
`DRIFT_CENTRE_SWING`, the ladder every anchor is quantised onto, so no dial was minted for it. The
read is one pixel a cell, so the frame pays the same ten passes and the same one picture-sized draw
checkpoint A pinned, and nothing is rebaked. §4 holds what the level costs and what the machine
could not show. The bench's entry 05 goes with it.

**Step 7 — the part picks the alphabet (bench-34).** _Durable shape moved:_ none. The bench's
**part**: src/lib/moireAlphabets.ts holds the marks, the rings and the strokes, and the standing
part's character (`standingPart`, src/ui/moireRows.ts, read through src/lib/playerCast.ts — the
first moiré file to read the cast) chooses which the tile is written in: plain and riff in marks,
stutter and scatter in strokes, breathe and slide in rings. The alphabet is a field on the tile
key, so a part change is one rebake. **Stands on:** `MARKS`, `alphabetOf` from the bench;
`standingPart`. **Outcome wanted:** a song's sections read as different pictures without a cell
moving. **Tests that must fail first:** every alphabet is ten marks strictly rising in ink; a
yard with no player writes marks; a stutter part writes strokes and the key differs. **Refused:**
an alphabet per effect; a fourth alphabet without a character that needs it. _Landed_ 2026-09-11 as
[0356](decisions/0356-the-part-picks-the-alphabet.md): `ALPHABETS`, `alphabetOf`, `markCoverage`,
`markWeight`, `CHARACTER_ALPHABET` and `partAlphabet` in a new src/lib/moireAlphabets.ts, the
shipped `MARKS` moved there with the rings and the strokes beside it and refused at load unless
each is ten marks of strictly rising ink; src/lib/moireGlyph.ts keeps the ramp and holds no table.
The alphabet is one of three names on `ScreenBake` and on the key `screenOf` writes, so a section
changing is one rebake, it crosses to the worker as plain data, and every lattice of a tile reads
it — the fine one, the rack's second and the scatter — as does the frame-side stamp, whose mark
tiles are now minted on the alphabet beside the bit and the ink. **The part's character is not the
thing that picks it**, because a part has carried a spec and no character since 0176 and a label
read back off the numbers is refused by 0174: what picks the alphabet is the part's own durable id,
folded onto the same `PLAYER_CHARACTERS` a drawn part takes its name from, read off `step.part` so
no moiré file walks the song for it. §4 holds what that gives up. The bench's entry 06 goes with
it, and with it the last of the eight: `SKETCH_MARKS` now lists nothing and step 8 takes the shell.

**Step 8 — the bench is deleted (bench-35, 0357).** _Durable shape moved:_ none. Entries 01–08 have
landed or been refused in §4 — the last of them with 0356, which left `SKETCH_MARKS` empty and
src/ui/sketch/marks/sketchMarks.ts holding nothing but the plain field the entries were measured
against; `src/ui/sketch/marks/`, `MARKS_ROUTE`, the `"marks"` member, the
App branch and the menu item go, and entries 10 and 11 of the drift bench with them, their
arguments having landed (0339, 0345). **Stands on:** 0247. **Tests that must fail first:**
SketchPage.test's cleared-id list names the bench's entries and MarksPage.test is gone. **Refused:** keeping
a bench beside the thing it argued. _Landed_ 2026-09-11 as
[0357](decisions/0357-a-bench-is-deleted-when-its-arguments-land.md): `src/ui/sketch/marks/`,
`src/ui/sketch/MarksPage.tsx` and its test, `MARKS_ROUTE`, the `"marks"` member of `Route`, the
`App` branch and the View menu's item are gone, and `routeOf` selects four screens again. Entries 10
and 11 of the drift bench went with them for the same reason and not as a tidy-up — the film's share
landed as one dial a hand moves (0339) and the marks' ink as another (0345) — taking
`SketchDriftFilm.tsx`, `SketchDriftGlyph.tsx` and their two fields out of
src/ui/sketch/sketchDrift.ts, which is the six fields its own header says it is again. The bench's
graveyard is one list on the page that still stands: `SketchPage.test.tsx` gains nine of the ten
names, and `bloom` — which the drift bench mounts as its own entry 07 — is held down instead by a
case beside the list that asserts no file and no route survives. §4 holds what that split cost.

**Checkpoint B — the stamp under a landing (bench-47, 0358).** _Durable shape moved:_ none. Steps 6
and 7 put the first per-frame motion on the stamp — a landing lifting a row's threshold passes,
decaying on the deck clock — and the first key field that rebakes on a part change. Measure the
budget's setting again, head against checkpoint A's commit, with the walk landing at its fastest
rate and a song changing parts, and attribute what moved: a lift that re-cut every band when one
row's cells moved, a part change that rebaked a tile a frame was waiting on, an alphabet whose ten
tiles were minted on the frame that first needed them. Land what the numbers say. **Stands on:**
checkpoint A's `STAMP_PICTURE_DRAWS` and its script (0353); `joltWalked`, `standingPart`. **And it
reads what checkpoint A2 did with the bake** (0354) — a tile of the same 42 ms mean, now in a
worker, with the frame drawing the last complete one until it lands — under the landing's own
motion: what it has to say is whether a landing puts the bake back on the frame's own task by
making a rung of it something a frame waits for, and whether a part change's ten fresh keys
outrun the shop's one bake at a time. **Outcome wanted:**
a walk flaring its rows on the popped-out picture costs no more per frame than the still lattice
did at checkpoint A, within the budget. **Tests that must fail first:** a frame at a landing's
edge pays the same number of picture-sized draws as a frame with no landing; a part change
rebakes once. **Refused:** a decay clocked by the frame instead of the deck; a mark tile minted
per frame.

**It landed as [0358](decisions/0358-a-landing-costs-the-stamp-nothing.md)**, and the outcome is
met: a walk flaring its rows on the popped-out picture costs no more per frame than the still
lattice did. At the budget's setting — measured against **checkpoint A2's** commit rather than
checkpoint A's, A2 being the tree that isolates steps 6 to 8 — base and head interleaved with a run
of head at no landing beside each pair, head under a landing every 125 ms paints in **1.53 ms**,
which is base's 1.53 and its own
1.51 with nothing landing — at 120 frames a second with **no long task and no rAF gap over 20 ms**
in either tree, and the lift itself is 0.0004 ms a painting. Neither question the entry asked came
back yes. A landing **does not** put the bake on the frame's own task: the push is spent on the
boxed read after the tile and reaches no field of the key, so the bake count under a landing is
base's exactly. And a part change is **not** ten fresh keys but one a canvas — 78 bakes against 72
for a section changing every two seconds, with the section it left still held, so a song coming back
round pays nothing. What a part change does cost is **0.34 ms a painting** at a section every two
seconds, all of it the alphabet's ten mark tiles minted on the frame that first needs them; no gap
and no long task shows it, so it is recorded in §4 rather than levered — with the rate it would
want levering at. The part change's boolean went into
src/ui/moireScreenAlphabet.test.ts beside 0356's own, which already reads the key `screenOf` writes,
and says the half 0356 did not: the hand it left is still held, so an arrangement walked through
cannot outrun the shop. The tile bake is unchanged and still over the budget — 43 to 46
ms mean against 4 (one head run at 61, its own noise), base and head alike, off the frame since
0354, and step 18 still owns it. The budget's fourth number is **not met in either tree**: the knob
drag beside the popped picture dropped 36 and 38 frames at base against 18 to 26 at head, none over
50 ms, so what this says is that steps 6 to 8 did not make it worse. Three things were driven by
hand because this machine's audio device is gone, and §4 says which and what that leaves
unmeasured.

**Every effect reaches the lattice (steps 9–11).** The registry says an effect declares its whole
reach; today twenty-one parameters declare none. Each step below is one table of claims and one
test that the unreached list is shorter.

**Step 9 — the row dimensions nobody claims (bench-36, 0359).** _Durable shape moved:_ none. `chirp` is
drawn on every row at rest and claimed by no `driftFrom`; `lens` and `octaves` are claimed once.
The panner's three stage toggles reach the stagger look as `count` (band), `spacing` (time) and
`size` (slice); `comp.output` reaches the squash as `lift`; and `chirp` was to be claimed by the walk's
`rates` in step 12, which refused it on the budget and left it unclaimed (0362, §4). `STAGE_UNREACHED` in src/audio/effects/panner.ts empties and the registry's
unreached lists are tested to hold only what a step in this block names. **Stands on:**
`effectReach`, `rackLooks`, `staggerLook`, `squashLook`. **Outcome wanted:** turning any knob on a
panner or a compressor moves the picture. **Tests that must fail first:** every `PARAMS` key of
those two entries is in a `driftFrom` or a `lookFrom`. **Refused:** a claim that duplicates
another param's dimension on the same row.

**It landed as [0359](decisions/0359-a-value-reaches-the-picture-through-a-row-or-a-look.md)**, and
the outcome is met for both entries: every knob on a panner and on a compressor now moves the
picture. What the step actually had to move was 0148's own rule — a row's dimensions are all
quantities, so a knob that is a choice could never reach one and the silence was the only place it
could land. The registry now takes a look's term as an answer: every parameter is drawn — by a row's
dimension, a look's term, or honestly by both — or it is written off, and a value its own look draws
may not also be written off. `STAGE_UNREACHED` is gone and the three toggles are the stagger's `count` (the field
taken in nine bands rather than six), `spacing` (how far down the field a band is read from) and
`size` (how much of the width it is read across); `comp.output` is the squash's `lift`, read as the
gain itself and not as a turn, carrying the floor and the ceiling up together until the ceiling is
back at the field's whole range. **A third entry came with it**: `eq.shape` was in `lookFrom` and
`driftUnreached` both, which the new rule makes a contradiction, so its silence goes and the
registry's written-off list is now exactly the automator's seventeen — which is the list step 10
owes, and the whole of what the new case at the top of the block's inventory now allows. No frame
cost: all three stagger terms are source-rectangle arithmetic inside the two draws a band already
pays, no term reaches a tile key, and the bake count is untouched (0353, 0354). The gate's `drive`
step is red for the machine's missing audio device and nothing else — the ring carries no
`"t":"error"` and a headless `AudioContext` stands at 0.0058 s after 800 ms.

**Step 10 — the automator's knobs reach through its run (bench-37, 0360).** _Durable shape moved:_
none. Seventeen of the automator's knobs reach nothing by name; eleven of them are pool weights
whose whole effect on the sound is which effects grow, and those already reach as grown rows
(`grownInto`). That is declared, not left: `AUTO_UNREACHED` shrinks to the pool weights with a
comment that says the grown rows are their reach, and the six that shape the run reach the
shards look, which today has no terms: `seed` → the fractal's rest (`fractalRest` takes the seed,
so two seeds are two valleys), `least` → `lens`, `odds` → `share`, `wait` → `spacing`, `fade` →
`fade`, `wander` → `wander`. `DeckPeek.waits` — the hourglass — reaches the tear as its phase: a
wait counting down is the tear closing. **Stands on:** `shardsLook`, `fractalSeedInto`,
`looksHeldInto`. **Outcome wanted:** two automators on different seeds tear differently, and a
wait is visible on the strip. **Tests that must fail first:** `AUTO_UNREACHED` holds exactly the
eleven pool weights; `shardsLook.terms` names six; the tear's phase follows a fixture's `waits`.
**Refused:** a row per pool weight; reading the run's future.

**It landed as [0360](decisions/0360-a-run-is-a-tear-and-its-knobs-are-what-the-tear-is-like.md)**,
and the outcome is met: two automators on two seeds read two valleys and tear two planes, and a wait
turns the whole layer half a turn and travels back to where it stood as the hourglass empties.
`AUTO_UNREACHED` is the eleven pool weights, with the grown rows named as their reach; the six that
shape the run are the shards' terms, which is the look's first — `seed` in its own units, because a
seed is a place along the valley and not a turn of a knob, and `least`, `odds`, `wait`, `fade` and
`wander` as turns of their own ranges. One of the step's own words moved on the measurement: Least
reads the tear **deeper** into the plane, and deeper is _larger_ pieces of one place's filigree
rather than finer ones, because the same slices span fewer cycles of the count the further in they
are read — §4 holds what that leaves. `fractalRest` now takes a seed, answering the notch at nought,
so where a run stands along the valley is one arithmetic and not two. The review moved four things: the odds are floored at a
quarter, because the run's floor beats them and a standing, sounding automator that tore nothing
would say no automator was there; the hourglass is read against half a minute rather than the knob's
ten, or the hold somebody actually takes would move the picture a fortieth of a turn; a short run
table throws rather than dropping a tear; and the faded end of the Wild push stops above nothing. No
frame cost: every term is read once a painting inside the throw table the cut already fills, no term
reaches a tile key and the bake count is untouched (0353, 0354). The gate's `drive` step is red for the machine's missing audio
device and nothing else — the ring carries no `"t":"error"` and a headless `AudioContext` stands at
0.0058 s after 800 ms.

**Step 11 — the master's two sides (bench-38, 0361).** _Durable shape moved:_ none. `MasterPeek.left`
and `right` reach no moiré file. They reach the stamp: the threshold passes are lifted on the
picture's left and right halves by each side's level over the mean, so a panner sweeping is the
lattice's weight sweeping with it, and the screen's crawl runs toward the louder side. **Stands
on:** `stampMarks`; `inkThrough`'s crawl (rounded to whole cells, 0346). **Outcome wanted:** a
hard-left pan is a lattice heavy on the left. **Tests that must fail first:** a frame with
`left > right` stamps heavier in the left half's cells than the right's, and the reverse; equal
sides stamp the same. **Refused:** a per-side rebake; a stereo scene.

**It landed as [0361](decisions/0361-the-masters-two-sides-lean-the-lattice.md)**, and the outcome is
met: a hard-left pan is a lattice heavy on the left, and the picture leans that way as the panner
sweeps. The pair is one signed reading — `heardSides` in src/lib/moireSound.ts, the gap between the
two peaks and never a ratio of them — travelled on `MoireShape` beside the lean and the loudness the
same output already gives it, so it reaches the painter through the `shape` the painting is handed
and needs no second carry and no second parameter. It is spent twice: `liftSides` lifts the louder
half of the boxed read by one mark's worth of the ramp, on the same surface and in the same
`lighter` fill a landing's lift uses (0355), and the crawl leans three whole cells of the marks
toward that side. The review moved one thing: the cell the crawl leans by is rounded where the
reading is travelled and not where the crawl spends it, and it is held until the weight has carried
three fifths of a cell past it — the two sides are unsmoothed peaks, and every other term in that
translation is monotone, so a mix sitting near a cell's edge would have hopped the whole lattice a
cell and back between frames. No frame cost either way: the lift is one
fillRect on a surface one pixel a cell, the lean is a term on a transform, and the gate holds both —
a panned frame pays the picture-sized draws of an even one (`STAMP_PICTURE_DRAWS`, 0353, 0358) and
bakes no tile (0129, 0354). Two things the step's own words left open went one way and are in §4: an
odd middle cell column stands on neither side, and no dial was minted for either the lift or the
lean.

**Every facet of playback reaches the lattice (steps 12–14).**

**Step 12 — the step's own knobs (bench-39, 0362).** _Durable shape moved:_ none. A `PlayerStep`
carries repeats, burst, rest, rates, ratchet, reversed and voice, and the picture reads only the
bed and the place. The reference row (what is sounding, 0196) claims them the way an effect claims
its knobs, in a `playerReach` table in src/lib/playerDrift.ts: `repeats` → `octaves`, `rest` →
`depth`, `rates` → `chirp` (the dimension nobody claimed), `ratchet` → `fringe`, `voice` → `hue`
on `PLAYER_TINTS`, and `reversed` reverses the screen's crawl. `burst` already stands as the row's
period. And `playerRowStand` stops being unzoned: a yard with a zone anchors on it. **Stands on:**
`playerRowStand`, `playerSongRowShape`, `heardPitch`. **Outcome wanted:** a ratcheting, reversed
step is visibly not a plain one. **Tests that must fail first:** two steps differing in one of
the six produce different reference rows; a reversed step crawls the other way; a zoned yard's
stand differs from an unzoned one. **Refused:** a row per knob; a claim on any row but the
reference.

**It landed as [0362](decisions/0362-the-step-sounding-claims-the-reference-row.md)**, and the
outcome is met: a ratcheting, reversed step draws a reference row with its channels spread either
side of its spacing, cut shallower by its wait and in the tint of the voice standing — and the
lattice crawling the other way underneath it. **Three of the five named claims landed and two were
refused on the budget**: `rest` → `depth`, `ratchet` → `fringe` and `voice` → `hue` are one table,
`PLAYER_REACH` in src/lib/playerDrift.ts, spent through itself by `playerReachInto` so a claim
declared and never read cannot exist; `repeats` → `octaves` and `rates` → `chirp` each put a
picture-sized cost on the frame, and §4 holds both prices. Every claim's zero is its dimension's own
rest, so a plain landing draws the plain picture — the review caught the ratchet's, which would have
flattened the whole screen for as long as any unratcheted pattern played. The three rest when no step
stands, and that is a write rather than an omission:
left alone the picture would hold the last landing's claim after the walk stopped. `reversed`
reaches no row at all — it is which way the screen's lattice crawls, negated inside the rounding so
the lattice still lands on whole cells (0346) and composing with step 11's lean rather than
replacing it, since the wind is the rack's tail and the sides are the output's channels and neither
is being played backwards. And `playerRowStand` is zoned: the zone rides on the `PlayerStep` beside
the bed it bounds, off the spec and never off the voice, which is one object carrying both halves of
one question rather than a nineteenth parameter threaded down the per-frame read. No frame cost in
what landed: three writes onto a row the walk already visits and one sign on a term of the
transform. **"No term reaching a tile key" was wrong, and checkpoint C corrects it (0365):**
`ratchet` → `fringe` and `voice` → `hue` are two of the four ink terms `screenOf` keys the screen
tile through, so a ratcheting step is one bake per rung of the fringe's ladder and a voice changing
one per rung of the hue's finer one — under the rate a part change already bakes at (0358), which is
why nothing here measured it. Six things went one way and
are in §4: the two refused claims and their prices, how the hue's claim is folded, what the screen's
own test file cost, the fixture the new rest write broke, and the one input at which the reversed
crawl is a cell short of its mirror. The gate's `drive` step was green on this run.

**Step 13 — sparks and the armed part (bench-40, 0363).** _Durable shape moved:_ none.
`player.sparkPositions` reaches only the waveform and `player.armed` only the grid. A spark is a
peak event: it stamps one big mark (step 5's span) at its column for one landing's decay, through
the stamp. The armed part announces itself: the picture's rightmost cell column is written in the
coming part's alphabet from the moment it is armed, so what is next is on the page before the
boundary. **Stands on:** `stampMarks`, `moireAlphabets`, `standingPart`. **Outcome wanted:** on
the zoomed drift a spark is a flash of one big mark, and a queued part is a different edge.
**Tests that must fail first:** a frame with a spark stamps a big mark at its column and the next
loop does not; a yard with an armed part bakes its last column in the armed alphabet. **Refused:**
a spark that rebakes; more than one column for the armed part.

**It landed as [0363](decisions/0363-a-spark-flashes-a-big-mark-and-an-armed-part-writes-one-column.md)**,
and the outcome is met on both halves. A spark lifts a `SPARK_CELLS` square of the boxed read at the
column it reads, by the whole ramp at its own level — `SPARK_CELLS` is step 5's `SCATTER_SPAN` and
not a second choice of it — so the square goes to the heaviest mark outright and walks back down the
ramp as the flash falls over the same share of the loop the landing's own flare falls over. It rides
`MoireJolt.sparks` beside the pushes, carried by the one `carryJolt` and stepped in `refillRows` off
one `falling`, and the lift is `liftSparks` in src/ui/moireCanvasMarks.ts on the same read
`liftPushes` and `liftSides` write: no pass added, nothing picture-sized drawn, no tile keyed by any
of it, and `STAMP_PICTURE_DRAWS` untouched (0353, 0354, 0355, 0361). A spark is an event and its
position is not — `MoireCellSpark.lit` is whether the peek was reading that slot on the frame before,
so a spark whose read walks the file flashes once and falls rather than standing at full for as long
as it sounds. The armed part is `ScreenBake.armed`, an alphabet name or null on the tile's key: the
last cell column is baked in the queued part's hand and every other in the standing one, one compare
a pixel, and the bake is the shop's off the frame. A part queued into the hand already standing
arrives null (`armedAlphabet`, src/ui/moireRows.ts), so a queue that changes no hand changes no key.
The review caught two failures a green gate had crossed. A spark is lit by the landing's own ordinal
and not by a slot going quiet — `PlayerPeek.sparkPositions` is a prefix of whatever landing is
standing and two sparking landings butt up with no empty frame at the rest delay, so a flag alone
dropped every flash after the first and left the fallen one at a column that had stopped sounding.
And the armed hand reaches the fine lattice's own column alone: handed to the rack's second lattice
and the specks' scatter as well, it sliced their marks down the middle — those stand on cells of
their own — and a bake of a rack standing came out bit for bit the tile baked wholly in the queued
hand. Two things went one way and are in §4: the column the armed hand actually writes is the tile's
and so recurs across the picture, and a spark is placed on its landing's own ground rather than
given a row of its own.

**Step 14 — the ground and the crawl are one (bench-41, 0364).** _Durable shape moved:_ none. The walk's
ground moves (`bedGround`, travelled by `easedCentre`) and the screen's crawl (`inkThrough`, off
the wind) are two motions with one name. The crawl takes the ground's travel: when the ground
moves a bed the lattice steps that many whole cells and the wind only leans it. **Stands on:**
`playerGroundSecs`, `groundTravel`, the crawl's cell rounding, and the sign a reversed landing puts
on it (0362), which the ground's step composes with rather than replaces. **Outcome wanted:** a ground move is
the lattice stepping, visibly, once. **Tests that must fail first:** a fixture ground move of one
bed steps the crawl by one cell over `PLAYER_GROUND_TRAVEL` and the wind alone steps nothing.
**Refused:** a third clock.

**It landed as [0364](decisions/0364-the-ground-crawls-the-lattice-and-the-wind-only-leans-it.md)**,
and the outcome is met: a ground move is the lattice stepping, visibly, once. `crawlCells`
(src/ui/moireCrawl.ts) reads the first ground row's _travelled_ centre back into beds through
`playerGroundBeds` (src/lib/playerDrift.ts) and rounds it, so a move of one bed steps the lattice
one whole cell of the marks and a move of four steps four, on the ground's own travel — a rate, the
whole source over `playerGroundSecs`, so a move across the file sweeps the lattice and a bed's move
inside a long file steps it almost at once (0235) — with no third clock and nothing new to carry
across a rebuilt set. The cells reach `inkThrough` beside the sides, taken off
the rounding because they are whole already, and a reversed landing turns them with the rest of the
crawl (0346, 0361, 0362); both are terms on the transform, so a ground walking the file all day
bakes nothing (0129, 0354). The step's other half cost more than it looked: the wind was that same
one-way travel, so "the wind only leans it" meant `MoireWind.drift` had to go. It is
`MoireWind.lean` now — whole cells toward the way the field is blowing, off a direction and a
strength both travelled at the wind's own rate and rounded through `leanCells`, which moved to
src/lib/moireLattice.ts so the sides and the tail lean the one axis through one arithmetic (0361) —
a place and not an integral, so a rack blowing all day leans and never walks. The review caught the
lean written outright off a tail that steps at every rebuild, which hopped the lattice three marks
the moment an effect was added, and a required proof asserted tautologically; both are fixed and
the second is now a painting read twice through a blowing field. Four things went one way and are in
§4: the drift and its dial, the bed measured through the source rather than from the loop's
in-point, the nudge that is under a cell, and the crawl as an absolute place.

**Checkpoint C — every reach, priced (bench-48, 0365).** _Durable shape moved:_ none. Steps 9–14 open
the lattice to every effect and every facet of playback: the stamp is lifted by side (step 11)
and by spark (step 13), the crawl steps whole cells with the ground (step 14), and every knob on a
panner, a compressor and an automator now moves the picture — which is every knob a hand turns
during a drag now stepping a term, and every term stepped a rebake. Measure the budget's setting
with the drag on the popped-out picture's own yard — a panner's pan swept, an automator's wait
counting down, a spark landing — head against checkpoint B's commit, and attribute what moved.
Land what the numbers say, and name in the decision which claims cost a rebake and which a fill,
so the next block's author knows the price of a claim before writing one. **Stands on:**
checkpoint A's budget constant and script; `effectReach`, `rackLooks`, `stepped`. **Outcome
wanted:** turning any knob on the popped-out picture's rack while it plays holds the budget on the
page underneath. **Tests that must fail first:** a knob turned within one rung of `DRIFT_STEPS`
rebakes nothing; a spark stamps through the frame's own passes and adds none. **Refused:** a claim
removed to save a bake — it goes to §4 with its price, and the human decides.

**It landed as [0365](decisions/0365-a-knob-turned-is-a-fill-and-only-the-inks-ladder-is-a-bake.md)**,
and the outcome is met: turning any knob on the popped-out picture's rack while it plays holds the
budget on the page underneath. **The audio device came back**, so unlike every earlier checkpoint in
this block the walk was really playing — the clock ran, the landings landed and the sparks flashed on
the player's own schedule, and nothing was driven by hand. Head against `0fbbbd5` interleaved three
times: **no long task in any run of either tree; rAF p95 9.3–10.3 ms at 120 Hz and 17.5–17.6 at
60 Hz; and zero bakes in every eight-second window and across a 480-move drag on the panner's own
Position, in both trees.** Nothing rebakes at the budget's setting at all, so the bake was timed
separately with one tunable on the stamp's key walked three times a second, two more interleaved
pairs: 72 a window in all four, 75.4/206 ms against 57.9/144.1 and 58.3/146.1 against 67.0/144.4 —
the term 0354 left over the budget, off the frame and untouched by this group, which step 18 still
owns. The drag's own number is where checkpoint B left it: all 480 moves land and no drag bakes, but
gaps over a frame still occur, 36/5/0 at base against 33/11/4 at head, so the budget's fourth number
is not met in either tree and this group did not make it worse; one head drag of the six also carried
a single 58.2 ms gap that nothing reproduced.

The decision's table is the thing the next block's author needs, and it is **not** what the entry
above assumed. There are two keyed tile shops, not one: the screen's own tile and the picture-sized
curved tile a non-linear row is drawn through. **A claim is free to the bake unless it lands on the
ink, the hand the marks are written in, or a curved row's place, period or pitch.** Most of what
steps 9–14 minted is a fill — measured knob by knob, thirty knobs of the panner, the compressor and
the two automators, each drag read against a control window with nothing touched: 43 tiles against
the controls' 66, no knob more than three over its own. **Three of the group's reaches are not**:
0363's armed hand, which 0363 already called a rebake, and the walk's `ratchet` → `fringe` and
`voice` → `hue`, which are fields of the screen tile's key — so step 12's own "no term reaching a
tile key" is corrected by this checkpoint. The bake-side fields are the ink's four terms, the rack's
lattice fold, the standing alphabet and the armed hand, each rounded onto `DRIFT_STEPS` first — the
hue onto `HUE_STEPS`, four times finer — and, on the curved tile, a row's stepped `centre` and the
rings its period and pitch are read into. So `into: "centre"` is free on the panner, which is linear,
and the automator's `auto.stays` and `auto.drift` are on the curved ladder, which its fan geometry
makes them. No lever landed and none was available; five things go to §4.

**Colour returns to the marks (steps 15–17).** 0346 rested `glyph.flat` at one and `CHANNEL_MIX`
at nought because a five-pixel mark cannot show a gradient and a split stroke was a rainbow
grille. Colour comes back where a mark can carry it: one whole ink per mark, one whole cell per
channel, one band per coloured row.

**Step 15 — a mark is one of five inks (bench-42, 0366).** _Durable shape moved:_ none. A cell's read
chooses its stop as well as its mark: the ramp is cut into the scene's five stops and a covered
pixel is exactly one of them, never a mix, so a bloom is red marks and cool marks and never mud.
`glyph.flat` becomes how far the five are pulled toward the middle, resting where the zoomed
drift keeps a scene's ink under its air; the film's share still moves the read and never the
alpha (0340, 0345). **Stands on:** `sceneStops`, `ramp`, `build`. **Outcome wanted:** a canopy is
green marks with a few of its other four; a page whose covered pixels average the scene's stops
and not a mean of them. **Tests that must fail first:** every covered pixel of a tile at flat
nought is one of the five resolved stops; at flat one it is the middle stop. **Refused:** a sixth
stop; a gradient inside a mark.

**It landed as [0366](decisions/0366-a-mark-is-one-of-five-inks.md)**, and the outcome is met: a
page's covered pixels average the scene's stops and not a mean of them. `rampStop`
(src/lib/moireColour.ts) reads a cell's stand to the nearest of the scene's five resolved stops and
never mixes two, called where the mix was — the cell loop of `bands`, src/lib/moireScreenField.ts —
so the stop is chosen where the mark is, one read a cell, with no second pass over the pixels and
nothing added to the bake step 18 owns (0354, 0365). `ramp` keeps its mix for the readers that
draw a gradient at a scale an eye can see. `glyph.flat` is now a pull on five inks rather than on a
gradient and **rests at a half**, read off the zoomed drift a scene at a time: at nought the canopy
and the water are a near-black lattice, because both grounds sit at the foot of their own ramps —
the canopy's covered pixels average 7,36,16 against its middle stop's 46,219,75 — and at a half
every scene's covered pixels average nearer its own middle stop than half its own ramp's span
(canopy 98 of 200, water 102 of 230, bloom 78 of 232, meadow 3 of 189), which is the scene's ink
under its air with all five still five. The review moved the claim where it is true: the cut is the
cell's, and the three channels' own fringe multiplies that ink per pixel afterwards (0130), so a
covered pixel is one of the five outright on a tile the three stand level across and a stop scaled
per channel on a shipping one — the cut's promise everywhere is that no read is a mix of two stops.
It also caught a case whose stated reason had parted from its real one — the beat's fringe stride,
green because the cell ink comes round on the beat cell and not because there is one ink, which is
what its comment says now — a push slider whose wild end had become the end
that removes the colour this step restores, and nine comments still saying the picture rests at one
ink. Four things went one way and are in §4: the shade the film's share spends is now read over a
band of the tile rather than at its one deepest pixel; the rest is a half rather than the nought
that would show the five whole; the bake-order fixture is a third copy; and the hue's ladder is
finer than a cut ramp can show.

**Step 16 — the channels split by whole cells (bench-43, 0367).** _Durable shape moved:_ none.
`CHANNEL_MIX` rests at nought because a third of a five-pixel cell is under two pixels. A pop's
saturation splits a mark into its three channels a whole cell apart instead — red one cell left,
blue one right, green in place — so the lit channel is a mark and not a stroke. `channelMix`
keeps its knob; what it moves is the offset in cells. **Stands on:** `fringeOf`, `channelAt`,
`looksSaturate`. **Outcome wanted:** a pop standing is a lattice with coloured ghosts a cell
either side. **Tests that must fail first:** at saturation nought a tile has one lattice; at
`CHANNEL_MIX_FULL` the red channel's marks stand one cell left of the green's. **Refused:** a
subpixel split; a split without a pop.

**It landed as [0367](decisions/0367-the-channels-split-by-whole-cells.md)**, and the outcome is
met: a pop standing is a lattice with coloured ghosts a cell either side. `channelMix`
(src/lib/moireScreenFilm.ts) keeps its knob and what it moves is an offset in whole cells, nought
at rest and one cell at `CHANNEL_MIX_FULL`; the pixel loop reads the red of a pixel off the mark a
cell to its right and the blue off the mark a cell to its left, each in the ink its own cell was
cut to (0366), so the red lattice stands a cell left of the green's. One alpha carries all three,
so a pixel is covered wherever any of the three marks stands and each channel carries its own share
of that union — where all three stand the ink is the cell's own, and where one does the pixel is a
ghost of that channel. It is two more reads of the coverage a pixel **and only while a pop is
standing**: at rest the branch is the one line it always was, so the bake step 18 owns pays nothing
for this until a saturation asks (0354, 0365), and the saturation is on the tile's key already. The
subpixel split went with it — `channelGain`, `channelAt`, `FLAT_GAIN`, `CHANNEL_TOKENS` and a
bake's `gains` were a term every tile multiplied by one once the knob moved onto the cells — and
0130's fringe survives where it was always visible, on the three channels' own blob lattices. The
review caught three: a pixel the second lattice or the scatter covered where this one did not came
out black under a pop, because the colours were scaled against a union those two were not in, which
is fixed and is now a case of its own on both lattices; the queued hand was read off the pixel and
not off the cell a mark came from, so a split wrote the armed alphabet across three cell columns
where 0363 allows one; and the two arrays of shifted columns were built on every bake including the
rested one the branch never reads. The key carries the split in cells now rather than the
saturation that chose it, so a pop easing in rebakes once and not eight times. Three things went
one way and are in §4: the two subpixel cases the split's removal took with it, the ghost's own
compositing, and the two lattices the split does not reach.

**Step 17 — a coloured row washes where it stands (bench-44, 0368).** _Durable shape moved:_ none. A
hue claim — the tape's tone, the reverb's tone, the shift's detune, the pop's sheen, the voice
from step 12 — reaches the tile today only as the boldest row's hue, one stop of five. The tint
(src/ui/moireTint.ts, frame-side, one band) becomes one band per coloured row at that row's
`centre`, at that row's `pulse`, so a colour stands where its row stands (0229) and two coloured
rows are two bands. **Stands on:** `tintThrough`, `colourReached`, `inkTravelInto`. **Outcome
wanted:** a tape's warmth is a warm band on the strip where the tape's row is. **Tests that must
fail first:** two rows claiming two hues draw two bands at two centres; a row with no claim draws
none; the fill count is the coloured-row count. **Refused:** a hue in the bake key; a band per
uncoloured row.

**It landed as [0368](decisions/0368-a-coloured-row-washes-where-it-stands.md)**, and the outcome is
met: a tape's warmth is a warm band on the strip where the tape's row is. `MoireTint`
(src/ui/moireTint.ts) carries a fixed array of `MoireTintBand` and a count of how many are lit, and
`tintTravelInto` refills it from the rows every frame — a row drawn, wholly arrived and claiming a
hue other than `DRIFT_REST.hue`, taking its `centre`, its `pulse` and its hue, up to `TINT_BANDS`
and allocating nothing (0070). `tintThrough` then lays one fill per lit band, at that row's centre
through `centreAcross` (the same mapping the picture anchors its rows by) and `colour.band` of the
picture wide, at the field's travelled strength brought down by `colour.pulse` where the row is
resting. The hue is spent by translating the pattern so the hue's own place in the ramp lands on
that centre, so no hue reaches the tile's key and the tile is still written once a colour. A picture
no row has claimed a colour in is now washed not at all, which is the old whole-canvas band going,
and 0302's sweep went with it: a phase sliding a row's own claim around the ramp every twelve
seconds says a colour nobody turned a knob for, so `phase`, `colour.sweepSecs` and their case are
gone and `colour.band` and `colour.pulse` are what the step mints. The review caught three: the
sweep above; that the bands compose, so eight laid whole would wash the screen away at a knob
nowhere near its end (each now lays the share that composites back to `colour.wash`, and one band
alone lays it whole); and that a band ignored its row's arrival, so a colour joined six seconds
before the grating it names and vanished a frame after it. Beside them a third reader of the "drawn
and not wholly left" pair made it principle 3's, so `standing` (src/lib/moireArrival.ts) is written
once and `boldestRow` and `drawnGratings` spend it. Three things went one way and are in §4: the
band's hard edge, the whole-picture wash and the sweep the step removed, and the eight bands being
the picture's first eight rather than its boldest.

**Step 18 — the profile, and the block's last checkpoint (bench-45).** _Durable shape moved:_
none. The block's end, in two halves. _The profile:_ `./scripts/profile` on the zoomed drift with a
full rack and a walk, the tile-bake time and the frame's draw count read against the block's first
step, and any rest this block chose on the bench read once more on the strip at its own size
(0342). _The checkpoint:_ the budget's setting measured whole — steps 15–17 put five inks on the
bake and a band per coloured row on the frame — head against checkpoint C's commit and against the
commit that opened the block, every number in the budget read and written into the decision beside
the block's opening numbers, so the block's whole cost is one table. Then the ledger of what the
four checkpoints could not close: for each cost still over the budget, its cause, the lever that
would close it and what that lever needs. If what remains is the bake's own JavaScript — `build`,
`cellGrid`, the cell passes, `beatLattice`, `scatterLattice` — priced per 0116 against its memory
floor, this step opens a new block in §1 for a kernel in WASM: one file per kernel, the byte
bar of 0211 as its first step, the build step named as the durable shape it moves, and the
measurement that qualified it quoted in the block's head. If nothing qualifies, a decision in the
shape of 0058 says so with the numbers, and the block closes. **Stands on:** 0051, 0058, 0116,
0211; checkpoint A's script. **Outcome wanted:** a popped-out picture on a large screen on the
block's last commit holds the budget, and the page under it is the page it was before the block.
**Tests that must fail first:** none; what fails is 0012's line and the budget's booleans.
**Refused:** a rest moved without a shot; a regression recorded and not attributed; a WASM block
opened on a headless number.

---

## 2. Rules for every feature

The invariants in [boundaries.md](boundaries.md) hold for every step. These are the rules about the
shape of a _change_ rather than the shape of the code.

- `src/app` remains the only writer of session state. UI, workers, keyboard, and agent JSONL call
  `send()` with serialisable commands.
- Scheduling stays on `Envelope.at`. Command shapes do not grow independent time fields.
- Raw files, audio nodes, functions, and browser permission objects never enter commands or the
  durable session.
- Durable edits participate in bounded history, persistence, portable archives, and graph restore
  unless a decision proves why they do not.
- Async work carries source or operation identity, so a stale completion cannot overwrite newer
  state.
- Analysis is not a pure function of stored bytes: `decodeAudioData` may resample to the device's
  rate, so onsets differ across machines. Nothing durable may rest on derived analysis.
- A view preference, such as snap, theme, or whether the debug console is open, is not session
  state: no command, nothing durable, no history entry.

## 3. Proof and delivery

`./scripts/check` is the full gate. It may get slower as the instrument gets bigger, but no single
feature may move its mean by more than 250ms without asking the human first
([0012](decisions/0012-no-one-feature-jumps-the-gate.md)). Each feature adds the cheapest proof at
the layer that owns the behavior:

- pure normalization, analysis, and DSP assertions in colocated Vitest tests;
- command, event, history, and failure atomicity through `createInstrument` and its manual clock;
- graph scheduling and sound through the existing live and offline browser run;
- UI focus, pointer, and file handling in the existing preview smoke;
- export parity by comparing every encoded sample with the shared graph buffer.

One fact has one emitter. `probe()` reports durable and session state, the event log reports
discrete behavior, and `peek()` and `peaks()` stay allocation-free continuous and sample-derived
reads. A UI ring drop is loud. A sequence gap in `./scripts/drive` is always a bug.

**0012's line is a rule about browser work.** `./scripts/check` runs its steps concurrently and
`drive` is nearly the whole wall clock, with the second-slowest step finishing seconds early: a
feature may add two seconds of Vitest and cost the gate nothing, while a browser scenario's cost
lands on the mean one for one. Offline `render()` calls are the cheap place to prove sound — they
join underneath the deck fixture's real-time waits and cost close to nothing. New browser work that
cannot be a render picks one of the browser half's three lanes and states what that lane's page must
already hold in its prelude, rather than reading what a neighbouring scenario happened to leave
([0238](decisions/0238-the-browser-smoke-runs-in-lanes.md)). Two traps are measured: a popup whose
entries `./scripts/drive` presses opens instantly, because Playwright waits out enter and exit
animations before it may click, which has cost one scenario up to 1.68s
([0056](decisions/0056-an-effect-carries-its-own-icon.md)); and browser work added _before_ the
chain lane's `page.reload()` — the only reload in the smoke — is kept after it instead, for a
reloaded-audio-clock stall that has not reproduced since `88173b2` and was never explained.

Measure a change by stashing it and comparing means across several runs, **interleaved**. A single
run's spread is wider than most features cost: the same unchanged commit read 414ms apart across two
windows fifteen minutes apart, 1.7 times 0012's own step size. Never quote a mean measured in a
different window from the one it is compared against.

When a feature changes a data boundary, graph lifecycle, or ownership rule, write the decision and a
failing seam-level test before broad UI work. Do not turn the driver into a second application by
teaching it feature semantics.

## 4. Not taken

**A band has an edge, the whole-picture wash is gone, and eight bands are the first eight (0368).**
A row's band is a rect `colour.band` of the picture wide and is not faded out at its two ends: a
feather wants a `CanvasGradient` whose stops are that row's own hue, which is an object built per
band per frame (0070), or a second fill per band — and the fill count is the one thing this step is
bounded by, so the edge stands and it is a step between two stops of the ramp at the wash's alpha
rather than between colour and none. Beside it, the band 0302 laid over the whole canvas is gone
outright: a picture no row has claimed a colour in is not washed, because the tile below is already
in the ink the yard asked for and a wash of the middle of the ramp over it says a colour nobody
turned a knob for — the cost is that a sounding yard with a bare rack now shows the ramp only
through its tile. And the eight bands `TINT_BANDS` allows are the picture's first eight coloured
rows and not its boldest eight: sorting a row list on the frame path is the allocation the read
exists not to make, and a rack past eight coloured rows is past what the strip can tell apart
anyway. With the whole-picture band went its sweep — `colour.sweepSecs` and the phase, gone rather
than left pointing at nothing — and with the sweep went the one motion a picture with no coloured
row had: such a picture is now still in its own ink until an effect claims a hue. And because the
bands compose, each lays only the share that composites back to `colour.wash`, so eight coloured
rows standing apart each wash fainter than one standing alone; bounding the union was worth more
than holding one band's strength constant, because the union is what 0130 is about. Under all three, the split that paid for the two new dials: `src/lib/copyDriftGroups.ts`
crossed the 800-line hard cap on two rows of copy, and the five scenes' groups went to
`src/lib/copyDriftScenes.ts` spliced back in where they stood (0045) — the seam is a list splice and
not an abstraction, which is what a table of copy at the cap gets.

**Checkpoint C could not time a bake at the budget's own setting, because nothing rebakes there
(0365).** With the walk really playing, a full rack on two yards and the picture popped out, the
screen tile is baked during the settle and never again — zero bakes in every eight-second window and
zero across a 480-move drag, in both trees. That is the checkpoint's headline and it is also why its
third budget number is measured under a driver that is not the budget's setting: one tunable on the
stamp's key walked three times a second, cpA2's and cpB's own walk, which puts 72 bakes in a window
on both sides. What that leaves is a bake time measured at a rate no hand produces, which is the
right way round for a budget — the mean and the worst are what a bake costs when one is asked for,
not how often one is asked for — but it cannot say what a bake costs when the queue behind it is a
hand's rather than a metronome's. The alternative was to report no bake number at all.

**Checkpoint C's knob sweep is one entry heavier than the budget's named rack, and its per-claim
resolution is a floor and not a count (0365).** The budget names the rack `scripts/smoke.d/drift.js`
stands up, which holds no compressor; the step's own text names the compressor's knobs, so one was
added to yard A **after** the still window was read and before the 480-move drag. So the first three
budget numbers are at the budget's own rack and **the fourth, the drag, is at the budget's rack plus
a compressor** — the same rack in both trees, so the comparison holds, but not the rack the entry
names. **The sweep with control windows was run on head alone**: it
prices head's own claims and is not a comparison, and the base/head comparison is the six
interleaved budget runs. An earlier pair of sweeps without controls was run on both trees and
agreed, and is not quoted, because a window with no control beside it cannot tell a knob's bake from
the walk's. The sweep's own resolution is limited by what else was moving: a generated source
runs out after four seconds, so the walk was restarted before every pair, and the restart's jump in
the reading pays its own ladder of bakes. That is why each knob window is preceded by a control
window with nothing touched — 3.5 s of standing against about 1 s of dragging and 2.5 s of standing,
which is not the same window and draws about a quarter fewer paintings, an asymmetry that runs
against the conclusion rather than for it. The claim the sweep can make is that a knob is at
or inside its own floor (43 bakes against 66 across the thirty knobs of the panner, the compressor
and the two automators, none of them more than three over its own control), not that a named knob
baked exactly nothing. A cleaner attribution would need a source that loops, which is a fixture this
checkpoint did not mint.

**Checkpoint C's bake counter was the screen shop's alone, and the curved shop went uncounted
(0365).** The per-function accumulators were compiled into `src/ui/moireScreenShop.ts` and not into
`src/ui/driftTiles.ts`, so the second keyed shop — the picture-sized tile a non-linear row is drawn
through, whose key holds a row's stepped `centre` and the rings its period and pitch are read into —
contributed nothing to any count in this checkpoint. It matters for exactly two knobs in the rack
measured: the automator's Stays and Stray, which are `period` and `pitch` on a fan geometry. What
stands for them is the wall clock over their own drag windows, which is clean — no long task, at most
one gap over 20 ms, none over 50, which is what a bake in a worker looks like (0354). A count of them
would want the same accumulator in `driftTiles.ts`, which this checkpoint did not compile.

**Checkpoint C's bake time came from a driver that failed silently on one side first (0365).** The
walk that moves a tunable reaches the registry by importing `src/lib/moireTuning.ts` from the page,
and a tree the dev server has seen edited is served at a timestamped URL — so on head the import
built a second, empty registry and moved nothing, and two interleaved pairs read 72 bakes at base
against 0 at head for no reason in the code at all. The instrumentation was extended, identically in
both trees, to publish the app's own registry on `globalThis`, and only the two pairs taken after
that are quoted. The lesson is the memory note's, one level down: a page whose modules have been
touched does not hand a bare specifier the module the app is running.

**Two head windows went bad and nothing reproduced either (0365).** Of the six interleaved 480-move
drags, one head window carried a single 58.2 ms gap; every base drag carried none, and the head drags
either side of it carried none. And two of the five head _sweep_ runs opened with a still window at
42–45 frames a second, p95 66.6 ms and 28–33 gaps over 50, where all three base sweep runs were at
9.1–9.3 ms p95 with none — but the sweeps were run base-then-head rather than alternated, which is
precisely the shape this block's own clause says measures the machine, and the interleaved budget
runs show head clean in every still window. The machine's display also changed between 120 Hz and
60 Hz across the session, which is why the frame rates come in two families. Both are recorded here
rather than attributed to this group: an unreproduced window taken out of alternation is not a
finding, and pretending it is would have spent the checkpoint chasing the machine.

**The wind's one-way drift is gone, and its dial with it (0364).** The screen's crawl was the
wind's: `MoireWind.drift` integrated the tail into turns of the tile, and the `wind.turns` dial set
how fast. Step 14 gives that travel to the walk's ground, and a second one-way travel on the same
axis with no ground under it is the two-motions-one-name the step exists to end — so the drift is a
bounded lean now and the dial is deleted rather than left pointing at nothing. The price: a yard
whose rack rings behind a stopped walk no longer has a field that slides under it; it has a field
leaning a few marks one way. The wind still turns, still takes `DRIFT_WIND_SECS` to do it, and still
offsets the pass that displaces the field (0267, 0282).

**A bed is measured through the source and a nudge steps nothing (0364).** `playerGroundBeds`
counts from the top of the file and not from the loop's in-point, because a hand dragging the loop
moves the ground and the origin together — measured from the loop, a dragged loop steps the lattice
out and back to nowhere. The cost is that a loop _resized_ is a different bed and so a different
count, which reads as the lattice stepping once; that is the loop this yard reads changing, not the
ground moving inside it. And a quarter-bed nudge is under a whole cell and steps nothing on its own
— four of them are a bed and step one — which is the rounding 0346 asks for and not an oversight.

**The crawl is an absolute place, and unbounded (0364).** It counts beds from the top of the source
rather than from where the ground was, so a long file with a short loop reads in the hundreds and a
reversed landing mirrors that number rather than the distance the ground has walked. Both are
harmless where they land — a translation of a repeating pattern is exact at any whole number of
cells, and what the eye reads is the difference between two frames — and the alternative, a walked
distance, is an accumulator with nothing to anchor it after a rebuild.

**The armed hand writes the _tile's_ last cell column, so it recurs across the picture (0363).**
The step's words are "the picture's rightmost cell column", and the tile is laid as a repeating
pattern: the rightmost column of the picture is that column, and so is every one a tile width to the
left of it. A queued part therefore reads as a rule of other marks recurring across the picture
rather than as one edge at the far side. What the alternative costs is exactly what checkpoint A
refused — a draw the size of the picture for one column of it (`STAMP_PICTURE_DRAWS`, 0353) — or a
second surface and a second pattern on the frame path. Whether the recurrence reads as an
announcement or as noise is a judgement for the first run on a machine with audio; the step's own
test pins the column and not where it lands on the page.

**A spark's big mark stands on its landing's ground and is given no row of its own (0363).** The
step names a column and says nothing about where down the picture the mark goes. It is centred on
the same `groundCentre` the landing's flare is banded around, through the same `centreAcross` map —
so a spark is a bright block inside its own landing's flaring band rather than a mark floating
somewhere else on the page. The alternative reads the spark's own position twice, once across and
once down, which is one number answering two questions.

**The louder half is lifted by the whole gap rather than each half by its own level over the mean
(0361).** The step's words are symmetric — ±(L−R)/2 — and a `lighter` fill cannot subtract, so the
quieter half would need the read to come down, which is a second pass on it. The difference _between_
the two halves is the same either way, which is what the outcome and all three named tests turn on;
what differs is the common mode, so a panned frame is now uniformly denser than a centred one by half
the gap instead of standing at the same mean. Whether that reads as the picture getting louder as it
pans is a judgement for the first run on a machine with audio.

**An odd middle column of cells answers no pan, and no dial was minted for either half of the step
(0361).** The two sides are `floor(wide / 2)` cells each, so a picture with an odd cell count leaves
one column standing on neither side: a column the two halves shared would be lifted whichever way the
output leaned, which is worse than one column that never moves. And neither the lift nor the crawl's
three-cell lean has a knob — the block's **Cells** group gains nothing here — because one reading
spent in two places with a knob on each is two knobs for one fact, and `copyDriftGroups.ts` is inside
thirty lines of its cap either way (0360). A step that wants the pair louder or quieter turns
`cells.rows`, which is what the whole stamp is laid at. The count the halves are cut from is the
boxed one, which is ceiled (`boxCells`), so on a picture whose width is not a whole number of cells
the right half carries the part cell at the far edge and covers marginally less of the picture than
the left — the overhang reads as nothing either way, which is what a part cell is.

**src/ui/moireScreen.test.ts stands at 788 of its 800 lines (0361).** This step put 34 of them there.
The next step that adds a case to the screen's own file should split it first, the way 0360 left the
same note against src/lib/copyDriftGroups.ts.

**Step 12 wrote its screen case into a file of its own rather than splitting the screen's (0362).**
The crawl's reversal is one case and the file above had twelve lines left, so it went to
src/ui/moireScreenCrawl.test.ts through the shared painting harness
(`painterOn`, src/ui/moireCanvasPainted.ts), which is the road 0356's alphabet case already took.
The split that note asks for is still owed, and src/ui/moireCanvas.test.ts stands at 800 of 800
beside it — the next step that adds a line to either pays for it.

**`repeats` → `octaves` was refused: the budget for extra fills is decided once, where the set is
built (0362).** `spreadOctaves` puts a floor under every straight row and `shareOctaves` is the last
word on what the whole set can afford (0230, 0244), both called where the set is built and never per
frame. A per-frame write of `octaves` on the reference row is a second opinion about that row and an
escape from that budget at once: a count at the top of its dial asks for two more picture-sized
fills a frame than the set was allowed, and a count of one erases the floor the run earned. The
count is not unreached — it is half of the landing the module's own row runs on (`landingSecs`). A
later step that wants it drawn as scales should ask for it where the set is built, off the spec's
own dial, so `shareOctaves` still has the last word; the per-landing override a cell or a part makes
would not follow it there, and that is the trade.

**`rates` → `chirp` was refused: a swept reference row is a picture-wide bake on the frame path
(0362).** `chirp > 0` takes a straight row off the shared sixty-four-pixel tile and onto one as wide
as the picture, keyed by the cycles its spacing comes to (`cutStraight`, src/ui/moireCanvas.ts, 0142) — and the reference row's spacing is rewritten every frame off the onsets under a moving
playhead (0196), so the key moves on the frame path and every move is a picture-wide per-pixel loop.
Step 9 reserved `chirp` for this and it is unclaimed again; the measurement was wrong too, which is
how the refusal was found — reading the first rate against the last makes the fullest climb the
module can play (`climbRungs` turns round at the window's edge, 0167) claim exactly nothing. What a
climb is worth to the picture is checkpoint C's to price, with the whole ladder read rather than its
ends.

**At a crawl of exactly half a cell the reversed lattice stands one cell short of its mirror
(0362).** The sign is taken inside the whole-cell rounding so the lattice still lands where 0346
says, and `Math.round` is half-up: 0.5 rounds to 1 and −0.5 rounds to −0. Every other input mirrors
to the digit. Making it exact means either rounding the crawl separately from the wind, which is a
change to how 0267 composes them, or a symmetric round that moves where a negative wind lands — both
outside what this step was asked for, for one input the eye cannot tell from its neighbours.

**The reference row's hue is folded off the standing part's badge and not off the voice itself
(0362).** The step's words claim `voice` for `hue`, and a voice is a set of dial values with no
identity of its own: folded off those numbers the tint would move whenever any dial of the part
moved, which is a colour saying something the four stops were coarsened to avoid (0141). So the
voice is what takes the row off rest and the badge is what tells two of them apart, on the same
`playerTint` the module's own row uses. A part standing therefore tints two rows the same, which is
one fact drawn twice at two spacings; nothing in the picture disagrees, and the alternative was a
second colour ladder.

**A case that claimed a colour on the reference row had to move to another row (0362).** The five
claims rest every frame, so src/ui/moireRowsInk.test.ts's `claiming` helper — which wrote a hue onto
`rows[0]` to give the ink something to travel toward — was writing onto the one row the walk now
answers for. It takes the first row that is not the reference instead. Nothing in production wrote
that row's colour, so the fixture was the whole of the collision.

**A pan is read from the two peaks, so it is the output's weight and not the panner's knob (0361).**
`MasterPeek.left` and `right` are instantaneous peaks measured where the decks land, so what the
picture leans to is what the bus is actually doing — a deck panned hard but silent leans nothing, and
two decks panned apart lean by whatever their sum is. That is the reading the step asked for and it
is not the same as any one `deck.pan`: no row claims the parameter, and a yard whose own panner is
hard over still draws an even picture while it is quiet. The gap is also clamped to a whole one
either way, so a bus running hotter than one on one side reads as a hard pan rather than past it.

**The measurement of both is a count and never a shot (0361).** The machine's audio output device was
gone for most of this step — the `drive` step was red for it, the clock stuck at 0.0058 s with no
`"t":"error"` in the ring, and it came back before the last gate run, which is green whole — but no
browser reading of a sweeping pan was taken either way. What is held instead is what the gate can
hold: the lift's own fill on the boxed read,
the crawl's placement in whole cells, and the picture-sized draw count and the bake count unchanged
under a hard pan. Whether three cells is the right lean to the eye is a judgement the first run on a
machine with audio should make.

**A yard already sounding draws a slightly different picture than it did (0361).** Nothing durable
moved, but a mix that is not perfectly centred now lifts half its marks and leans its lattice, so the
block's own before-and-after shots of a playing yard are not comparable across this step — the same
caveat 0360 left, for the same reason.

**A yard already holding an automator draws a different tear than it did (0360).** The step's
comments are exact that a term _absent_ is the tear 0296 and 0298 shipped, and a real automator
states all six: at the declared rests the Least reads the plane twice as deep and the Fade stands the
throw at about five eighths of its reach, so the picture a saved yard draws today is not the picture
it drew yesterday. Nothing durable moved and no session needs repair (0131), but the block's own
before-and-after shots of a rack holding an automator are not comparable across this step.

**A hold shorter than a passage barely widens a seam (0360).** `auto.wait` reaches `spacing` as a
turn of its own declared range, which runs to ten minutes by 0359's rule, so a thirty-second hold
widens a piece by about a seventh. That is the knob's own range held to rather than a narrowing
chosen here — what makes a hold visible at once is the hourglass, which is a fact about the moment
and is read against its own band. A step wanting the term itself to bite would have to curve the
knob, which is a change to what the knob does and not something a sweep of the picture may decide
(0148's own words about `comp.attack`).

**src/lib/copyDriftGroups.ts stands at 799 lines against the 800-line cap (0360).** Five of this
step's dials landed there and the next tunable minted into any group fails `./scripts/arch`. The
split is a file of tables cut in two and belongs to whoever needs the next row, not to this step —
which is why the hourglass's own band is a plain constant and not a sixth dial.

**Least reads the tear deeper, and deeper is larger pieces and not finer ones (0360).** The step's
own words said a run that is never small would be drawn where the count climbs oftener; the table
says the opposite, and the table was believed. Opening a run's tear further into the plane makes the
same slices span less of it, so the count climbs through fewer cycles across the picture and the
pieces are larger — cut from the filigree of one place rather than from the sweep of the whole. That
leaves the Least and the Wait both widening a piece, which they do through two different numbers —
the Wait widens the piece a count of cycles is cut into and the Least changes how many cycles there
are to cut, so a picture under both is not the picture under either — but nothing in this step makes
a run's floor tear _finely_, and a later step wanting that would have to read the count at a shallower
depth than the picture itself stands at, which is a plane the painter does not roam.

**A weight's reach is the rows it grows, which no test can hold to (0360).** The eleven pool weights
stay in `driftUnreached` with the grown rows named as the reach they already have, and that sentence
is prose: nothing checks that turning a weight down changes which rows appear, because what it
changes is a draw the run makes on its own seed at its own tick, and a test that pinned it would be
pinning `effectGrowth`'s draw and not the picture. The registry still refuses a twelfth silent knob,
which is the half of it a gate can hold.

**A run's terms are what it is set to, so a run wandering does not move its own tear (0360).** The
six terms are read when the look set is built, as every look's terms are, so an automator whose
values are being stirred by its own Wander tears the same picture between rebuilds. Making the tear
follow the run's standing values would be a term read per frame, which is the thing 0204 and 0298
already refused for `held` and answered with a per-frame field instead — and only two facts have
earned one, how much a run holds and how much of its hold is left.

**A panner's three stages show only while its spread is over nothing, and a compressor at one to one
shows none of its Makeup (0359).** Both are the entries' own arithmetic held to rather than a
narrowing chosen here, and both bound the step's stated outcome. The stagger draws the field where
it stands at a spread of nothing — the entry's own rule, because at no spread every stage collapses
onto the position in the sound too (0202, 0323) — so a toggle turned on a panner nobody has spread
moves nothing in the picture, exactly as it moves nothing in the ear. And a compressor at a ratio of
one is at no presence whatever its Makeup says, because a held value is not a presence
(`effectHeard`, 0202): there the sound moves and the picture does not, which is the convention every
look term obeys and not this step's to change. The squash's **ceiling** is bounded the same way and
deliberately — it stops at the field's whole range, past which the lift goes on raising the floor
alone, because a ceiling carried past the field's range is a brightener and not a makeup, which is
0288's own complaint about the floor. **And no browser reading was taken of any of it**: the
machine's audio device is gone, so the picture was proved by the passes' own draws and the registry's
lists rather than by a shot.

**src/lib/copyDriftGroups.ts stands at 769 of its 800 lines, and this step put 18 of them there
(0359).** Three dials minted, three rows owed, and the block has a **Cells** group and step 10's own
dials still to land in the same table. The answer at the cap is a split and not shaved prose, so the
next step that mints a dial should split the table before it adds to it rather than after.

**A part change mints ten mark tiles on the frame that first needs them, and they stay there
(0358).** It is the one cost checkpoint B could attribute to steps 6–8 at all: a section changing
every two seconds — the fastest a section could change — costs the paintings 1.89 ms against 1.53,
and the whole 0.34 ms is in the stamp, where `readMarks` mints the alphabet's ten tiles and the ten
`sheetOf` blits after a mint lay surfaces the engine has not seen. About 25 ms a part change, spread
over the paintings after it and never one task: no long task and no rAF gap over 20 ms shows it at a
canvas of 5120 × 2880. The lever would be a cache of minted tiles keyed on the bit, the ink and the
alphabet and held across canvases — three alphabets and a handful of pictures, so it is small — and
it is not taken, because the budget's own sentence is that a cost is a lever when the numbers say so
and these do not. **The rate it would want levering at is stated rather than assumed away**: the
cost is linear in how often the section changes, and `PLAYER_PART_MIN` is one jump — a part per jump
on a walk landing eight times a second is sixteen times the rate measured here, which is where the
cache earns itself. Nobody has written that song, but the player permits it, drawn or by hand.
Whoever feels a section change on a big picture should look here first.

**Checkpoint B could not reproduce the budget's setting either, and drove three things by hand
(0358).** The same fact 0354 recorded: this machine's audio output device is gone, so no deck
reaches `playing`, the master clock's elapsed is nought and `./scripts/check`'s `drive` step is red
at base. So the **frame loop** was driven by the measurement rather than by a playing yard (270
paintings an eight-second window summed across the canvases the opener draws, the same count on both
sides); the **landing** was fed in where
`joltWalked` is read, every 125 ms at a level cycling a quarter to one with its centre stepping an
eighth of the picture; and the **part change** was the alphabet cycled among its three names every
two seconds — fast for a song but not the fastest the player allows, `PLAYER_PART_MIN` being one
jump — beside the rack's reading walked three times a second through one tunable, which put 72 bakes
in every window on both sides. What that leaves unmeasured is **the fall**: with no clock
nothing decays, so every landing taken up stays up and the ring holds four live pushes for the whole
window. The lift was therefore measured at the most it can cost and not at its average, which is the
right way round for a budget and says nothing about whether a flare reads as a fall — 0355's own
paragraph above already owns that half. And the machine itself drifted six-fold under memory
pressure across the runs; every degraded run was degraded at base too, so the numbers quoted are the
runs where both trees stood at 120 frames a second, and the attribution is read head against head as
well as head against base.

**Checkpoint B's part-change boolean is one assertion added to step 7's case, not a case of its own
(0358).** The first shape of it was a case in `src/ui/moireScreenShop.test.ts` asking for a tile
under one alphabet and then another. The review refuted it: the shop reads `order.key`, `width` and
`height` and never `order.alphabet`, so a part change there is a substring the test itself composes
and the case reaches no branch the shop's own "asks once" and "holds both" cases do not. The fact
the checkpoint wanted is asserted through the key `screenOf` actually writes, in
`src/ui/moireScreenAlphabet.test.ts`, where 0356 already has "bakes once for one hand however often
it is asked, and again for another" — so what landed is the one thing that case did not say, that
the hand it left is still held. What that gives up is a direct assertion about the shop's in-flight
behaviour under a part change specifically; it is the same in-flight behaviour under any key, and
the shop's own two cases hold it.

**The marks bench's graveyard is nine names and a file check, not ten names (0357).** The step asked
that SketchPage.test's cleared-id list name the bench's entries, and one of the eight cannot be
named there: the marks bench's `bloom` is also the drift bench's entry 07, the shipped scene, which
SketchPage mounts and must go on mounting. A list that held `bloom` would fail on the picture it is
meant to protect. The nine that do not collide are on the list under the same two assertions as the
twenty-nine before them; `bloom` is held by a case beside it that asserts the bench's five files are
gone and that `#/marks` resolves to the instrument. What that gives up is the one property the list
has and the file check does not — it catches a re-mount under the old id on a page that still
renders — so a future `bloom` entry re-added to the marks bench's ground would be caught by the
absent files and not by the markup. Nothing was renamed to dodge the collision: the ids were the
bench's own and the bench is gone.

**A part's character does not pick the alphabet, because a part has no character (0356).** Step 7
was written against "the standing part's character", and a part has carried a spec and no character
since 0176: the character a drawn part takes is spent on drawing its voice and is never stored.
Reading one back off the voice is refused outright by 0174 and by `partSignature` — a list of names
has no nearest, so a label derived from the numbers would be an invention — and minting a durable
character field on a part would have moved a durable shape the step said it moved none of. So the
picture folds the part's own durable id onto `PLAYER_CHARACTERS` instead, which is a fact about
_which_ section stands rather than a guess at how it sounds. What that gives up is the thing the
bench drew: the stutter part does not necessarily read as strokes because it stutters — it reads as
strokes because its id folds there. `standingAlphabet` sits beside `standingPart` in
src/ui/moireRows.ts, which is where the step put the read, but it reads the step's own `part` id
rather than the part `standingPart` walks the song for: the fold wants the id and the read has it. Three alphabets over six names means a third of the section
changes leave the hand where it was, and a person cannot predict which hand a section will take
until it plays. The honest fix is a durable character on a part, which is 0176's ground and a
decision of its own; nothing here is in its way.

**The marks bench's shell stands empty until step 8 (0356).** Entry 06 was the last of the eight,
and the block's layout paragraph takes the whole directory, the route, the member, the branch and
the menu item with the last entry. Step 8 is that step and this is not it, so what landed here is
the entry alone: `src/ui/sketch/marks/SketchMarksPart.tsx` and `sketchMarksAlphabet.ts` are gone,
`SKETCH_MARKS` is empty, and `sketchMarks.ts` holds nothing but the plain field the eight were
measured against. One assertion moved with it — MarksPage's nav case asserted the bench listed at
least one entry and now asserts it lists exactly what `SKETCH_MARKS` holds, which is nothing —
because a page with no entries has no nav links, not because the claim was inconvenient. The claim
it was there for, that no link the page mints leaves `#/marks`, still stands.

**src/ui/moireScreen.test.ts was split rather than shaved (0356).** It stood at exactly the
800-line cap, and the alphabet the painter now takes is one more argument in its recorder. Its own
header waives the split on the grounds that every case stands on one screen, and arch does not
honour that waiver. The three cases that paint nothing at all — the ink the four gratings and the
band keep, the band rolling on the picture's own motion, and the lattice coming round at the tile's
edge — moved whole to a new src/ui/moireScreenTerms.test.ts, which is a subject and not a slice:
they read `moireScreenFilm`'s arithmetic and never the painter. Nothing was trimmed and no
assertion changed.

**A landing that jumps nowhere flares nothing, and the flare itself was never seen (0355).** The
level a landing pushes at is `joltWalked`, the distance the walk jumped as a share of the furthest
it could — so a pattern that repeats its slot, or creeps one along it, lifts nothing or almost
nothing, and a walk that never moves draws the still lattice. That is the jolt's own judgement about
a landing taken at its word (0271) rather than a second reading of the same event, and the
alternative would have been a level of its own with nothing to read it off: a step carries no level
and the meters are the instance's, not the landing's. So `meterPulse`, which the step names beside
`joltWalked`, is where the push is read from and not what it is read off, and entry 05's own integer
a row off the meters became one band a landing off the walk: a meter says how hard an instance is
working and not that anything landed. What it gives up is a flare on the pattern that stays put,
which the eye might well want. **And the outcome the step names — on the zoomed
drift a walk is rows flaring in turn — was not seen.** The machine's audio output device is gone
(0354's own paragraph above): the deck clock stops at 0.0058 s, `drive` is red at base, and with no
clock there is no walk, no landing and no fall. What stands instead is the gate's own arithmetic —
the lift is one mark of the ramp in exactly the rows `pushedRows` names and in no others, and it
falls to nothing over `cells.decay` of the loop — which says the push is wired and timed, not that
the picture reads as rows flaring in turn. The hand that next opens the zoomed drift on a machine
with audio should watch a walk and say whether four falling landings is the right number and half a
loop the right fall. One thing to watch for when they do: the flare stands at the ground the landing
put the rows **on**, and the rows themselves ease onto it over `groundTravel` — so the flare is
brightest for half a landing's period before the rows arrive under it. That is the jump being a
distance the picture shows (0224) and not a slip, and the alternative — the flare at where the rows
still are — would light the landing that has just stopped sounding; but whether the eye reads the
lead as a row flaring or as a flare beside a row is a thing only the zoomed drift can say.

**Checkpoint A2's setting was short of the budget's in one term, and answered two of its questions
with "the machine cannot say" (0354).** The budget's setting wants a walk playing. The machine this
was run on has **no audio output device** — Chromium reports it lost, the deck clock stops at
0.0058 s, and `./scripts/check`'s own `drive` step is red at base for exactly that reason — so no
travelling term rebakes anything of its own. The rebakes were driven instead by walking the rack's
reading three times a second from the page, the same walk in both trees, which put twenty-one bakes
in every eight-second window on both sides: the bake load is the budget's, the thing turning the
knob is not. For the same reason the knob drag was taken after that walk rather than under it, so
what it says is that a drag beside a popped picture drops no frame and not that it drops none while
a tile is baking. A **second display** could not be reached from the harness at all, so 0353's
"a popped picture on the second screen stops drawing" stands unanswered; **fullscreen** could be
reached, and did not reproduce it — the popped window went on drawing at 120 frames a second with
its opener behind it, in both trees — so no step was opened for a fix to a thing that did not
happen here. Whoever meets it on a real second display should reopen it with that screen's numbers.

**The bake is off the frame and is not one millisecond cheaper (0354).** 42 ms mean and 123 ms
worst, against base's 45 and 134. A rung of a travelling term therefore shows up to about an eighth
of a second late on a picture that size, and the frame draws the tile before it meanwhile, which is
0144's contract taken at its word at a scale 0144 never saw. Priced per 0116 the loop is
instruction-bound by twenty-four times over the floor of writing its own bytes, so the headroom is
real — and 0058's bar is absolute milliseconds on a path someone waits on, which a worker bake no
gesture awaits does not clear. No WASM block was opened on it; step 18 still owns the question, and
a landing that makes a rung something a frame _does_ wait for would change the answer, which is why
checkpoint B's entry asked that. **It asked and the answer is no** (0358): the push is spent on the
boxed read after the tile and reaches no field of the key, so a landing rebakes nothing, and a part
change rebakes one tile a canvas off the frame like any other rung. The bake is where 0354 left it
— 43 to 46 ms mean, identical at base — and step 18 still owns it.

**Where there is no worker, a slice is one band a frame and the bands are not all the same size
(0354).** The fallback bands the body, the cell grid of both lattices, the scatter's block read and
the pixel loop — the four width × height passes — and runs the rack's cell passes, the scatter's
cut and the fringe cell whole, because each of those is a pass over a grid of cells rather than of
pixels and none of them was near the budget. A slice is bounded twice: by four milliseconds of wall
clock, and by one slice a frame, because `paced` is due the instant a slice that spent its whole
budget ends and without the second bound the loop would be whole again under a budget that only
looked spent. This path is not what any Chromium runs, so it is proved by its own case and not by
the measurement.

**The pixel loop moved to `src/lib`, and two of its test files did not (0354).** A worker may import
`lib` and nothing above it (docs/map.md), so `moireScreenCells`, `moireScreenBeat`,
`moireScreenScatter` and the whole of `src/ui/scene/` moved there with the loop, and what stayed in
`src/ui/moireScreenTile.ts` is the half that needs a document. `moireScreenBeat.test.ts` and
`moireScreenScatter.test.ts` stayed in `src/ui` because they paint through the painter's own
recorder, which is `src/ui`: the tier rule binds a test like any other file, and a test of a lib
module that drives the whole painter is a ui test whatever it is named after. The same move took
`hold` out of `src/ui/driftTiles.ts` into `src/lib/hold.ts` — three caches on both sides of the seam
now share it — and `MoireCells` lost its `pass` field, because a function is the one thing a
`postMessage` cannot carry: a standing pass crosses as its look's name and is resolved where the
bake is put together, which is also the only place that could read the registry without closing an
import cycle through `moireLook`. `src/ui/moireScreen.ts` carries a file-level
`import/max-dependencies` waiver with its reason, the seam being two modules where it was one. Three
smaller things went with the review: `cellGrid` had no caller left once both lattices read in bands
and was deleted rather than kept for its own tests; the worker handle a host builds became one
statement (`src/app/workerPort.ts`) at its third site, which is where principle 3 says to take it;
and the painter's own harness re-exports the shop's two test doors, so a painter case reaches the
shop through the harness its painting comes from rather than naming a second module for it.

**Checkpoint A could not use the profiler the budget names, and could not reach the budget
(0353).** The method says CDP `Profiler` self time by function and inclusive time by file. At the
budget's own setting it cannot be run: with the 5120 × 2684 picture up, `Profiler.start` wedges the
renderer and neither it nor `Profiler.stop` returns inside four minutes, headed or not, with a light
rack or a full one — while an ordinary `evaluate` against the same page comes back in milliseconds.
So the attribution is per-function accumulators compiled into both trees identically and taken out
before the gate, beside the `longtask` observer and the rAF-gap histogram the budget also names, and
the levers were isolated by switching one thing at a time in the source and re-measuring
(`cells.rows` at nought; the pattern fill swapped for a flat colour; one pass instead of ten). Two
further things the setting cost: a popped window put **fullscreen, or on the second display**, stops
the opener's frame loop outright in Chromium, so both windows were kept on the one screen with the
picture over the page — synthetic input reaches the knob underneath either way; and the window's own
chrome leaves the canvas 2684 device pixels deep rather than 2880. What still stands over the budget
is the tile bake, 36–38 ms mean against 4 ms: it is one JS loop over the tile's pixels (`build`,
src/ui/moireScreenTile.ts) and 0351 made that tile seven of the cells it was, so the loop is not
slow per pixel — there are seven times as many, with 0349's cell passes and 0352's scatter read over
all of them. That is the shape the budget qualifies for a kernel off the main thread, and checkpoint
B is where it is measured against 0058's bar; this checkpoint did not open a block for it, having
only one instrument's word for where the time goes.

**The scatter is read against the tile it is on, so a flock's own picture depends on where the tile
comes round (0352).** The threshold is the specks channel's own mean and own most over the one tile,
which is what lets the layer stand without a dial — but it is a reading of that tile and not of the
field: the same flock baked at another width has another mean and another most, so which blocks
carry a big mark can move when the tile grows for the second lattice (0351). A fixed threshold on
the ramp draws nothing at all, because nine cells full of specks stand a hundredth of the way up it,
and a threshold that was a dial is the one the marks bench spent twice over — once on keeping the
scatter sparse and once on keeping it from being seen. A flock spread evenly over a tile has no most
to stand against and draws no scatter at all, which is the same reading and is meant: a scatter is
where a flock is thicker than the flock. And **"nine cells' worth" is nine where the span divides
the tile's cell count and the snapped block's own square where it does not**: a tile is a pitch plus
one cells across, so a 1x display's six cells are two blocks of three exactly and a 2x display's
eleven are four blocks of two and three quarters. The alternative — growing the tile to a multiple
of three cells as 0351 grew it to the coarse cell — is the 7x bake below paid a second time, for a
layer only a flock or a kept thing draws.

**The wider tile is paid at every step of the fold, and it is seven times and not seven fifths
(0351).** The second lattice's cell has to come round at the tile's edge, so the tile grows to the
common multiple of the coarse cell and the gratings' own beat cell — and because that beat cell is
the pitch times the pitch plus one, the growth is a whole seven at every whole display ratio,
eleven at three halves, and one at four, where the coarse cell already divides the beat. With the
width goes the scene body, the cell grid and the pixel loop, plus one more box read of that body
for the coarse cells; a grown body and a grown tile each want a cache entry beside the ungrown one.
The width does not move with the fold, but the key does, so a rack filling over `SHAPE_SECS`
rebakes at the grown size once per step of the fold's ladder rather than once. It is bake-side and
never on a frame (0129), and a picture with an empty rack pays none of it. The narrower
alternatives were both refused by the step: a ratio rounded to whatever divides the beat cell is a
ratio the step forbids being a dial, and a cell snapped by `sceneRepeat` is the fraction-of-a-pixel
smear 0346 took out.

**A full rack's ground is not the empty rack's ground with a lattice over it (0351).** The tile's
width is what the scenes snap their own periods and noise cells to, so growing it re-seeds a
meadow's noise and shifts a bloom's and a water's repeats. The picture at a fold of nought is
exactly the one 0350 shipped; the picture at a full fold is a second lattice over a ground of the
same texture and not the same field. Nothing reads the two against each other, and the alternative
— a body baked at one width and sampled into another — is a second declaration of where a tile
comes round.

**The crawl now sweeps the whole tile, so it is seven times faster on a full rack (0351).** A
translation of exactly one tile is the identity for a repeating pattern and a translation of
anything else is not, so the crawl and the wind on its axis have to sweep the tile's own period
(`screenTilePx`, src/ui/moireScreen.ts) — which is what they always did, the period simply being
`beatPx` until this step. Left on the beat cell they snapped the picture back a seventh of a tile
once a cycle. What that costs is the crawl's rate: the same turn now carries the screen seven times
as far while the second lattice stands. The rate was never declared as a speed, only as "a cell a
turn", so nothing else had to move.

**The beat is not a cell pass, and there is no `moireCellBeat.ts` (0351).** The block's layout
paragraph named one. A cell pass runs over one grid at one cell size and carries a look's own terms;
the beat is a second grid at another cell size whose presence is the rack's lattice fold and no
look's, so it has neither the shape nor the declaration a pass has. It lands as the tile's own
second reading instead, in src/ui/moireScreenBeat.ts.

**The bloom's reach in cells is a second number about one knob (0349).** The step stood both
passes on the looks' own bands. The echoes do: `echoCells` reads `echoSpacing` across the grid's
`cols`, so the Time knob moves the ladder in the cut and the ladder in the marks by one
declaration. The bloom does not: `bloomScale` is the working size the blur is _drawn_ at, and
reading it as a reach in cells needs the cell's own size in device pixels, which a cell pass is not
given — a halo that changed with the display is what 0346 took out of this picture. So
`BLOOM_CELLS` states the reach beside the pass, and turning a reverb's Decay moves the halo and the
blur on two numbers that can drift apart. The day a cell pass is handed the cell's pixel size, or
the bloom's band is restated as a reach rather than a scale, the halo should be read off the one
declaration.

**The band a mark was stamped in is not read back off the painting (0350).** The step's third case
— a frame whose boxed field is all nought stamps nothing — is proved in two halves: the bands are
the unwrapped ramp `markAt` cuts, so a quiet cell falls in the first, and the painting mints that
first band's mark as a tile that inks no bit at all. What is not asserted is the wiring between
them: that pass _m_ fills through mark _m_'s pattern and not its neighbour's. The recorder files a
fill as its composite and its alpha and never as what it was made through, and teaching it that
pushes src/ui/moireCanvasPainted.ts past its 400-line soft cap — the same split the two paragraphs
below already leave to a step of its own. The wiring is one loop index today, and the case that
would catch a transposition arrives with that split.

**The rest of `cells.rows` was chosen on arithmetic, not on the zoomed drift (0350).** The step
says the depth rests where the zoomed drift keeps the page between marks. It rests at a half, and
the half is argued rather than seen: a cell carries at most one mark, a mark inks about a third of
its square, and a half of that is under a sixth of the picture's ink added over a lattice whose own
ground is sparse — with every quiet cell, which is most of a resting field, writing nothing at all.
What the gate saw is the smoke's own zoomed drift still drawing a picture of a hundred-odd shades
with the stamp in it, which says the page did not close; it does not say a half is the best half.
The hand that next opens the zoomed drift on a busy rack should move the dial and write down what
it sees.

**The stamp asks for its patterns after the picture's own, and is two calls for it (0350).** A
painting now asks the engine for ten more patterns than it used to, and the recorder that stands in
for the engine hands back a fixed number. Asked for first, a stamp would starve the rows' grating or
the screen — a degraded engine would lose the picture to keep the marks. The band the tint washes
over the picture is asked for after the stamp and can still be starved by it, which is why the
tint's own case now paints on a budget of three plus a mark.
So `readMarks` mints the surfaces beside `boxField` and `stampMarks` asks for the patterns after
the cut — after the grating's and the screen's, though still before the band's, which it must be,
the stamp being laid under that band — which is also what keeps every painting minting the same surfaces in the same order for
the chain's cases to find. The cost is a two-call machine where the plan named one, and a stamp
that mints its surfaces on a frame it then declines to draw.

**The `look()` test factory is a fourth copy (0349, 0350).** `{ key, look, presence, at, terms, held }`
now stands in four test files — moireCanvasField, moireCanvasChain, moireCanvasMarks and the new
moireCells — where principle 3 says the third folds. Its one home is
src/ui/moireCanvasPainted.ts, which holds the painter's other test-only helpers and which stands
three lines under the 400-line soft cap: moving it there prints a new lint warning, which is the
same reason 0348's §4 left the tile reader in three copies. Step 3 wrote the rest of
src/ui/moireCanvasMarks.test.ts and did not do the factoring: it is a split of the recorder every
painter case in the repo is written against, which is a step of its own and not a drive-by of one
whose own text says nothing about it. The copies stand at four, and the split is still what unlocks
them.

**A standing cell pass multiplies the tile cache's keys (0349).** Presence and three terms step
onto `DRIFT_STEPS` stops apiece, so a delay arriving walks eight keys and a Time sweep walks eight
more per stop, against a `TILE_CACHE` of 48 that evicts by insertion and not by use. The cap's own
note already says it was never enough to hold a whole travel; this adds a dimension to the same
key. Left as it is, because what a miss costs is one bake on a later paint and raising the cap is a
number nobody has measured — the measurement, and the LRU the note describes, are their own step.

**The ladder's whole-row property is proved on the grid, not on the baked tile (0349).** The step
asked that a tile baked with an echoes pass at spacing s have, on every row, no cell lighter than
the cell s to its left less one. That holds of the ladder the pass writes and of any row whose
ladder runs out inside the reach, but not of every baked row: the rungs are capped at `ECHO_CAP`,
so a mark of nine three rungs behind a cell of nought leaves that cell lighter than the capped
ladder above it. What is asserted instead is the pass's own claim, exactly — in
src/lib/moireCells.test.ts on a grid where the ladder completes, and in
src/ui/moireCanvasMarks.test.ts on the painter's own tile, where every cell of a delayed picture
stands at or above the plain picture's and none of its ink moves. Lifting the cap so the claim
holds everywhere would be a ladder of nine rungs a cell, which is a different picture.

**The zoomed drift was not shot for this step (0349).** The outcome wanted names a ladder and a
halo read off the zoomed drift with a click train and one effect. The gate's drift smoke already
stands a full-wet reverb in a real rack and reads the strip's picture through it, and the tile
cases read the marks themselves cell by cell, so what is unproved is only how the two read to the
eye at 1:1. Step 3 puts marks on the frame through the same picture and is where a shot pays for
itself.

**The push at nought is proved as an identity, not as a byte comparison (0348).** The step asked
that at nought the tile be the one 0346 shipped, and there is no pre-0348 tile to compare bytes
with. What stands instead is the only place the dial reaches the picture: `pushRead(value, 0)` is
`value` for every read on the ramp — asserted exactly, which is why the push is written
`value + (value - 0.5) * push` rather than as a gain on a read centred first, the second form
moving a value by a float's width at a push of nought — and the marks chosen through it are the
marks chosen without it. Beside it, a tile case reads the push at both ends of the dial and holds
every pixel's ink equal, which is the step's own refusal (touching a scene's ground) read off the
painter.

**The meadow is not made a ground by the push (0348).** The step's outcome wanted a bloom and a
meadow reading as the reference's sparse ground with ribbons. The bloom does: the share of its
cells heavier than the plus falls from 0.73 to 0.21 at the rest. The meadow does not, at any
setting: every cell of its tile is heavier than the plus at nought, 0.84 of them at the rest and
0.50 at the top of the dial — its read clusters at the ramp's own middle, and the middle is the one
read a push about that middle cannot move. Refused here rather than answered, because the two
answers available are the ones the step refuses: moving the scene's own ground, or a second wrap.
What the meadow wants is its own ramp, or a phase that puts its cluster on the sparse marks, and
that is a step and not a hunch. The case in src/ui/moireCanvasMarks.test.ts asserts the shortfall,
so the step that ends it fails there first.

**The painter tests' tile reader is a third copy (0348).** `ROWS`, `tileOf` and `paintingOf` now
stand character-identical in src/ui/moireCanvasFilm.test.ts, src/ui/moireCanvasScene.test.ts and the
new src/ui/moireCanvasMarks.test.ts, which is the third occurrence principle 3 names. The one home
for them is src/ui/moireCanvasPainted.ts, which already exports the painter's other test-only
helpers and which stands three lines under its 400-line soft cap: moving fourteen lines into it
prints a new lint warning, which a step owns. Left as three copies here; step 3 wrote the rest of
src/ui/moireCanvasMarks.test.ts and left them, for the reason the `look()` factory's own paragraph
gives — the split is the step, and it is not this one.

**The film's shade is read over a band of the tile, and the flatness rests at a half (0366).** Cutting
the ramp to the scene's five stops makes the read a staircase, so the film's share — which still
moves the read and never the alpha (0340) — now moves a pixel down that ramp in whole stops, and two
shares can land one pixel on the same stop and paint it the same colour. The case that read the
shade at the tile's single deepest pixel therefore reads it over the tenth the four terms cross
deepest under instead (src/ui/moireCanvasFilm.test.ts), which is the band the same case already used
for its share-of-the-read half; the assertion is the same one, over pixels rather than over a pixel.
Dithering the stop boundary would have kept the per-pixel reading and is refused by the step, which
says a covered pixel is exactly one of the five. And the flatness rests at a half rather than at the
nought that would show the five whole: at nought the canopy and the water read as a near-black
lattice, because both grounds sit at the foot of their own ramps, and a scene whose name is its
colour showing neither is worse than a scene showing its five pulled halfway in. The dial reaches
nought for anyone who wants them whole.

**The bake order is a third hand-built fixture, and the hue's ladder is finer than the cut (0366).**
`src/lib/moireScreenField.test.ts` builds a `ScreenBake` by hand with the same five stops and the
same pitches that `orderAt` in src/ui/moireScreenShop.test.ts and `orderIn` in
src/lib/moireAlphabets.test.ts already build — the third occurrence principle 3 names, and the same
shape as the painter tests' tile reader in 0348's own paragraph. One `screenOrder(overrides)` is the
fix; its home cannot be src/ui/moireCanvasPainted.ts, because a src/lib test importing src/ui is
what the tiers forbid, so it wants a file and a `@role` of its own, which is a step and not this
one. And `HUE_STEPS` is thirty-two because the hue was read along a gradient where eight steps
across four spans was a visible jump; a cut ramp does not move a cell's ink until its stand crosses
a stop boundary, so the fine ladder now buys a rebake rather than a colour. It is one of the bake
key's own fields (0365) and re-reading it is step 18's, not this step's.

**Two subpixel cases went with the split, and a ghost is composited over the page (0367).** The
knob moving onto whole cells left the subpixel split with nothing to push it, so `channelGain`,
`channelAt`, `FLAT_GAIN` and a bake's `gains` went, and the two cases that read that split went
with them: "lights three channels across a cell, each over the row's own ink" and "saturates the ink
a standing look asks for, without moving what the cell averages to" (src/ui/moireScreen.test.ts).
One case stands where they did, reading the same painted tile for the pixels that carry one channel
and not another — none at rest and some under a pop — so the seam through the painter is still read;
what is gone is the claim that a cell averages back to the row's colour, which is 0130's claim about
a subpixel and not about a mark. Beside it, a pixel carries one alpha, so a ghost is written by
scaling each channel against the union of the three marks: the background shows through a ghost
pixel less in the two blank channels than a per-channel alpha would leave it, which is a dimmed page
with one channel of ink on it. Three alphas would want three passes and three canvases, which is the
bake step 18 owns and then some.

**The split reaches one lattice of the three (0367).** The rack's second lattice (`beatBlocks`) and
the specks' scatter (`scatterBlocks`) stand on cells of their own — the row pitch, and `SCATTER_SPAN`
of the marks' cells — so a whole cell of the marks' lattice is not a whole cell of theirs, and
splitting them by it would slice their marks rather than stand them apart. They union into the alpha
as they did and carry no ghost. A split in each lattice's own cell is two more offsets and two more
pairs of coverage reads in the loop that is already over the budget; it wants a step with the bake's
price in front of it.
