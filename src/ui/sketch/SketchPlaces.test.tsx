/**
 * The third bench's own half of the naming rule (0252): one look at where the picture sits, drawn
 * as the ground of a whole card with that card's controls over it. In the shape
 * `SketchDrifts.test.tsx` took — `SketchPage.test.tsx` mounts the bench and checks the list is the
 * bench, and this checks what the list draws. Plural in the name for the other two files' reason.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PLAYER_GROUP_LABELS } from "@/lib/copy";
import { PLAYER_FINE_LABEL } from "@/lib/copyCard";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { INKING_STOPS } from "@/ui/sketch/SketchDriftStage";
import { SKETCH_PLACES } from "@/ui/sketch/sketchEntries";
import { SketchPage } from "@/ui/sketch/SketchPage";

/** The whole bench, rendered once; the one place stage is sliced out of it. */
const markup = renderToStaticMarkup(<SketchPage />);

/**
 * The place stage, from its own attribute to the end of the page. Slicing to the end is only safe
 * because this bench is the last thing on the page and holds one entry — which is what the case
 * below pins, since the drift bench's own `stageOf` had to be amended the moment a bench was
 * mounted under it and read the new one's chips as its last entry's inks.
 */
function stage(): string {
  const opens = markup.indexOf('data-place="card"');
  expect(opens, "the card's ground is not mounted").not.toBe(-1);
  return markup.slice(opens);
}

describe("SketchPage draws where the picture sits", () => {
  /**
   * The argument is an order: the picture is painted first and everything a hand reads is painted
   * over it, with the card's own surface between the two as the one dial. A stage that drew the
   * canvas after the words would be a strip again with extra steps, so the order is what is pinned
   * and not merely the presence of the parts.
   */
  it("paints the picture under the card's words, with the veil between them", () => {
    expect(SKETCH_PLACES).toHaveLength(1);
    // Last on the page, which is what every slice above reads to the end of.
    expect(markup.indexOf('data-place="card"')).toBeGreaterThan(markup.lastIndexOf("data-drift="));
    expect(markup.indexOf("data-place=")).toBe(markup.lastIndexOf("data-place="));
    const drawn = stage();
    const canvas = drawn.indexOf("<canvas");
    const veil = drawn.indexOf('data-veil="card"');
    const words = drawn.indexOf(PLAYER_KNOB_LABELS.bed);
    expect(canvas, "the card's ground draws no canvas").not.toBe(-1);
    expect(veil, "the card's ground has no surface over its picture").toBeGreaterThan(canvas);
    expect(words, "the card's words are not over the picture").toBeGreaterThan(veil);
    expect(drawn, "the card's ground has no dial").toContain('data-slot="slider"');
    expect(drawn, "the veil says nothing of where it stands").toMatch(
      /data-said="card"[^>]*>[^<]*[a-z]/u,
    );
  });

  /**
   * And the order is a stacking and not a list, which is three classes and nothing in the markup's
   * shape: drop `relative` from the words' box, or `absolute inset-0` from either layer under it,
   * and the words are painted in flow beneath the veil and the canvas — a destroyed sketch that
   * every assertion above still passes, because the markup reads byte for byte the same.
   */
  it("lays the picture under the card and lifts the card's words over the veil", () => {
    const drawn = stage();
    expect(drawn, "the card's picture is not laid under the card").toContain(
      '<div class="absolute inset-0"',
    );
    expect(drawn, "the veil is not laid over the picture").toContain(
      'data-veil="card" class="absolute inset-0 bg-card"',
    );
    expect(drawn, "the card's words are not lifted over the veil").toContain(
      '<div class="relative flex flex-col gap-4 p-4">',
    );
  });
});

describe("the card's ground is drawn out of the bench's own parts", () => {
  /**
   * Drawn through the drift bench's own ramp and its own chips, so the card's ground and the strip
   * beside it cannot resolve one token two ways — the inks are read off these chips at paint
   * (principle 1).
   */
  it("names the inks it is painted in, and they are the bench's ramp", () => {
    const chips = [...stage().matchAll(/data-chip="([^"]+)"/gu)].map((found) => found[1] ?? "");
    expect(chips).toEqual(INKING_STOPS.ramp.map((stop) => stop.name));
  });

  /**
   * And it stands in for the card by speaking the card's own words: a mock that re-types "Bed" or
   * "Fine Tune" would be a second declaration of a copy string and would go on reading right after
   * the real one changed (principle 1).
   */
  it("says the card's own words rather than its own copies of them", () => {
    const drawn = stage();
    for (const word of [PLAYER_FINE_LABEL, PLAYER_GROUP_LABELS.ground, PLAYER_KNOB_LABELS.bed]) {
      expect(drawn, `the card's ground does not say ${word}`).toContain(word);
    }
  });
});
