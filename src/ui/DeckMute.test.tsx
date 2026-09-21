/**
 * @role Whether a yard is heard, as the control that says so: what the press sends, and what the
 *   control says the yard is (0386).
 * @instead What the command then does → src/app/deckHeader.test.ts. The stop beside it, which is
 *   a different gesture → ./DeckTransport.test.tsx.
 */
import type { ReactNode } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { DeckMute } from "@/ui/DeckMute";
import { findLabelled } from "@/ui/effectRackDouble";

const rendered = (muted: boolean) => {
  const instrument = createInstrument(manualClock());
  const sent = vi.spyOn(instrument, "send");
  const root: ReactNode = DeckMute({ instrument, deck: "a", muted });
  const toggle = findLabelled(root, "Mute Yard A");
  if (toggle === null) throw new Error("no mute control");
  return { instrument, sent, toggle };
};

describe("DeckMute", () => {
  it("says whether the yard is heard as the state it is pressed into", () => {
    expect(rendered(false).toggle.pressed).toBe(false);
    expect(rendered(true).toggle.pressed).toBe(true);
  });

  it("sends the state it is moving to, never a toggle the wire has to work out", () => {
    const { instrument, sent, toggle } = rendered(false);
    toggle.onPressedChange?.(true);
    expect(sent).toHaveBeenCalledWith({ t: "deck.mute", deck: "a", muted: true });
    expect(instrument.probe().decks.a?.muted).toBe(true);

    const heard = rendered(true);
    heard.toggle.onPressedChange?.(false);
    expect(heard.sent).toHaveBeenCalledWith({ t: "deck.mute", deck: "a", muted: false });
    expect(heard.instrument.probe().decks.a?.muted).toBe(false);
  });

  it("is never a stop: the yard it silences is not asked to stop playing", () => {
    const { sent, toggle } = rendered(false);
    toggle.onPressedChange?.(true);
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent).not.toHaveBeenCalledWith(expect.objectContaining({ t: "deck.stop" }));
  });
});
