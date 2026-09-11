/**
 * @role Marks sketch 05 — the marks moved by the clock: each landing of the walk pushes its row that many marks denser at its level, and the push decays down the loop. The argument: the lattice stands still between events (0346), and what may move it is an event — a row that flares when its landing sounds and settles after is the sound reaching the marks.
 * @instead The one other → the file beside this one. The field itself and its dial →
 *   src/ui/sketch/marks/sketchMarks.ts. Where it would land → `refillRows` in src/ui/moireRows.ts, as a per-row push read off the meters and carried into the cell read; frame-side, one integer per row.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { DECAY_DIAL, decayField } from "@/ui/sketch/marks/sketchMarks";

/** What the dial stands at, in the picture's own words. */
const said = (at: number): string => `${Math.round(at * 100)}% of the way round the loop`;

export function SketchMarksDecay() {
  return (
    <SketchDriftStage
      reading="decay"
      label="The Decay"
      field={decayField}
      dial={DECAY_DIAL}
      said={said}
      dialLabel="Where in the loop the bench is standing"
    />
  );
}
