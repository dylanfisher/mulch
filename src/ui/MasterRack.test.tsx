/**
 * @role How the master's rack mounts: shut over nothing, open over anything, and whatever a hand
 *   last left it as before either (0392).
 */
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import { silentEngine } from "@/app/engineDouble";
import { createInstrument } from "@/app/facade";
import { EFFECTS_LABEL, MASTER_LABEL } from "@/lib/copy";
import { labels } from "@/ui/effectRackDouble";

/**
 * The master's rack over a session holding this many effects on it, rendered from a fresh module
 * graph so the fold this mount reads is the one this case put in the store and no other's.
 */
async function markup(effects: number, saved?: string): Promise<string> {
  if (saved !== undefined) vi.stubGlobal("localStorage", { getItem: () => saved, setItem() {} });
  vi.resetModules();
  const { MasterRack } = await import("@/ui/MasterRack");
  const instrument = createInstrument(manualClock(), () => silentEngine());
  for (let index = 0; index < effects; index += 1) {
    instrument.send({ t: "effect.add", deck: null, id: `e${index}`, effect: "delay" });
  }
  return renderToStaticMarkup(<MasterRack instrument={instrument} />);
}

/** The name the rack's own section carries, whoever's rack it is (src/ui/EffectRack.tsx). */
const rackName = `${MASTER_LABEL} ${EFFECTS_LABEL}`;

/** Whether this rack drew its body — the whole of what the fold decides (src/ui/EffectRack.tsx).
 *  The drag's landing slot rather than a card, because an open rack holding nothing has no card
 *  and is still open. */
const open = (rack: string): boolean => rack.includes('data-slot="rack-landing"');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock("react");
  vi.resetModules();
});

describe("the master's rack", () => {
  it("names the rack it is, whichever way it is folded", async () => {
    expect(labels(await markup(0))).toContain(rackName);
    expect(labels(await markup(1))).toContain(rackName);
  });

  it("mounts shut over a rack holding nothing", async () => {
    expect(open(await markup(0))).toBe(false);
  });

  it("mounts open over a rack holding one entry", async () => {
    expect(open(await markup(1))).toBe(true);
  });

  it("mounts the way it was last left, over a rack holding something", async () => {
    expect(open(await markup(1, "shut"))).toBe(false);
  });

  it("mounts the way it was last left, over a rack holding nothing", async () => {
    expect(open(await markup(0, "open"))).toBe(true);
  });

  /**
   * A master dial sends on every pointer move, and the rack re-rendered inside each move is what a
   * hand feels as a stuttering dial — so the cards draw what a transition has, one commit behind,
   * as a yard's rack does (0307). Held back by hand: the deferred rack has the delay's Mix where
   * the hand left it a move ago.
   */
  it("draws its cards one transition behind the store", async () => {
    const instrument = createInstrument(manualClock(), () => silentEngine());
    instrument.send({ t: "effect.add", deck: null, id: "dly", effect: "delay" });
    instrument.send({
      t: "param.set",
      deck: null,
      instance: "dly",
      param: "delay.mix",
      value: 0.7,
    });
    const behind = structuredClone(instrument.state.getState().master.effects);
    for (const entry of behind) entry.params["delay.mix"] = 0.2;
    vi.resetModules();
    vi.doMock("react", async (importOriginal) => ({
      ...(await importOriginal<typeof ReactTypes>()),
      useDeferredValue: () => behind,
    }));
    const { MasterRack } = await import("@/ui/MasterRack");
    const rack = renderToStaticMarkup(<MasterRack instrument={instrument} />);
    expect(rack).toMatch(/aria-label="Mix"[^>]*aria-valuenow="0.2"/u);
  });
});
