/** @role What the four transport states look like, and which command each button sends. */
import { isValidElement, type ReactElement } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The one hook this row calls, made callable outside a renderer so a button's own handler can be
// pressed. It stands in for exactly what a first render does, as src/ui/Deck.test.tsx does.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import type { DeckState } from "@/state/store";
import { DeckTransport } from "@/ui/DeckTransport";

/** A loaded deck in one of its three transport states — the only fields these buttons read. */
const deckState = (over: Partial<DeckState>): DeckState => {
  const state = createInstrument(manualClock()).state.getState().decks.a!;
  return { ...state, duration: 2, ...over };
};

const markupOf = (over: Partial<DeckState>): string => {
  const instrument = createInstrument(manualClock());
  return renderToStaticMarkup(
    <DeckTransport instrument={instrument} deck="a" state={deckState(over)} />,
  );
};

/** The buttons themselves, so the command each one sends can be pressed rather than inspected. */
const pressed = (over: Partial<DeckState>, label: string) => {
  const instrument = createInstrument(manualClock());
  const sent = vi.spyOn(instrument, "send");
  const row = DeckTransport({ instrument, deck: "a", state: deckState(over) });
  if (!isValidElement<{ children: ReactElement[] }>(row)) throw new Error("no transport row");
  const button = row.props.children.find(
    (child) => isValidElement<{ children: string }>(child) && child.props.children === label,
  );
  if (!isValidElement<{ onClick: () => void }>(button)) throw new Error(`no ${label} button`);
  button.props.onClick();
  return sent;
};

describe("the deck transport", () => {
  it("reads play when stopped and pause when playing — one button, one toggle", () => {
    expect(markupOf({})).toMatch(/aria-pressed="false"[^>]*>play</u);
    expect(markupOf({ playing: true })).toMatch(/aria-pressed="true"[^>]*>pause</u);
  });

  it("offers stop to a deck with a playhead to send home, playing or merely held (0038)", () => {
    // A stopped deck has nothing to rewind, so the control does not offer it. A held one does:
    // pause is the only state in which stop is the *other* half of what a press could mean.
    expect(markupOf({})).toMatch(/disabled=""[^>]*>stop</u);
    expect(markupOf({ paused: 1.25 })).not.toMatch(/disabled=""[^>]*>stop</u);
    expect(markupOf({ playing: true })).not.toMatch(/disabled=""[^>]*>stop</u);
  });

  it("offers crop only to a deck that has a loop to crop to", () => {
    // Nothing to cut down to is the whole reason: the command refuses a deck with no loop, and
    // the control says so before the press rather than after it.
    expect(markupOf({})).toMatch(/disabled=""[^>]*>crop</u);
    expect(markupOf({ loop: { in: 0, out: 1 } })).not.toMatch(/disabled=""[^>]*>crop</u);
  });

  it("sends the ordinary command each gesture means", () => {
    expect(pressed({ playing: true }, "pause")).toHaveBeenCalledWith({
      t: "deck.play.toggle",
      deck: "a",
    });
    expect(pressed({ paused: 1.25 }, "stop")).toHaveBeenCalledWith({ t: "deck.stop", deck: "a" });
    expect(pressed({}, "loop")).toHaveBeenCalledWith({ t: "deck.loop.toggle", deck: "a" });
    // The blob id is minted at the gesture, so only its shape can be asserted from here.
    const cropped = pressed({ loop: { in: 0, out: 1 } }, "crop").mock.calls[0]?.[0];
    if (cropped === undefined || "cmd" in cropped || cropped.t !== "deck.crop") {
      throw new Error(`the crop button sent ${JSON.stringify(cropped)}`);
    }
    expect(cropped.deck).toBe("a");
    expect(cropped.id.length).toBeGreaterThan(0);
  });
});
