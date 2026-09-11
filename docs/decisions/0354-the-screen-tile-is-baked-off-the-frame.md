# 0354 — The screen tile is baked off the frame, and the frame draws the last complete one

2026-09-11. Checkpoint A2 of the block that plays the lattice (docs/plan.md §1).

## What was measured

The budget's setting as far as this machine allows it: the picture popped out (0138) into a real
window of 2560 × 1440 CSS pixels at two device pixels each — a canvas 5120 × 2880, a screen tile of
770 × 2940 — a full rack on two yards, headed Chromium on the real GPU, `--mute-audio`. Base
(`05e6bea`, checkpoint A) and head interleaved three times each over eight-second windows, base on
a dev server of its own that the run started and stopped. **The machine's audio output device is
gone**, so the deck clock does not advance and no travelling term rebakes anything of its own — the
gate's own `drive` step says so, identically at base. The rack's reading was therefore walked by
hand at three steps a second, the same walk in both trees, which put twenty-one bakes in every
eight-second window in both.

|                             | base (three runs)                             | head (three runs)                      |
| --------------------------- | --------------------------------------------- | -------------------------------------- |
| frames a second, popped     | 107.0 / 107.4 / 107.9                         | **124.0 / 124.0 / 123.9**              |
| rAF gap p95 / worst         | 9.3 / **133.4**, 9.2 / 124.9, 9.2 / 125.0     | 9.1 / **18.2**, 9.2 / 18.5, 9.1 / 18.1 |
| gaps over 20 ms, over 50 ms | 8 / 7, 10 / 7, 8 / 7                          | **0 / 0** in all three                 |
| long tasks, worst           | **7**, 140 ms / **7**, 128 ms / **7**, 122 ms | **0 / 0 / 0**                          |
| bakes, mean / worst         | 21, 44.6 / 133.6 ms                           | 21, 42.1 / 123.0 ms                    |
| a knob drag, 480 moves      | 480 landed, 0 dropped                         | 480 landed, 0 dropped                  |

The bake is not cheaper. It is **elsewhere**: every long task the picture caused is gone, and with
it every rAF gap over 20 ms.

## What this decides

**A screen tile is baked where the browser has a worker, and the frame draws the last complete tile
until the new one lands.** The same shape the curved rows' tile shop has held since 0144, at the
other pixel loop: `src/ui/moireScreenShop.ts` is asked for a tile and answers with the one it holds
or with the one this canvas last stood on, `src/workers/screen.ts` runs the loop, and the pattern
the painter fills through is cut against **the key the shop answered with** and not the one it
asked for — and the crawl and the band roll come round on **that tile's own width and height**,
because a translation of exactly one tile is the identity for a repeating pattern and the tile
standing in for a fold that has just moved is about seven times the width of the one asked for
(0351). A tile that is late costs the previous tile and never an empty picture.

For that to be possible the loop had to become plain data on both sides. `src/lib/moireScreenField.ts`
holds the whole of it and nothing that needs a document: the theme's colours arrive resolved
(`src/ui/moireScreenTile.ts` is all that is left on the page's side), the tunings a hand has moved
cross as the snapshot `applyTunings` puts on, and **a standing cell pass is a look's name and never
its function** — `MoireCells` carries no `pass`, and the one place a name becomes a function is
where the bake is put together. The pixel loop's own modules moved to `src/lib` with it, the tier
table's reason: a worker may import `lib` and nothing above it.

The three hosts that build a worker now share their listeners (`src/app/workerPort.ts`) and **not**
the construction: `new Worker(new URL(…, import.meta.url), …)` is the expression a bundler rewrites
where it stands, so it is inline in each of them and a case reads their source to keep it there.

**Where there is no worker the bake runs in bands, one slice a frame, under a four-millisecond
budget through `paced`** — never the whole loop in one task, and never a band in the painting that
asked for it. `bands()` is one generator and the two paths drain it differently, so the bytes are
the same bytes. That bake is dropped where it stands if a number it is baked under moves, and a
canvas with nothing at all to fall back on takes the one slot from a canvas that has something:
a stale tile is what 0144 allows, and flat ink for the life of the page is not.

## What it did not buy, and what it leaves

Not a governor: the same pixels at the same resolution, drawn at the same cadence. Not a kernel
either — priced per 0116 on this machine, the big tile's bake is 118 ms at p95 against a floor of
4.9 ms for writing the same bytes (2.6 ms for the tile's 9.1 MB, 2.3 ms for the body's 27.2 MB, and
0.3 ms for the strided touch 0058 compares against), so it is bound by per-pixel instruction
throughput by a factor of twenty-four and the headroom a wider instruction set would attack is
real. **0058's bar is absolute milliseconds on a path someone waits on, not the existence of
headroom**, and this bake is now in a worker on a path no gesture awaits — which is the same ground
0058 rejected the analysis kernels on. No WASM block is opened.

And 0353's second fact did not reproduce: a popped window put fullscreen goes on drawing at 120
frames a second, and so does the opener behind it, in both trees. A second display could not be
tested on the machine this was run on, so nothing is decided about one.
