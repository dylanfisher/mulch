# 0369 — The block closes on the budget, and no kernel qualifies for WASM

2026-09-11. Checkpoint D — the last of the four in the block that plays the lattice
(docs/plan.md §1), and the block's profile.

## What was measured, and against what

The budget's setting: the picture popped out (0138) into a real Chromium window of 2560 × 1440 CSS
pixels at two device pixels each — the popped canvas measured **5120 × 2880** — a full rack (eq,
panner, sway, two automators on `auto.stays` 5, a reverb at `wet` 1) on **two yards**, a walk
playing on both, headed on the real GPU, every launch `--mute-audio`, eight-second windows after an
eight-second settle. The audio device is alive (a headless `AudioContext` on `about:blank` reads
**0.987 s after 1000 ms**), so nothing was driven by hand: the deck clock ran, the landings landed
and the sparks flashed on the player's own schedule.

**Three trees, not two, and all three stood up the same way** — a `git worktree` with
`node_modules` symlinked, a Vite dev server of its own on a port and a cache dir this run started
and stopped, so no tree is measured on a different kind of server from another:

- **open** — `2f18077`, the commit that opened the block, on 5181.
- **cpC** — `143086c`, checkpoint C's commit, before steps 15 to 17, on 5182.
- **head** — `d2f1f8d`, step 17's commit, which is the tree this checkpoint measured. This step
  adds a test, a field on the painter's test-only recorder and one exported constant, none of
  which the runtime reads, so `d2f1f8d` is the picture this decision is about. On 5183.

Runs are **interleaved** — open, cpC, head, then reversed, then again — three rounds of the budget
window, and of the bake window three at cpC and head against **two** at the opening commit, whose
two stand so far outside the others that a third would have settled nothing. The attribution is per-function accumulators compiled into
each tree (identically into cpC and head; cut to what the opening commit has for open, which has no
stamp and no shop) and removed before the gate, beside a `longtask` observer and a rAF-gap
histogram; the CDP `Profiler` still wedges the renderer at this setting (0353). The draw count is
the exception and is better for it: it is the popped realm's own 2D context prototype wrapped, so
it is the same instrument in all three trees and no source at all.

One reading of the accumulators needs a note, because it looks like a contradiction: the tile size
the shop records is the **last tile any canvas on the page ordered**, and the page holds the yard
strips as well as the popped picture, so three of the nine budget runs end on a strip's 770 × 210
where the others end on the picture's 770 × 2940. Every bake time here is the picture's — it is the
only tile being rebaked under the walk — and the memory floor below was taken in runs that read
770 × 2940.

## The block's whole cost, in one table

**The budget's own window** — eight seconds, nothing touched, three runs a tree.

|                     | open `2f18077`        | cpC `143086c`         | head `d2f1f8d`        |
| ------------------- | --------------------- | --------------------- | --------------------- |
| frames a second     | 60.1 / 60.0 / 60.1    | 60.1 / 60.0 / 60.0    | 60.0 / 60.1 / 60.1    |
| rAF gap p95         | 18.3 / 18.2 / 18.4    | 18.3 / 18.1 / 18.2    | 18.1 / 18.1 / 18.2    |
| rAF gap worst       | 18.6 / 18.7 / 18.7    | 18.7 / 18.7 / 18.7    | 18.6 / 18.6 / 18.7    |
| gaps over 50 ms     | **0 / 0 / 0**         | **0 / 0 / 0**         | **0 / 0 / 0**         |
| long tasks          | **0 / 0 / 0**         | **0 / 0 / 0**         | **0 / 0 / 0**         |
| bakes in the window | **0 / 0 / 0**         | **0 / 0 / 0**         | **0 / 0 / 0**         |
| a painting, mean ms | 0.629 / 0.629 / 0.632 | 1.495 / 1.521 / 1.492 | 1.512 / 1.530 / 1.539 |
| the stamp, mean ms  | — (no stamp)          | 0.833 / 0.842 / 0.832 | 0.841 / 0.866 / 0.862 |
| the cut, mean ms    | 0.486 / 0.494 / 0.489 | 0.495 / 0.478 / 0.473 | 0.483 / 0.490 / 0.490 |
| the bands, mean ms  | 0.000 / 0.001 / 0.000 | 0.000 / 0.000 / 0.001 | 0.000 / 0.000 / 0.001 |

**The budget's fourth number** — 480 moves on the panner's own Position, in the same runs, on the
budget's rack plus the compressor the drag needs. The budget says sixty a second; **the drag really
ran at about twenty-eight**, because the script awaits each `mouse.move` over the wire and _then_
sleeps a sixtieth, so 480 moves take 16.2–17.0 s rather than 8. The same rate in all three trees, so
the comparison holds, but it is not the budget's own gesture and the verdict below says so. And the
moves are **dispatched**, never read back: nothing here counts what the app received, unlike 0307's
own proof, so this table says the drag ran, not that every move landed.

|                     | open               | cpC                | head               |
| ------------------- | ------------------ | ------------------ | ------------------ |
| moves dispatched    | 480 / 480 / 480    | 480 / 480 / 480    | 480 / 480 / 480    |
| the drag's own span | 16.2 / 16.2 / 16.3 | 16.8 / 16.6 / 16.6 | 16.9 / 17.0 / 16.5 |
| rAF gap p95         | 18.2 / 18.2 / 18.3 | 18.2 / 18.2 / 18.1 | 18.1 / 18.3 / 18.1 |
| rAF gap worst       | 18.7 / 18.7 / 18.7 | 34.7 / 34.9 / 18.7 | 33.2 / 33.6 / 35.0 |
| gaps over one frame | **0 / 0 / 0**      | 2 / 1 / 0          | 1 / 2 / 2          |
| gaps over 50 ms     | **0 / 0 / 0**      | **0 / 0 / 0**      | **0 / 0 / 0**      |
| bakes in the drag   | **0 / 0 / 0**      | **0 / 0 / 0**      | **0 / 0 / 0**      |

**The bake**, which has no sample at the budget's setting at all — nothing rebakes there, in any of
the three trees — taken separately with one tunable on the stamp's key walked three times a second
(cpA2's and cpB's walk), interleaved.

|                     | open              | cpC                   | head                  |
| ------------------- | ----------------- | --------------------- | --------------------- |
| bakes in the window | 69 / 69           | 72 / 71 / 72          | 72 / 72 / 72          |
| a bake, mean ms     | 58.1 / 51.1       | 45.2 / 66.1 / 60.7    | 72.0 / 42.9 / 40.2    |
| a bake, worst ms    | 153.6 / 133.4     | 120.0 / 169.9 / 162.9 | 167.7 / 114.7 / 107.4 |
| frames a second     | **33.0 / 37.0**   | 60.0 / 60.0 / 60.0    | 60.0 / 60.0 / 60.0    |
| rAF gap p95         | **166.7 / 150.0** | 18.0 / 18.0 / 18.0    | 18.2 / 18.0 / 18.4    |
| gaps over 50 ms     | **23 / 24**       | **0 / 0 / 0**         | **0 / 0 / 0**         |
| long tasks          | **23 / 24**       | **0 / 0 / 0**         | **0 / 0 / 0**         |
| a painting, mean ms | **20.30 / 17.46** | 1.520 / 1.591 / 1.520 | 1.586 / 1.534 / 1.591 |

**The frame's draw count**, counted off the popped window's own context, normalised by the clear
that opens each painting of that canvas. "Covering half the picture" is that canvas's own area and
takes the draw's destination box unclipped, so it counts a band that hangs off the canvas whole:

|                           | open      | cpC | head      |
| ------------------------- | --------- | --- | --------- |
| `drawImage` a painting    | 128 / 128 | 129 | 129 / 129 |
| calls a painting          | 137 / 130 | 138 | 138 / 131 |
| covering half the picture | 1 / 2     | 2   | 2 / 3     |

## Against the budget, item by item

- **No long task the picture is the cause of.** **0** in every budget window of all three trees.
  **Met**, and met at the block's opening too. Under a walked tile key it is **0 at head and at
  cpC against 23 and 24 at the opening commit** — which is 0354's whole argument, now measured
  against the commit the block started from rather than against the checkpoint before it.
- **rAF gap p95 under 20 ms, and nothing over 50.** p95 **18.1–18.2 ms** at head against
  18.2–18.4 at the opening commit, on a 60 Hz session; **no gap over 50 ms in any budget window of
  any tree**, still or dragging. **Met** — and, unlike checkpoint C, met on both halves: nothing in
  these eighteen windows reproduced the single 58.2 ms gap that run recorded. The bake windows are
  another matter and are not the budget's setting: the opening commit carries 23 and 24 gaps over
  50 ms in its two, where cpC and head carry none in any of theirs.
- **A tile bake under 4 ms mean and 8 ms worst.** **40.2–72.0 ms mean, 107–168 ms worst** at head;
  45.2–66.1 and 120–170 at cpC; 51.1–58.1 and 133–154 at the opening commit. **Not met, and not
  moved by the block** — the three trees' ranges overlap, so steps 15 to 17 did not make it dearer
  and neither did steps 9 to 14. What the block bought is **where** it runs: off the frame (0354),
  where it costs the frame nothing, against a painting of 17–20 ms at the opening commit.
- **A knob drag of 480 moves drops no frame.** No drag baked a tile in any tree and none carried a
  gap over 50 ms, but **head and cpC each carry one or two gaps of about 34 ms — one dropped frame
  — in a drag window where the opening commit carries none**: 1 / 2 / 2 at head, 2 / 1 / 0 at cpC,
  0 / 0 / 0 at open. **Not met at head or cpC, met at the block's opening**, at a drag of about
  twenty-eight moves a second rather than the budget's sixty. **The cause is not established, and
  the obvious one is ruled out**: the painting's own worst frame is 2.7–3.1 ms at head against
  1.4–2.4 at open, nowhere near the 17 ms of overrun a 34 ms gap is, so 0.9 ms of extra painting
  cannot be it. Nor is it the pointer: **one head bake window with nothing touched carries the same
  single 34 ms gap** (`hb1`, `max` 33.3). What the gap tracks is the tree and not the gesture, and
  what would settle it is a profile of the frame it lands on, which the CDP Profiler cannot take at
  this setting (0353). Recorded as the block's, unattributed, in the ledger below.

## The ledger of what stands over the budget

Two entries, and nothing else stands over it.

**1. The tile bake, 40–72 ms mean and 107–168 ms worst.** _Cause:_ the screen tile's own pixel
loop — `screenField` and the `bands` generator it drains (src/lib/moireScreenField.ts), over
`cellRead` (src/lib/moireScreenCells.ts), the standing cell passes, `beatLattice`
(src/lib/moireScreenBeat.ts) and `scatterLattice` (src/lib/moireScreenScatter.ts), run in
src/workers/screen.ts — at the popped picture's own tile of 770 × 2940 for a canvas of
5120 × 2880. (The step's own text names `build` and `cellGrid`, which is what those were called
before 0354 took the loop off the frame and out of src/ui.) _What it costs where it
is:_ nothing on the frame. It runs in the worker (0354) on a path no gesture awaits, the frame
draws the last complete tile, and at the budget's own setting it does not run at all in an
eight-second window. What it costs is **staleness**: with a key term travelling, the picture shows
the tile before the last rung for 40–72 ms, and for 168 ms at the worst bake seen here — two to ten
frames at 60 Hz. _The lever that would close it:_ a kernel — a WASM port, or a cheaper loop. _What
that lever needs:_ see below; it does not clear 0058's bar.

**2. One dropped frame of about 34 ms, once or twice in a window, at head and at cpC and never at
the block's opening.** _Cause:_ **not established.** The painting is 2.4 times the painting the
block opened with (0.63 → 1.53 ms mean), but its worst frame is 3.1 ms against 2.4, and a 34 ms gap
is 17 ms of overrun — so the painting is ruled out rather than blamed. It is not the drag either:
a head bake window with nothing touched carries one (`hb1`). It appears in both instrumented trees
and in neither of the opening commit's budget windows, so it arrived between `2f18077` and
`143086c` — somewhere in steps 1 to 14, not in 15 to 17. _The lever that would close it:_ unknown
until the cause is, and the two obvious ones — paint the marks every other frame under a drag,
stamp fewer passes while a hand is down — are the governor the budget's own paragraph refuses to
call a fix. _What that lever needs:_ a profile of the frame the gap lands on, which the CDP
Profiler cannot take at this setting (0353), so it needs an instrument this checkpoint does not
have. **Recorded, unattributed, and owned by whoever next profiles the picture.**

## The bake's own JavaScript, priced against its memory floor — and the WASM verdict

Priced in 0116's terms, but **in the page and not on a `./scripts/bench` row**: the bench is a
plain-Node kernel bench and this loop wants a resolved theme, a tunings snapshot and the worker it
runs in, and 0116's own scope is the per-sample loops of `src/lib` and the worklets. The divergence
is named here rather than glossed; a bench row for it is work this checkpoint did not do.

The tile is the popped picture's own, **770 × 2940 = 2.26 Mpx, 9.06 MB** of bytes. Writing those
same bytes and nothing else costs **3.0 and 3.1 ms at its fastest, 3.3 and 4.6 ms at its median**
over two runs; the strided touch 0058 compares against costs **0.2 ms**. Against a bake of
40.2–72.0 ms mean, the loop therefore runs at **8.7 to 24 times its own memory floor** — 40.2/4.6
at one end, 72.0/3.0 at the other — and at 23 to 56 times it at its worst bake. So the headroom is
real and the kernel is bound by per-pixel instruction throughput, as 0354 found and as 0211 found
for the curved field (its hundredfold). **It is not 0354's ratio restated:** that one divided by a
floor of 4.9 ms, the tile's bytes plus the body's, where this divides by the tile's alone. Under
0354's own denominator this bake prices at about 8 to 15 times its floor.

**Nothing qualifies, and the block closes without opening a WASM block.** 0058's bar is absolute
milliseconds on a path someone waits on, never the existence of headroom, and this kernel fails it
on every reading this checkpoint took:

- It is **off the frame and off every awaited path** (0354). At the budget's setting, with a full
  rack on two yards and a walk playing, it ran **zero** times in each of nine eight-second windows
  and **zero** times across nine 480-move drags.
- When it is driven — a key term walked three rungs a second, which is the only driver that gives a
  bake a sample here — the frame loop does not notice: **60.0 frames a second, p95 18.0–18.4 ms, no
  long task and no gap over 50 ms**, in both instrumented trees. What is _not_ measured here is a
  hand at sixty moves a second on a knob that is itself a tile key: every drag in this set is the
  panner's Position, which is a fill and bakes nothing. What stands for that case is checkpoint C's
  wall clock over the automator's Stays and Stray, which are the curved tile's key and whose drag
  windows are clean (0365).
- The human's own statement of what matters — the picture's frame rate at a large popped-out
  window — is therefore already held, and held by this block: the same drive at the commit the
  block opened with reads **33–37 frames a second, p95 150–167 ms and 23–24 long tasks**. The
  frame rate was bought by moving the loop, not by making it faster, and a kernel would buy no more
  of it.
- What a kernel would buy is the staleness above: a best-imaginable port at, say, four times the
  speed takes a stale tile from 40–72 ms to 10–18 ms. That is two dropped rungs instead of four on
  a term nobody is dragging, against a crate, a build step in `./scripts/setup` and the Vite build,
  and a toolchain a fresh clone must install — the same trade 0058 refused, at a smaller prize.
- And **0211's bar closes the door the other way**: an optimisation of the picture's kernels ships
  only if the picture does not move, and a WASM SIMD port is explicitly among the things that
  decision rejects, vectorised `log` and `atan2` being polynomials rather than `Math.log`. The
  screen tile's loop is a second kernel from the one 0211 measured, but the rule is the picture's
  and not that kernel's.

So this is a record in the shape of 0058: **measured, qualified on headroom, rejected on absolute
cost on a path nobody waits on.** If it is ever revisited, the number that would change the answer
is a bake a person waits through — a gesture that blocks on a tile, or a bake on the frame — and
neither exists in this build.

## What this checkpoint leaves in the gate

One stable boolean, as every checkpoint in the block does: **a reading off the painter's own
recorder of what a frame lays over the picture, against one declared budget.**
`PICTURE_FILL_COVER` (src/ui/moireTint.ts) is `1 + TINT_BANDS` — the screen's own ink laid once, in
the strips the gust leans apart, and at most one more picture per coloured row. Nine pictures of
fill is the ceiling. `src/ui/moireTint.test.ts` paints eight coloured rows with `colour.band` at its
far end, sums what each fill covered **clipped to the picture** — a band twice the picture wide
hangs half of itself off the canvas and the rasteriser pays for none of it — pins the constant at
nine so raising it is a decision rather than an edit, and reads the same painting at the dial's rest
for a fifth of it. The case is red under two inversions: a ninth band (`expected 10 to be 9`) and
one more whole-canvas fill in `tintThrough` (`expected 10 to be less than or equal to 9`).

**It is a cover and not a count, which is one word away from what the budget's paragraph asks for
and worth stating plainly.** What a band costs is the pixels it composites, not the call that asks
for them, so the cover is the unit that decides whether a hand feels it; what bounds the _count_ is
`TINT_BANDS`, and that a row claiming no colour lights none of them is asserted where 0368 put it,
in the case above this one. Checkpoint A's `STAMP_PICTURE_DRAWS` is the count half for the stamp and
still bounds its draws at one.

For that reading to exist, the painter's recorder (src/ui/moireCanvasPainted.ts, test-only) now
keeps the box a fill covered on the canvas itself, the way its surfaces' fills already did.

## The profile, and the rests

`./scripts/profile` on the block's last commit, read whole: **🟢 good — nothing regressed against
the last 10 runs**, six numbers steady. Realtime factor 50.0x (−11%, median 56.3x, band
50.0x–66.7x), loaded factor 17.8x (−0.0%, band 17.6x–18.3x), churn 331 ms (+2.6%), frame p95
10.4 ms (+12%, at the top of a 9.3–10.4 band), heap delta 1.79 MB (+2.0%), longest task 0 ms; no
leak in the live-object columns, no long task across the churn. It exits 0 whatever it finds
(0051), and it found nothing.

**Every rest this block chose on the bench was read once more on the strip at its own size (0342),
and none is moved.** `glyph.push` 1, `cells.rows` 0.5, `cells.decay` 0.5, `glyph.flat` 0.5,
`colour.band` 0.4, `colour.pulse` 0.5 — each shot at its rest, at its minimum and at its maximum on
a playing yard, the 1:1 crops read side by side. The reading that decides is the crop and not the
mean: a 32-pixel strip's mean over a playing yard moves from 0.115 to 0.185 within 400 ms whatever
the dial is set to, which is 0342's own finding that a playing strip is never the same picture
twice, so the mean cannot resolve a rest and was not used to. In the crops the rest reads as 0348's
argument does — a sparse ground of dots with a dense band through it, against a min that is marks
everywhere and a max that is nearly bare — and `glyph.flat` at nought is the grey picture the ink
was added to. No rest is moved, so no shot is owed for one.
