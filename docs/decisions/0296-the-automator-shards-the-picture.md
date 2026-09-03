# 0296 — The automator shards the picture

- **Date:** 2026-09-03
- **Status:** accepted, amending [0278](0278-the-rack-shapes-the-picture.md) and
  [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) — the automator's look is no longer a
  fold baked on a curved row's coordinate but a tear cut through the finished field — inside
  [0269](0269-the-rack-scatter-shatters-the-field.md)'s rule (every band is a draw of the field, once,
  at one alpha, never a fill) and standing on
  [0295](0295-the-structure-bench-is-its-own-route.md), whose Shards entry won and left the bench.

**One cross-section per automator standing.** `shardsLook = { at: "cut", terms: {} }`
(src/lib/moireShards.ts): every slice the cut already reads the field back in is thrown across by a
cosine of the escape count read at that slice's middle down the picture's centre column, and every
column of what that left is thrown down by the same count read along the centre row, a quarter turn
behind (`SHARD_DOWN`). The k-th standing automator reads the count at zoom `SHARD_RATIO ** k` and a
quarter turn on (`SHARD_PHASE`), so two automators are two tears at different pitches crossing and
never one tear drawn twice as far. The fold is gone with its whole footprint — `looksFolds`,
`foldsOf`, `steppedFolds`, `DriftPlace.folds`, the fold branch of `curvedField`, the `|folds` segment
of the curved key — and `LookAt` has no `bake` any more; src/lib/moireFold.ts keeps `kaleido`,
`foldPlane` and `FOLD_CAP` for the bench alone.

**Summed and clamped in shares of the height.** One automator throws `SHARD_REACH` of the height
both ways — the height and not the wobble's width, because the strip is thirty-two pixels tall and
thousands wide and a width share thrown down it would wrap the strip several times. The sum over
the automators standing is clamped to `SHARD_CEILING`, three whole reaches, for 0250's reason and
not derived from `SHATTER_CEILING`, which bounds a different thing. Clamped and never normalised: a
sum scaled to the ceiling would shrink the first tear as a second automator arrived, the picture
_less_ torn for a moment by more automators. `SHARD_CAP` is four; every automator past it throws
nothing.

**One automator is visible where one scatter is nought.** The scatter's reading is stated across a
band of instances (`RACK_SHATTER_BAND`) and one alone breaks nothing; an automator's presence is
`none` — it is in the rack or it is not — so it stands at one and tears at the whole reach the frame
its look has travelled in (`SHAPE_SECS`). A bypassed automator is in no set and tears nothing.

**Fly held at nought, the table filled once a painting off the roamed stops.** The count is read off
`fractalSeedInto(thrown, roamed, 1, 0)` — the stops the painter already roams, at the zoom of one and
no flight. The roam is continuous and is the plane the picture already stands on, so the tear moving
with it is the field moving under it and no motion of its own (0126); the flight and the breath are
stepped ladders on the tiles, and a tear that stepped with them would snap where the rows crossfade
(0261). The table is `2 × LENS_SLICES` doubles kept as module scratch beside the cut, filled once a
painting where anything stands — at most `4 × 128` kernel reads, no allocation (0070), no read-back
(0129) — and the fold's ladder of picture-sized bakes is gone with the fold.

**The column pass is taken for the shards as for the warp.** `cutField` takes the surface between
when `bent > 0 || standing > 0`, adds each slice's across throw to the slide every band already
takes, wraps into one width where the shatter's walk or a tear stands, and adds each column's down
throw to the warp's second sine. Every band still lands once at one alpha (0269); a straight row is
torn exactly as a curved one is, and nothing is baked for it.

**What the picture says, on the thirty-two-pixel strip of a click-train yard.** Shot twice per rack,
interleaved none/one/two/none/one/two, off a fresh build through `./scripts/drive --shot`: no
automator reads a mean ink of 0.311 and 0.223 at swings of 0.037 and 0.029; one automator 0.378 and
0.378 at 0.085 and 0.087; two 0.392 and 0.406 at 0.039 and 0.047. The 1:1 crop at one automator is
the straight rows visibly broken across a jagged tear — neighbouring slices thrown by unrelated
amounts where the filigree is dense, and by one slow wave where the plane is open; at two, the
crop is a finer break with the columns' zig-zag crossing the rows', which is the second tear at its
own pitch. The shot cannot isolate the term, and says so: an automator also grows effects, so the
yard's rows change with it and a mean that rises is the grown rows as much as the tear; the count's
own effect is proved at the cut instead, where the painter's own case slides sixty-four bands by
distinct amounts under the ceiling, cuts each once at alpha one with the same fills as a plain
picture, and throws at least one band further at two automators than at one. The zoomed picture
was not photographed: the headless smoke starves on the ghosts an automator's run grows
(picture-02's finding), and no real browser was reachable from this run.
