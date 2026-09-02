/**
 * @role Drift sketch 05 — the picture fed back into itself through a zoom, drawn as what the ghost the
 *   painter already lays back would settle to if every frame were laid a little larger. The
 *   argument: the one term that is free per frame is a transform, and this is a transform.
 * @instead The other seven directions → the files beside this one. The field itself →
 *   src/ui/sketch/sketchDrift.ts. Where it would land → `aimFeedback` in src/ui/moireCanvas.ts, which
 *   already scales the ghost by three percent.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { TUNNEL_DIAL, tunnelField } from "@/ui/sketch/sketchDrift";

/** What the dial stands at, in the picture's own words. Hoisted so the stage is handed one function. */
const said = (zoom: number): string => `${Math.round(zoom * 100)}% a frame`;

export function SketchDriftTunnel() {
  return (
    <SketchDriftStage
      reading="tunnel"
      label="The Tunnel"
      field={tunnelField}
      dial={TUNNEL_DIAL}
      said={said}
      dialLabel="How much larger each frame of ghost is laid"
    />
  );
}
