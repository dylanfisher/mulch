/**
 * @role What the Move To menu lists and what one of its items sends: every rack the session holds
 *   but the one the card is on, and one `effect.move` per press (0320).
 * @instead The rest of a card's head — the die, the copy, the bin and the switch →
 *   src/ui/EffectRack.test.tsx, which this stands beside rather than inside because that file is
 *   at the hard cap docs/map.md sets (0045).
 */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { MASTER_LABEL, MOVE_TO_LABEL } from "@/lib/copy";
import type { RackId } from "@/state/store";
import { EffectMove } from "@/ui/EffectMove";
import { findLabelled, type Labelled } from "@/ui/effectRackDouble";

/** The menu as a held tree, built inside a render of its own so its hooks run where hooks run. */
const menu = (
  instrument: ReturnType<typeof createInstrument>,
  deck: RackId,
  instance = "one",
): ReactNode => {
  let tree: ReactNode = null;
  function Probe(): null {
    tree = EffectMove({ instrument, deck, instance, label: "Filter 1" });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return tree;
};

const item = (tree: ReactNode, label: string): Labelled => {
  const found = findLabelled(tree, label);
  if (found === null) throw new Error(`no item labelled ${label}`);
  return found;
};

/** Two yards, so a card on one of them has a yard and the master to be carried to. */
const twoYards = () => {
  const instrument = createInstrument(manualClock());
  instrument.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });
  instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "eq" });
  return instrument;
};

describe("carrying a card to another rack", () => {
  it("lists every rack the session holds but the one the card is on", () => {
    const tree = menu(twoYards(), "a");
    expect(findLabelled(tree, `${MOVE_TO_LABEL} North Willow`)).not.toBeNull();
    expect(findLabelled(tree, `${MOVE_TO_LABEL} ${MASTER_LABEL}`)).not.toBeNull();
    // The rack the card is standing on is the one address the menu never offers: a move into it
    // is `effect.reorder`, and the reducer refuses it (0320).
    const own = createInstrument(manualClock()).state.getState().deckList[0]!;
    expect(findLabelled(tree, `${MOVE_TO_LABEL} ${own.name}`)).toBeNull();
  });

  it("sends one effect.move naming both racks and the card it sits on", () => {
    const instrument = twoYards();
    const sent = vi.spyOn(instrument, "send");
    item(menu(instrument, "a"), `${MOVE_TO_LABEL} ${MASTER_LABEL}`).onClick?.();

    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({ t: "effect.move", from: "a", to: null, instance: "one" }),
    );
  });

  it("carries a card on the master onto a yard, by that yard's own name", () => {
    const instrument = twoYards();
    const sent = vi.spyOn(instrument, "send");
    item(menu(instrument, null), `${MOVE_TO_LABEL} North Willow`).onClick?.();

    expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({ t: "effect.move", from: null, to: "b", instance: "one" }),
    );
  });

  it("draws nothing on the master's own card when the session holds no yards", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "deck.remove", deck: "a" });
    expect(menu(instrument, null)).toBeNull();
  });
});
