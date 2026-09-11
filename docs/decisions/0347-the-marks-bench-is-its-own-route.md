# 0347 — The marks bench is its own route

- **Date:** 2026-09-10
- **Status:** accepted, adding a fifth screen to
  [0247](0247-a-sketch-is-drawn-in-the-real-tokens-and-thrown-away.md) for the reason
  [0295](0295-the-structure-bench-is-its-own-route.md) gave, and standing on
  [0345](0345-the-picture-is-a-lattice-of-marks.md) and [0346](0346-the-lattice-stands-still.md)

The lattice of marks stands still and reads in one ink, and the plan's block leaves one step open
(the field is mostly ground) with no word on where the lattice goes after it. Eight directions are
drawn before any is built: the read pushed to its ramp's ends, a second lattice at a held ratio,
the delay's echoes and the reverb's bloom written in marks rather than in the field, a landing's
push decaying down the loop, an alphabet per part, a scatter of big marks over the fine ones, and
the sound's rows as a lattice of their own. Each is the real marks (`markAt`, `markCoverage`) over
the shipped bloom under the shipped film, under one dial, at `#/marks`.

**Its own route, for 0295's reason.** Every picture reads a scene a cell at a time and writes a
lattice a pixel at a time, and the sketch bench already mounts twenty pictures.

**In one ink, and driven by the walk.** The bench argues structure and motion and never colour
(0346), so every stage is drawn through the instrument's own two stops; and the bench has no audio
(0247), so the walk in `src/ui/sketch/sketchWalk.ts` is the clock for the decay and the song for
the part.

**It reuses the drift bench's stage and frame and adds no primitive.** Two things are exported that
were not: `MARKS` from `src/lib/moireGlyph.ts`, so the part's alphabets are the shipped marks'
own shape and never a restatement of it, and `BENCH_DPR` from `src/ui/sketch/sketchDrift.ts`, so
the bench's cell is the screen's own pitch at the display the drift bench reads.

Deleted with `src/ui/sketch/marks/` the day one of its arguments wins, exactly as 0247 says.
