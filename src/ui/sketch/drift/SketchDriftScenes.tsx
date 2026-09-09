/**
 * @role Drift sketches 06–09 — the four scenes a yard's name reads as, drawn side by side under
 *   one dial, which is the wind its adjective sets. The argument: the picture is a field, and which
 *   field it is, is already written on the yard (0329).
 * @instead The other five directions → the files beside this one. The grounds these draw →
 *   src/ui/scene/, which this reads and never restates. Where they land → `build` in
 *   src/ui/moireScreen.ts.
 */
import type { SceneName } from "@/lib/moireScene";
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { SCENE_DIAL, sceneField } from "@/ui/sketch/sketchDrift";

/** What the dial stands at, in the picture's own words. One sentence for all four: it is one dial. */
const said = (lean: number): string => `leaning ${Math.round(lean * 100)}% of the wildest wind`;

/**
 * One scene's stage: the bench's own box, this scene's ground in it, and the lean under it. The
 * four below differ by a name and a label and nothing else, so they are one function called four
 * times rather than four files that would have to be kept in step by hand (principle 1).
 */
function SceneStage({ name, label }: { name: SceneName; label: string }) {
  return (
    <SketchDriftStage
      reading={name}
      label={label}
      inking="ink"
      field={sceneField(name)}
      dial={SCENE_DIAL}
      said={said}
      dialLabel="How far the yard's own wind leans the field"
    />
  );
}

export function SketchDriftMeadow() {
  return <SceneStage name="meadow" label="The Meadow" />;
}

export function SketchDriftBloom() {
  return <SceneStage name="bloom" label="The Bloom" />;
}

export function SketchDriftWater() {
  return <SceneStage name="water" label="The Water" />;
}

export function SketchDriftCanopy() {
  return <SceneStage name="canopy" label="The Canopy" />;
}
