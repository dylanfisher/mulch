import { describe, expect, it } from "vitest";
import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { mintClipName } from "@/lib/copy";
import { addYardCommand, captureClipCommand, duplicateYardCommand } from "@/ui/actions";

/**
 * The seam P55 is about: the gesture draws the next letter from what the session has spent, and
 * the session spends a letter the moment a deck is added. A letter someone has already said out
 * loud must not come back meaning a different yard, so a remove frees nothing.
 */
describe("the next yard's letter", () => {
  it("lands on C after add, remove, add", () => {
    const instrument = createInstrument(manualClock());
    const spent = () => instrument.state.getState().spentDeckIds;

    const first = addYardCommand(spent());
    expect(first).toMatchObject({ t: "deck.add", deck: "b" });
    instrument.send(first);
    instrument.send({ t: "deck.remove", deck: "b" });
    // The session holds A alone again, and B is free by every reading but the one that counts.
    expect(instrument.state.getState().deckList.map(({ id }) => id)).toEqual(["a"]);
    expect(addYardCommand(spent())).toMatchObject({ t: "deck.add", deck: "c" });
  });

  it("is drawn from the same spent list by a duplicate", () => {
    const instrument = createInstrument(manualClock());
    const spent = () => instrument.state.getState().spentDeckIds;

    instrument.send(addYardCommand(spent()));
    instrument.send({ t: "deck.remove", deck: "b" });
    expect(duplicateYardCommand(instrument.state.getState(), "a")).toMatchObject({
      t: "deck.duplicate",
      deck: "a",
      to: "c",
    });
  });

  /**
   * An undo rewinds the session to a checkpoint that predates the draw, so the letter would come
   * back with it if the store took the checkpoint's spent list whole. It does not: the spent list
   * is the one field a whole-session write unions rather than replaces (0082).
   */
  it("stays spent through an undo of the add that drew it", async () => {
    const instrument = createInstrument(manualClock());
    const spent = () => instrument.state.getState().spentDeckIds;

    instrument.send(addYardCommand(spent()));
    instrument.send({ t: "history.undo" });
    // One macrotask, which is past every microtask the facade's serialized history chain holds.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(instrument.state.getState().deckList.map(({ id }) => id)).toEqual(["a"]);
    expect(addYardCommand(spent())).toMatchObject({ t: "deck.add", deck: "c" });
  });
});

describe("a fresh clip's name", () => {
  /** The noun and its ordinal come from the one file the instrument's nouns are minted in. */
  it("is minted where a yard's name is minted, not at the surface that sends the command", () => {
    expect(captureClipCommand([], "a")).toMatchObject({ name: mintClipName(0) });
    expect(mintClipName(0)).toBe("clip 1");
  });
});
