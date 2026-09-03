# 0298 — Every automator tears the torn picture, in pieces its run sizes

- **Date:** 2026-09-03
- **Status:** accepted, amending [0296](0296-the-automator-shards-the-picture.md) and
  [0297](0297-the-shards-are-pieces-not-a-wave.md)

**The pieces are as big as the run is young.** `shardWidth(held)` (src/lib/moireShards.ts) is the
step times `SHARD_WIDEST` for an automator holding one effect, falling geometrically to the step
itself at a full run (`GROWTH_COUNT_MAX`): four cycles a piece at one effect, two at six, so a full
run is twice as finely torn and no finer. Not 0297's one cycle — a full run has grown six rows of its
own, and against that weave a piece a cycle wide read as texture and the sense of a tear was lost. `held` is the presences of the automator's places summed,
written onto its look every frame off the read (`looksHeldInto`, src/ui/moireLooks.ts) and never a
term: a term is read off what an instance is set to, and a run is set to nothing (0204). A run
holding nothing yet is torn as one holding one, because an automator standing is a tear (0296).

**Every automator tears what the ones before it left.** The throw table is a layer per automator and
never a sum (`SHARD_LAYER`; `SHARD_CEILING` is gone). `cutField` (src/ui/moireCanvasField.ts) runs
the first layer on the warp's two passes and every further automator as two passes of its own — its
across throw over the surface the last layer landed in, its down throw out of that — so the second
tears pieces of the first's pieces, the way a flattened picture is torn again. Two surfaces between
suffice whatever the count: a layer reads one and writes the other, and the second is made only when a
second layer asks for it. `SHARD_CAP` stays four, now because each layer past the first is two more
whole-picture slice passes.
