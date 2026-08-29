/**
 * @role What a written part is: the cell one jump of it reads, the way a row shorter than the part
 *   comes round, what the validator refuses off the wire, and what the walk lays down for a part
 *   that carries one — here rather than in src/lib/playerWalk.test.ts, which is at the hard cap
 *   (0045, docs/map.md).
 * @instead Every other claim the walk makes → src/lib/playerWalk.test.ts. The part that carries a
 *   row → src/lib/playerSong.test.ts. The row a hand writes it on → src/ui/PlayerStrip.test.tsx.
 */
import { describe, expect, it } from "vitest";

import { partVoice, type PartVoice, type PlayerSpec } from "./player.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import type { SongPart } from "./playerSong.ts";
import { PLAYER_SLOTS } from "./playerSlots.ts";
import { playerSequence } from "./playerWalk.ts";
import { PLAYER_STRIP_MAX, stripOf, stripStep, type PartStep } from "./playerStrip.ts";

/** A pattern holding the song handed in, at one seed, so what moves between two walks is the row. */
const spec = (song: readonly SongPart[]): PlayerSpec => ({ seed: 11, ...PLAYER_DEFAULTS, song });

/** Three cells, told apart by their slot, which is the field every case here reads back. */
const ROW: PartStep[] = [
  { slot: 0, repeats: 4, rest: 0 },
  { slot: 3, repeats: 2, rest: 1 },
  { slot: 7, repeats: 8, rest: 0 },
];

describe("the cell a written jump reads", () => {
  /**
   * The row comes round for as long as the part stands, which is what makes the part's own length
   * the number of times the row repeats — and is why no cell carries a repeat bracket of its own
   * (0188).
   */
  it("reads the row round and round", () => {
    const read = Array.from({ length: 7 }, (_, at) => stripStep(ROW, at)?.slot);
    expect(read).toEqual([0, 3, 7, 0, 3, 7, 0]);
  });

  /** An empty row is the whole of "this part is drawn": there is no cell, and the dials author it. */
  it("hands back nothing for a part nobody wrote", () => {
    expect(stripStep([], 0)).toBeNull();
    expect(stripStep([], 5)).toBeNull();
  });
});

describe("a written row off the wire", () => {
  it("takes a row whose cells are all inside the module's own ranges", () => {
    expect(stripOf(ROW, "a row")).toEqual(ROW);
    // And an empty one, which is the ordinary case rather than an error.
    expect(stripOf([], "a row")).toEqual([]);
  });

  it("refuses anything that is not one, cell by cell", () => {
    expect(() => stripOf(null, "a row")).toThrow(/not an array/u);
    expect(() => stripOf([7], "a row")).toThrow(/not an object/u);
    // Every bound is the module's own, so a cell reading off the grid is refused by the same
    // range an ordinary landing is held to (principle 1).
    expect(() => stripOf([{ slot: PLAYER_SLOTS, repeats: 1, rest: 0 }], "a row")).toThrow(
      /outside/u,
    );
    expect(() => stripOf([{ slot: 1.5, repeats: 1, rest: 0 }], "a row")).toThrow(/not whole/u);
    expect(() => stripOf([{ slot: 0, repeats: 0, rest: 0 }], "a row")).toThrow(/outside/u);
    // Keyed exactly, like every other durable shape: a cell from another build is not a cell.
    expect(() => stripOf([{ slot: 0, repeats: 1 }], "a row")).toThrow(/expected/u);
    expect(() => stripOf([{ ...ROW[0], jump: 2 }], "a row")).toThrow(/expected/u);
    // And a row longer than a part may be written as, which is the one bound the list carries.
    const long = Array.from({ length: PLAYER_STRIP_MAX + 1 }, () => ROW[0]);
    expect(() => stripOf(long, "a row")).toThrow(/over/u);
  });
});

/**
 * The other author of where the pattern goes: a part written as a row of cells is played as that
 * row and not as a walk of it (0188), which is the same shape 0163 settled one field down for the
 * placed rest — and the regression that matters is the one at the end, that a part nobody wrote
 * lays down precisely the stream it laid before a row could be written at all.
 */
describe("a walk that holds a written part", () => {
  /** Three cells, told apart by every field the row authors. */
  const WALKED = [
    { slot: 5, repeats: 3, rest: 0 },
    { slot: 2, repeats: 1, rest: 2 },
    { slot: 9, repeats: 7, rest: 1 },
  ];

  /** A part with the id every one carries and the dials a hand would have captured — drawn until
   *  a case hands it a row, which is what a part is until one is written (0176, 0188). */
  let minted = 0;
  const part = (length: number, over: Partial<PartVoice> = {}): SongPart => {
    minted++;
    return {
      id: `part-${minted}`,
      name: `part-${minted}`,
      skip: false,
      voice: { ...partVoice(PLAYER_DEFAULTS), ...over },
      length,
      steps: [],
    };
  };

  it("lands on the cells the row names, in their order and round and round", () => {
    const written = { ...part(8), steps: WALKED };
    const steps = playerSequence(spec([written]), 8);
    expect(steps.map((step) => step.slot)).toEqual([5, 2, 9, 5, 2, 9, 5, 2]);
    // And every field the cell authors, not just the slot: the ×n is the count and the gap after
    // it is the wait, in place of the two draws that would have rolled them.
    expect(steps.map((step) => step.repeats)).toEqual([3, 1, 7, 3, 1, 7, 3, 1]);
    expect(steps.map((step) => step.rest)).toEqual([0, 2, 1, 0, 2, 1, 0, 2]);
  });

  /**
   * A written row is the part's, so it starts again with the part and never runs on into the next
   * one — and a drawn part after a written one carries on from wherever the row left the walk,
   * because the slot is the one thing a part inherits (0184's argument, said for the row).
   */
  it("starts the row again at each part and hands a drawn part the slot it left", () => {
    const written = { ...part(2), steps: WALKED };
    const drawn = part(2);
    const steps = playerSequence(spec([written, drawn]), 8);
    // Two jumps of the row, twice: the second round opens on the row's own first cell rather than
    // on the cell the first round had reached.
    expect(steps.map((step) => step.slot).filter((_, at) => at % 4 < 2)).toEqual([5, 2, 5, 2]);
    // And the drawn part's first jump is a jump from where the row stopped, not from the top.
    expect(steps[2]?.slot).not.toBe(5);
  });

  /**
   * The one that would be a silent regression: a part with no row is drawn exactly as it was
   * before a row could be written, down to the stream — no draw is taken for a cell nobody wrote
   * and none is skipped for one nobody read (0096, 0188).
   */
  it("draws a part nobody wrote exactly as it drew one before rows existed", () => {
    const held = [part(3, { repeats: 6 }), part(3, { repeats: 2 })];
    const written = held.map((one) => ({ ...one, steps: [] }));
    expect(playerSequence(spec(written), 24)).toEqual(playerSequence(spec(held), 24));
  });
});
