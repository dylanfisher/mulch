# 0292 — A yard with no loop loops the whole file

- **Date:** 2026-09-02
- **Status:** accepted, amending [0274](0274-a-loop-is-a-ground.md)

0274 made the loop a ground and left the yard with no loop resting in the middle of the picture,
and the same absence went further back: with no loop there was no period, so the reference row, the
wash, the row of the whole session and the window every row is drawn across all fell away together
and a sounding yard drew nothing at all. A file played straight through is the commonest thing a
yard does, and it was the one thing the picture had nothing to say about.

**A yard with no loop is a yard whose loop is the whole file.** The picture's period is decided in
one place (`useMoireRows`, src/ui/MoireStrip.tsx) and that place says the fallback literally —
`loopPeriodSecs(loop ?? { in: 0, out: duration }, rate)` — so there is no second arithmetic beside
`loopPeriodSecs` and no second place a picture-sized number is decided (principle 1). Rate divides
it there for the reason it always did (0035). A yard with nothing loaded has no length to be a loop
of, answers 0, and stays empty, which is what keeps the seam safe.

**And the ground follows the rule.** `loopStand` reads the same loop, so an unlooped yard stands at
the top of the file rather than in the middle of the picture, and rests only where there is no
source at all.

**But the module still needs a real loop.** `gridOf` answers null without one, and the period no
longer says so, so the whole question — the loop and the slots — is one export, `loopJumps(loop,
rate)`, which `gridOf`, the drift's `jumpsPeriod` and the scope's `slotSecsOf` all ask: a yard
holding a pattern it has no loop to jump around draws the picture and none of the module's rows,
which is 0159's rule unchanged. Three callers is where the rule said twice becomes a picture that
can disagree with the sound (principle 3), and the export reads its length through
`loopPeriodSecs` so the rate guard is not written out a second time either.

**And a loop that goes away arrives outright.** `groundTravel` reads the reference row's period, so
with the file as the period half of it is minutes: a five-minute file would glide for two and a half
after its loop was cleared. The travel is a fraction of the loop a hand is _moving_ (0274), and a
yard with no loop has none to move, so the fallback travel is taken only where there is a loop —
which is exactly what an unlooped yard did before it had a reference row to read.

Durable shape: none.
