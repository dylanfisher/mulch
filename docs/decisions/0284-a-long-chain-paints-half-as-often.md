# 0284 — A long chain paints half as often

- **Date:** 2026-09-02
- **Status:** accepted, standing on [0144](0144-the-picture-may-fall-behind-the-hand-may-not.md) (the picture
  takes a budget on the frame loop and the hand keeps its rate) and on
  [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (the chain the looks are drawn in),
  beside the four passes that stand in it — [0280](0280-a-room-blooms-the-picture.md),
  [0281](0281-a-crusher-blocks-the-picture.md), [0282](0282-a-delay-repeats-the-picture.md),
  [0283](0283-a-pop-sharpens-the-picture.md)

**A chain longer than two passes is painted at half the drift's rate, and never slower than twelve
a second.** `DRIFT_PAINT_HZ` (24) stays the ceiling and no rack raises it; `looksPaintMs`
(src/ui/moireLooks.ts) answers the gap between two paintings off the looks the set already holds,
and the surface is asked at that gap rather than at the constant (`useDriftSurface`,
src/ui/driftTiles.ts). The floor is written down beside the rule — `Math.max(DRIFT_PAINT_HZ / 2,
LOOK_SLOW_HZ)` — so the halving stays a halving if the ceiling ever moves, rather than becoming a
stall.

**Two is measured and not chosen.** The profiler samples an idle page, so the loaded rack was priced
by hand: the zoomed picture of a playing yard, on the dev server, ten pass-taking instances added one
at a time at full mix, and the frame loop's own deltas read after each. At nought and one pass the
frames were 12.4 and 13.3 ms; at two the loop still alternated — a 46.5 ms painting frame against a
3.1 ms idle one, 23.7 ms mean; at three there was nothing between, every frame 46.4 ms of painting,
and from there it climbed by about nine milliseconds a pass to 99.4 ms at ten. That is the crossing:
the painting stops fitting inside its own 41.7 ms budget between two passes and three, so two is the
longest chain that keeps the whole rate. The numbers are this machine's headless SwiftShader, which
draws the same picture slower than a GPU would — but the shape of the curve is the chain's
length and not the renderer's, and a rule set from the pessimistic end errs toward the hand.

**And the same rack priced again with the rule standing** gives the frame loop its frames back: the
three-pass chain that was 46.3 ms mean with every frame a painting came back at 18.4 and 17.6 ms
mean over a 13.4 ms median, and the four-pass one at 20.4 against 55.4. The painting still costs what
it costs; it happens half as often.

**Read off the set, never off a clock.** The count is a fact about what the rack is set to, like
every other reading on `MoireRowSet` (0070): a painting that timed itself would slow the picture for
whatever else the machine was doing that second, would answer differently on a strip and on the
overlay of one yard, and would need a hysteresis nobody could test. Only the passes count — the
lattice is a fill, the fold is a bake and the warp and the shatter are cut through slices the field
is read back in either way (0269, 0278) — so a rack of ten sways is not a chain and is painted at the
whole rate.

**And the budget asks for its length rather than holding it, because a leaving pass is still a
pass.** `paced` (src/ui/frame.ts) took a number; it now takes a getter, `useCanvasSurface` passes one
down, and the drift's painting writes the cadence it just walked into a ref the budget reads. The
cadence has to come off the set the painting _walks_ and not off the commit that built it: a look
the rack has let go of is carried onto the set that replaced it and drawn until its presence reaches
nought (`carryLooks`, `looksTravelInto`), so a rack cut from four passes to one still draws four for
the whole of `SHAPE_SECS`. Read at the commit, the picture would speed back up to the whole rate
while it was still drawing the long chain — 46 ms of painting inside a 41.7 ms budget, the exact
overspend this decision exists to prevent — and, on a render that landed the other side of the
fade, would stay halved with a short chain until some unrelated commit came along. Both are gone: the
number moves on the painting that changes it, and the budget it feeds is built once and never
restarted mid-gap.

The knock-on is intended and worth saying: `BAKES_PER_PAINTING` is one curved tile a painting
(src/ui/driftTiles.ts), so under a long chain a bake lands half as often too. A tile that is late
costs the previous tile and never an empty picture (0144), which is the same trade this makes.

**The frame p95 the feature is watched against did not move.** Inside this step's gate the profiler
read 9.4 ms against a band of 9.3–10.4, and the loaded render factor it flagged was the machine:
interleaved, base came back at 17.1 and 17.2 against head at 17.2 and 16.8.
