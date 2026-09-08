/**
 * @role The durable shape of a motion: projected with its owner, validated by the one validator,
 *   and refused beside a lane on the same key (0309). Beside src/state/session.test.ts, which is
 *   at the hard cap, over the same fixture.
 */
import { describe, expect, it } from "vitest";

import { patchDeck, createSessionStore } from "./store";
import { validateSession, sessionSnapshot } from "./session";
import { instance } from "./session.test";

describe("motion session validation", () => {
  it("carries a motion on the deck and on an instance, and refuses one beside a lane", () => {
    const store = createSessionStore();
    const pulse = { character: "pulse", seed: 3 } as const;
    patchDeck(store, "a", {
      motion: { "deck.pan": { character: "smooth", seed: 9 } },
      effects: [instance("flt", "filter", { motion: { "filter.cutoff": pulse } })],
    });
    const durable = sessionSnapshot(store.getState());
    expect(durable.decks.a!.motion).toEqual({ "deck.pan": { character: "smooth", seed: 9 } });
    expect(durable.decks.a!.effects[0]?.motion).toEqual({ "filter.cutoff": pulse });
    expect(validateSession(durable)).toEqual(durable);

    const withDeck = (motion: unknown, automation: unknown = {}) =>
      validateSession({
        ...durable,
        decks: { ...durable.decks, a: { ...durable.decks.a!, motion, automation } },
      });
    // A key holds a lane or a motion, never both (0309).
    expect(() => withDeck({ "deck.gain": pulse }, { "deck.gain": [{ at: 0, value: 1 }] })).toThrow(
      /also holds a lane/u,
    );
    expect(() => withDeck({ "deck.speed": pulse })).toThrow(/unsupported param/u);
    expect(() => withDeck({ "deck.gain": { character: "wobble", seed: 1 } })).toThrow(/character/u);
    expect(() => withDeck({ "deck.gain": { ...pulse, amount: 1 } })).toThrow(/keys/u);
    expect(() => withDeck({ "deck.gain": null })).toThrow(/is null/u);
    expect(() =>
      validateSession({
        ...durable,
        decks: {
          ...durable.decks,
          a: {
            ...durable.decks.a!,
            effects: [
              {
                ...durable.decks.a!.effects[0]!,
                automation: { "filter.cutoff": [{ at: 0, value: 400 }] },
              },
            ],
          },
        },
      }),
    ).toThrow(/also holds a lane/u);
  });
});
