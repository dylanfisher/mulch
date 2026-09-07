/**
 * @role The one claim about how a yard is drawn in time: its heavy surfaces follow the store one
 *   transition behind while its header answers it at once (0307). Beside src/ui/Deck.test.tsx,
 *   which holds every other case about the yard and is at its cap.
 */
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/** What `useDeferredValue` hands back: the transition held visibly behind, by hand. */
const view = vi.hoisted(() => ({ deferred: null as unknown }));

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useDeferredValue: (value: unknown) => view.deferred ?? value,
    // A server render reads the store the way React would there (src/ui/Deck.test.tsx).
    useSyncExternalStore: (_subscribe: unknown, read: () => unknown, readServer?: () => unknown) =>
      (readServer ?? read)(),
  };
});

import { manualClock } from "@/app/clock";
import { silentEngine } from "@/app/engineDouble";
import { createInstrument } from "@/app/facade";
import { GEN_SECS } from "@/lib/waveform";
import { Deck } from "@/ui/Deck";
import { secondsLabel } from "@/ui/Knob";

/** An inert grip: the yard's own list owns the gesture, and no case here is about it (0111). */
const HANDLE = { onPointerDown: () => {}, onKeyDown: () => {} };

describe("Deck follows in a transition", () => {
  /**
   * A knob turned on the yard commits on every pointer move, and the yard re-rendered inside each
   * move is what a hand feels as a stuttering dial. So the surfaces that cost — the knob row, the
   * drift, the jumps card and the rack — draw the deck as a transition has it, one commit behind,
   * while the header and the transport answer the store at once (0307). Held back by hand here:
   * the deferred deck is the same yard with its rack's Mix and its own Gain where the hand left
   * them a move ago, and nothing loaded.
   */
  it("draws the rack and the knob row one transition behind the header", () => {
    const instrument = createInstrument(manualClock(), () => silentEngine());
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine" } });
    instrument.send({ t: "effect.add", deck: "a", id: "dly", effect: "delay" });
    instrument.send({ t: "param.set", deck: "a", instance: "dly", param: "delay.mix", value: 0.7 });
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.4 });
    const now = instrument.state.getState().decks.a;
    if (now === undefined) throw new Error("yard a is missing");
    const behind = structuredClone(now);
    behind.duration = 0;
    behind.params["deck.gain"] = 0.9;
    for (const entry of behind.effects) entry.params["delay.mix"] = 0.2;
    view.deferred = behind;
    try {
      const markup = renderToStaticMarkup(
        <Deck
          instrument={instrument}
          deck="a"
          emoji="🌴"
          name="North Willow"
          active
          handle={HANDLE}
        />,
      );
      expect(markup).toMatch(/aria-label="Mix"[^>]*aria-valuenow="0.2"/u);
      expect(markup).toMatch(/aria-label="Gain"[^>]*aria-valuenow="0.9"/u);
      expect(markup).toContain(secondsLabel(GEN_SECS));
    } finally {
      view.deferred = null;
    }
  });
});
