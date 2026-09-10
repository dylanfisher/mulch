/**
 * @role Drift sketches 06–09 — the four scenes a yard's name reads as, each drawn along its own
 *   five stops under one dial, which is the wind its adjective sets. The argument: the picture is a
 *   field, which field it is, is already written on the yard (0329), and where on the field's own
 *   ramp a pixel stands is what the field answers (0332).
 * @instead The other five directions → the files beside this one. The grounds these draw →
 *   src/ui/scene/, which this reads and never restates. Where they land → `build` in
 *   src/ui/moireScreenTile.ts.
 */
import type { SceneName } from "@/lib/moireScene";
import { sceneOf } from "@/ui/scene/scenes";
import { type SketchStop, SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { SCENE_DIAL, sceneField } from "@/ui/sketch/sketchDrift";

/**
 * The chip class one scene stop is drawn in, by the token the scene names. **A literal per token
 * and not a template**: Tailwind reads the source as text, so a class assembled at runtime is a
 * class it never generates and a chip with no background is an ink the stage reads as nothing. The
 * scene still owns its ramp — this only says how to draw a swatch of a token — and a stop naming a
 * token nobody has a chip for is refused below rather than drawn blank (principle 5).
 */
const SCENE_CHIPS: Readonly<Record<string, string>> = {
  "--primary": "bg-(--primary)",
  "--drift-cool": "bg-(--drift-cool)",
  "--drift-hot": "bg-(--drift-hot)",
  "--screen-red": "bg-(--screen-red)",
  "--screen-green": "bg-(--screen-green)",
  "--screen-blue": "bg-(--screen-blue)",
  "--scene-water-black": "bg-(--scene-water-black)",
  "--scene-water-deep": "bg-(--scene-water-deep)",
  "--scene-water-lit": "bg-(--scene-water-lit)",
  "--scene-canopy-dark": "bg-(--scene-canopy-dark)",
  "--scene-canopy-lit": "bg-(--scene-canopy-lit)",
  "--scene-canopy-shade": "bg-(--scene-canopy-shade)",
  "--scene-meadow-tan": "bg-(--scene-meadow-tan)",
};

/**
 * One scene's own five stops, as the legend under its picture: read off the scene's `ramp` and
 * never restated beside it (principle 1), so entry 07 is the shipped bloom in the shipped colours
 * and a stop that moves in src/ui/scene/ moves here with it — which is the whole of what a bench
 * picture is for (0247). The name under a chip is the token's own last word, because that is what
 * the theme already calls the colour and a second name for it is a second place to keep in step.
 */
const stopsOf = (name: SceneName): readonly SketchStop[] =>
  sceneOf(name).ramp.map((token) => {
    const chip = SCENE_CHIPS[token];
    if (chip === undefined) throw new Error(`The bench has no chip for ${token}.`);
    return { name: token.split("-").at(-1) ?? token, chip };
  });

/**
 * The four, held once at load and never rebuilt per render: the stage repaints when its stop list
 * changes identity, so a fresh array a render would repaint every picture on the page forever
 * (src/ui/sketch/SketchDriftStage.tsx). Written out by name rather than mapped over the contract,
 * because the record's own type is then what says all four are here.
 */
const SCENE_STOPS: Readonly<Record<SceneName, readonly SketchStop[]>> = {
  meadow: stopsOf("meadow"),
  bloom: stopsOf("bloom"),
  water: stopsOf("water"),
  canopy: stopsOf("canopy"),
};

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
      inking={SCENE_STOPS[name]}
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
