/** @role Tests that the Scene card says the reading and offers the field, resting on the name's own and following a choice for that yard alone. */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import {
  SCENE_FIELD_WORDS,
  SCENE_LIGHT_WORDS,
  SCENE_PICK_LABEL,
  SCENE_REACH_WORDS,
  SCENE_SPECKS_WORDS,
  SCENE_SPREAD_WORDS,
  SCENE_STAND_WORDS,
  SCENE_WIND_WORDS,
  sceneAsNamed,
} from "@/lib/copyScene";
import { MoireSceneCard } from "@/ui/MoireSceneCard";
import { resetSceneChoices, setSceneChoice } from "@/ui/yardSceneRead";

/** A yard whose name reads as one of every bank, the same one the panel's own tests read. */
const YARD = "Windy Foxglove by the Gate in Falling Dusk with Moths";

/** What that name reads as, written out rather than read back through `yardScene`. */
const READING = [
  SCENE_WIND_WORDS.windy,
  SCENE_FIELD_WORDS.bloom,
  SCENE_REACH_WORDS.close,
  SCENE_STAND_WORDS.grille,
  `${SCENE_SPREAD_WORDS.wash} ${SCENE_LIGHT_WORDS.dusk}`,
  SCENE_SPECKS_WORDS.flock,
];

const card = (name: string) => renderToStaticMarkup(<MoireSceneCard name={name} />);

describe("MoireSceneCard", () => {
  afterEach(resetSceneChoices);

  it("offers the field under the reading, resting on the name's own, and says a chosen one", () => {
    const rest = card(YARD);
    expect(rest).toMatch(
      new RegExp(`data-slot="select-trigger"[^>]*aria-label="${SCENE_PICK_LABEL}"`, "u"),
    );
    // The list is closed until it is opened, so what a static render says is the trigger's value.
    expect(rest).toContain(`>${sceneAsNamed(SCENE_FIELD_WORDS.bloom)}<`);
    expect(rest).toContain(`>${READING.join(", ")}</p>`);
    // A choice replaces the field and nothing else in the sentence, on this yard alone.
    const onWater = [READING[0], SCENE_FIELD_WORDS.water, ...READING.slice(2)].join(", ");
    setSceneChoice(YARD, "water");
    const chosen = card(YARD);
    expect(chosen).toContain(`>${onWater}</p>`);
    expect(chosen).toContain(`>${SCENE_FIELD_WORDS.water}<`);
    expect(card("Still Reed")).not.toContain(`>${onWater}</p>`);
    // And handing it back to the name is the rest again, not a fifth field.
    setSceneChoice(YARD, null);
    expect(card(YARD)).toBe(rest);
  });
});
