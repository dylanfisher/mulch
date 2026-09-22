/**
 * @role Tests that the picture's field follows the look: under the uniform one every yard is handed
 *   the one plain screen whatever its name reads, so every yard's tile is keyed alike, and under
 *   scenes each is handed its own reading and whatever field a hand chose for it (0343, 0400).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { yardScene, YARD_SCENE_UNIFORM } from "@/lib/yardScene";
import { resetSceneChoices, setSceneChoice, usePictureScene } from "@/ui/yardSceneRead";

// The look, as a value a case may set: the real module reads a store this file has not stubbed.
let look: "uniform" | "scenes" = "uniform";
vi.mock("@/ui/driftLook", () => ({ useDriftLook: () => look }));

/** Two yards whose names read as two different places. */
const POPPIES = "Windy Foxglove by the Gate in Falling Dusk with Moths";
const REEDS = "Quiet Reed beyond the Shed";

function Picture({ name }: { name: string }) {
  return <>{JSON.stringify(usePictureScene(name))}</>;
}

/** What the picture of a yard is drawn in, read through the hook it is drawn through. */
const pictured = (name: string): unknown =>
  JSON.parse(renderToStaticMarkup(<Picture name={name} />).replaceAll("&quot;", '"'));

describe("usePictureScene", () => {
  afterEach(() => {
    resetSceneChoices();
    look = "uniform";
  });

  it("hands every yard the one screen under the uniform look, whatever its name reads", () => {
    expect(yardScene(POPPIES).scene).not.toBe(yardScene(REEDS).scene);
    // Each in its own wind, which moves the screen and bakes nothing (0400).
    expect(yardScene(POPPIES).wind).not.toBe(yardScene(REEDS).wind);
    expect(pictured(POPPIES)).toEqual({ ...YARD_SCENE_UNIFORM, wind: yardScene(POPPIES).wind });
    expect(pictured(REEDS)).toEqual({ ...YARD_SCENE_UNIFORM, wind: yardScene(REEDS).wind });
    // And a field a hand chose for one yard waits for the scenes look rather than breaking the one.
    setSceneChoice(POPPIES, "water");
    expect(pictured(POPPIES)).toEqual({ ...YARD_SCENE_UNIFORM, wind: yardScene(POPPIES).wind });
  });

  it("hands each yard its own reading under scenes, and a chosen field over it", () => {
    look = "scenes";
    expect(pictured(POPPIES)).toEqual(yardScene(POPPIES));
    expect(pictured(REEDS)).toEqual(yardScene(REEDS));
    setSceneChoice(POPPIES, "water");
    expect(pictured(POPPIES)).toEqual({ ...yardScene(POPPIES), scene: "water" });
  });
});
