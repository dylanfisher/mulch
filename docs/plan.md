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
every effect, every facet of playback, and colour, one step apiece. Every step keeps 0129: a
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
numbers from 0353; bench tags from bench-28. The bench's own entries name the file each lands in;
when a step lands, its entry is deleted from `src/ui/sketch/marks/` and the whole directory, the
route, the member, the branch and the menu item go with the last (0247).

**The bench's eight (steps 1–8).** Each is the bench's argument landed where its `built` note said,
in the order that builds the machine before what rides it. Steps 1, 2, 3, 4 and 5 landed as 0348,
0349, 0350, 0351 and 0352.

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

**Step 6 — a landing pushes its rows (bench-33).** _Durable shape moved:_ none. The bench's
**decay**, frame-side through the stamp: a landing (`jolt.at`, src/ui/moireJolt.ts, off
`player.step`) lifts the threshold passes one mark for the cell rows the sounding row's `centre`
stands in, at the landing's level, decaying on the deck clock over `cells.decay` of a loop — so a
row flares when its landing sounds and settles after, and the lattice stands still between.
**Stands on:** `joltWalked`, `meterPulse`; `stampMarks` from step 3 (0350); entry 05. **Outcome
wanted:** on the zoomed drift a walk is rows flaring in turn. **Tests that must fail first:** a
frame at a landing's edge stamps one mark heavier in that row's cells than the frame before; a
quarter of a loop later it stamps lighter than at the edge; no cell outside the row moves.
**Refused:** a rebake per landing; a push that outlives the loop.

**Step 7 — the part picks the alphabet (bench-34).** _Durable shape moved:_ none. The bench's
**part**: src/lib/moireAlphabets.ts holds the marks, the rings and the strokes, and the standing
part's character (`standingPart`, src/ui/moireRows.ts, read through src/lib/playerCast.ts — the
first moiré file to read the cast) chooses which the tile is written in: plain and riff in marks,
stutter and scatter in strokes, breathe and slide in rings. The alphabet is a field on the tile
key, so a part change is one rebake. **Stands on:** `MARKS`, `alphabetOf` from the bench;
`standingPart`. **Outcome wanted:** a song's sections read as different pictures without a cell
moving. **Tests that must fail first:** every alphabet is ten marks strictly rising in ink; a
yard with no player writes marks; a stutter part writes strokes and the key differs. **Refused:**
an alphabet per effect; a fourth alphabet without a character that needs it.

**Step 8 — the bench is deleted (bench-35).** _Durable shape moved:_ none. Entries 01–08 have
landed or been refused in §4; `src/ui/sketch/marks/`, `MARKS_ROUTE`, the `"marks"` member, the
App branch and the menu item go, and entries 10 and 11 of the drift bench with them, their
arguments having landed (0339, 0345). **Stands on:** 0247. **Tests that must fail first:**
SketchPage.test's cleared-id list names the bench's entries and MarksPage.test is gone. **Refused:** keeping
a bench beside the thing it argued.

**Every effect reaches the lattice (steps 9–11).** The registry says an effect declares its whole
reach; today twenty-one parameters declare none. Each step below is one table of claims and one
test that the unreached list is shorter.

**Step 9 — the row dimensions nobody claims (bench-36).** _Durable shape moved:_ none. `chirp` is
drawn on every row at rest and claimed by no `driftFrom`; `lens` and `octaves` are claimed once.
The panner's three stage toggles reach the stagger look as `count` (band), `spacing` (time) and
`size` (slice); `comp.output` reaches the squash as `lift`; and `chirp` is claimed by the walk's
`rates` in step 12. `STAGE_UNREACHED` in src/audio/effects/panner.ts empties and the registry's
unreached lists are tested to hold only what a step in this block names. **Stands on:**
`effectReach`, `rackLooks`, `staggerLook`, `squashLook`. **Outcome wanted:** turning any knob on a
panner or a compressor moves the picture. **Tests that must fail first:** every `PARAMS` key of
those two entries is in a `driftFrom` or a `lookFrom`. **Refused:** a claim that duplicates
another param's dimension on the same row.

**Step 10 — the automator's knobs reach through its run (bench-37).** _Durable shape moved:_
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

**Step 11 — the master's two sides (bench-38).** _Durable shape moved:_ none. `MasterPeek.left`
and `right` reach no moiré file. They reach the stamp: the threshold passes are lifted on the
picture's left and right halves by each side's level over the mean, so a panner sweeping is the
lattice's weight sweeping with it, and the screen's crawl runs toward the louder side. **Stands
on:** `stampMarks`; `inkThrough`'s crawl (rounded to whole cells, 0346). **Outcome wanted:** a
hard-left pan is a lattice heavy on the left. **Tests that must fail first:** a frame with
`left > right` stamps heavier in the left half's cells than the right's, and the reverse; equal
sides stamp the same. **Refused:** a per-side rebake; a stereo scene.

**Every facet of playback reaches the lattice (steps 12–14).**

**Step 12 — the step's own knobs (bench-39).** _Durable shape moved:_ none. A `PlayerStep`
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

**Step 13 — sparks and the armed part (bench-40).** _Durable shape moved:_ none.
`player.sparkPositions` reaches only the waveform and `player.armed` only the grid. A spark is a
peak event: it stamps one big mark (step 5's span) at its column for one landing's decay, through
the stamp. The armed part announces itself: the picture's rightmost cell column is written in the
coming part's alphabet from the moment it is armed, so what is next is on the page before the
boundary. **Stands on:** `stampMarks`, `moireAlphabets`, `standingPart`. **Outcome wanted:** on
the zoomed drift a spark is a flash of one big mark, and a queued part is a different edge.
**Tests that must fail first:** a frame with a spark stamps a big mark at its column and the next
loop does not; a yard with an armed part bakes its last column in the armed alphabet. **Refused:**
a spark that rebakes; more than one column for the armed part.

**Step 14 — the ground and the crawl are one (bench-41).** _Durable shape moved:_ none. The walk's
ground moves (`bedGround`, travelled by `easedCentre`) and the screen's crawl (`inkThrough`, off
the wind) are two motions with one name. The crawl takes the ground's travel: when the ground
moves a bed the lattice steps that many whole cells and the wind only leans it. **Stands on:**
`playerGroundSecs`, `groundTravel`, the crawl's cell rounding. **Outcome wanted:** a ground move is
the lattice stepping, visibly, once. **Tests that must fail first:** a fixture ground move of one
bed steps the crawl by one cell over `PLAYER_GROUND_TRAVEL` and the wind alone steps nothing.
**Refused:** a third clock.

**Colour returns to the marks (steps 15–17).** 0346 rested `glyph.flat` at one and `CHANNEL_MIX`
at nought because a five-pixel mark cannot show a gradient and a split stroke was a rainbow
grille. Colour comes back where a mark can carry it: one whole ink per mark, one whole cell per
channel, one band per coloured row.

**Step 15 — a mark is one of five inks (bench-42).** _Durable shape moved:_ none. A cell's read
chooses its stop as well as its mark: the ramp is cut into the scene's five stops and a covered
pixel is exactly one of them, never a mix, so a bloom is red marks and cool marks and never mud.
`glyph.flat` becomes how far the five are pulled toward the middle, resting where the zoomed
drift keeps a scene's ink under its air; the film's share still moves the read and never the
alpha (0340, 0345). **Stands on:** `sceneStops`, `ramp`, `build`. **Outcome wanted:** a canopy is
green marks with a few of its other four; a page whose covered pixels average the scene's stops
and not a mean of them. **Tests that must fail first:** every covered pixel of a tile at flat
nought is one of the five resolved stops; at flat one it is the middle stop. **Refused:** a sixth
stop; a gradient inside a mark.

**Step 16 — the channels split by whole cells (bench-43).** _Durable shape moved:_ none.
`CHANNEL_MIX` rests at nought because a third of a five-pixel cell is under two pixels. A pop's
saturation splits a mark into its three channels a whole cell apart instead — red one cell left,
blue one right, green in place — so the lit channel is a mark and not a stroke. `channelMix`
keeps its knob; what it moves is the offset in cells. **Stands on:** `fringeOf`, `channelAt`,
`looksSaturate`. **Outcome wanted:** a pop standing is a lattice with coloured ghosts a cell
either side. **Tests that must fail first:** at saturation nought a tile has one lattice; at
`CHANNEL_MIX_FULL` the red channel's marks stand one cell left of the green's. **Refused:** a
subpixel split; a split without a pop.

**Step 17 — a coloured row washes where it stands (bench-44).** _Durable shape moved:_ none. A
hue claim — the tape's tone, the reverb's tone, the shift's detune, the pop's sheen, the voice
from step 12 — reaches the tile today only as the boldest row's hue, one stop of five. The tint
(src/ui/moireTint.ts, frame-side, one band) becomes one band per coloured row at that row's
`centre`, at that row's `pulse`, so a colour stands where its row stands (0229) and two coloured
rows are two bands. **Stands on:** `tintThrough`, `colourReached`, `inkTravelInto`. **Outcome
wanted:** a tape's warmth is a warm band on the strip where the tape's row is. **Tests that must
fail first:** two rows claiming two hues draw two bands at two centres; a row with no claim draws
none; the fill count is the coloured-row count. **Refused:** a hue in the bake key; a band per
uncoloured row.

**Step 18 — the profile (bench-45).** _Durable shape moved:_ none. The block's end: `./scripts/profile`
on the zoomed drift with a full rack and a walk, the tile-bake time and the frame's draw count
read against the block's first step, and any rest this block chose on the bench read once more on
the strip at its own size (0342). **Tests that must fail first:** none; what fails is 0012's line.
**Refused:** a rest moved without a shot.

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
