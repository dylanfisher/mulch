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

/** The row the component drew: the box a hand types in, and the die that draws one beside it. */
const row = (seed: number, onCommit: (seed: number) => void, reseed = () => {}) => {
  const drawn = PlayerSeed({
    id: "a-seed",
    seed,
    onCommit,
    reseed,
    reseedLabel: "Reseed Seed on Yard A",
  });
  if (!isValidElement<{ children: unknown[] }>(drawn)) throw new Error("the seed drew no row");
  const [box, says] = drawn.props.children;
  if (!isValidElement<Ends>(box)) throw new Error("the seed drew no field");
  if (!isValidElement<{ children: unknown }>(says)) throw new Error("the seed drew no die");
  const die = says.props.children;
  if (!isValidElement<{ onClick: () => void }>(die)) throw new Error("the die is no button");
  return { field: box.props, die: die.props };
};
/** The box alone, which is what every claim about what a seed commits reads. */
const field = (seed: number, onCommit: (seed: number) => void) => row(seed, onCommit).field;
const typed = (value: number) => ({ valueAsNumber: value, value: "" });

describe("the seed's own field", () => {
  it("commits a whole 32 bits on Enter and on blur", () => {
    const onCommit = vi.fn<(seed: number) => void>();
    const props = field(9, onCommit);

    props.onKeyDown({ key: "Enter", currentTarget: typed(PLAYER_SEED_MAX) });
    expect(onCommit).toHaveBeenCalledWith(PLAYER_SEED_MAX);

    props.onBlur({ currentTarget: typed(0) });
    expect(onCommit).toHaveBeenLastCalledWith(0);
  });

  /** Every prefix of a ten-digit number is a different pattern, and a seed restarts the pass. */
  it("says nothing on a keystroke that is not Enter", () => {
    const onCommit = vi.fn<(seed: number) => void>();
    field(9, onCommit).onKeyDown({ key: "4", currentTarget: typed(1234) });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("patches nothing when the box already reads the pattern's own seed", () => {
    const onCommit = vi.fn<(seed: number) => void>();
    field(9, onCommit).onBlur({ currentTarget: typed(9) });
    expect(onCommit).not.toHaveBeenCalled();
  });

  /**
   * A refused seed patches nothing, so nothing remounts the field: it puts the number the deck is
   * actually playing back rather than leaving the heading reading one it is not.
   */
  it("refuses a fraction, a negative and one over the range, and puts the seed back", () => {
    for (const refused of [1.5, -1, PLAYER_SEED_MAX + 1, Number.NaN]) {
      const onCommit = vi.fn<(seed: number) => void>();
      const box = typed(refused);
      field(9, onCommit).onBlur({ currentTarget: box });
      expect(onCommit).not.toHaveBeenCalled();
      expect(box.value).toBe("9");
    }
  });
});

/**
 * 0385: the die beside the box presses the card's own reseed and mints nothing here — the number
 * a pattern unfolds from has one source, and this is a second place to ask for it.
 */
describe("the die beside that field", () => {
  it("presses the card's own reseed and commits nothing", () => {
    const onCommit = vi.fn<(seed: number) => void>();
    const reseed = vi.fn<() => void>();

    row(9, onCommit, reseed).die.onClick();

    expect(reseed).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });
});
