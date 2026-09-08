/**
 * @role What the seed's field commits and what it refuses: a whole 32 bits patches the pattern, a
 *   number that is not one puts the pattern's own back in the box, and neither happens until the
 *   hand is finished typing (0312).
 */
import { describe, expect, it, vi } from "vitest";
import type * as ReactTypes from "react";
import { isValidElement } from "react";

// The one hook this field calls, made callable outside a renderer — the same stand-in
// src/ui/PlayerCard.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { PLAYER_SEED_MAX } from "@/lib/player";
import { PlayerSeed } from "@/ui/PlayerSeed";

type Ends = {
  onBlur: (event: { currentTarget: unknown }) => void;
  onKeyDown: (event: { key: string; currentTarget: unknown }) => void;
  defaultValue: number;
};

/** The field the component drew, and the box a hand has been typing in. */
const field = (seed: number, onCommit: (seed: number) => void) => {
  const drawn = PlayerSeed({ id: "a-seed", seed, onCommit });
  if (!isValidElement<Ends>(drawn)) throw new Error("the seed drew no field");
  return drawn.props;
};
const typed = (value: number) => ({ valueAsNumber: value, value: "" });

describe("the seed's own field", () => {
  it("commits a whole 32 bits on Enter and on blur", () => {
    const onCommit = vi.fn();
    const props = field(9, onCommit);

    props.onKeyDown({ key: "Enter", currentTarget: typed(PLAYER_SEED_MAX) });
    expect(onCommit).toHaveBeenCalledWith(PLAYER_SEED_MAX);

    props.onBlur({ currentTarget: typed(0) });
    expect(onCommit).toHaveBeenLastCalledWith(0);
  });

  /** Every prefix of a ten-digit number is a different pattern, and a seed restarts the pass. */
  it("says nothing on a keystroke that is not Enter", () => {
    const onCommit = vi.fn();
    field(9, onCommit).onKeyDown({ key: "4", currentTarget: typed(1234) });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("patches nothing when the box already reads the pattern's own seed", () => {
    const onCommit = vi.fn();
    field(9, onCommit).onBlur({ currentTarget: typed(9) });
    expect(onCommit).not.toHaveBeenCalled();
  });

  /**
   * A refused seed patches nothing, so nothing remounts the field: it puts the number the deck is
   * actually playing back rather than leaving the heading reading one it is not.
   */
  it("refuses a fraction, a negative and one over the range, and puts the seed back", () => {
    for (const refused of [1.5, -1, PLAYER_SEED_MAX + 1, Number.NaN]) {
      const onCommit = vi.fn();
      const box = typed(refused);
      field(9, onCommit).onBlur({ currentTarget: box });
      expect(onCommit).not.toHaveBeenCalled();
      expect(box.value).toBe("9");
    }
  });
});
