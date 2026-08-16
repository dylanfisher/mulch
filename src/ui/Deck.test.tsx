import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The four hooks the deck itself calls, made callable outside a renderer so the gesture tests
// below can hold the element tree and press it. Each stands in for exactly what a first render
// does, so the server renders in this file see the same markup they always did.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    useState: (initial: unknown) => [initial, () => {}],
    useSyncExternalStore: (_subscribe: unknown, read: () => unknown) => read(),
  };
});

import { manualClock } from "@/app/clock";
import { silentEngine } from "@/app/engineDouble";
import { createInstrument } from "@/app/facade";
import type { SessionRepository } from "@/state/repository";
import { Deck, importDeckFile } from "@/ui/Deck";

/**
 * The smallest engine a `deck.load` needs: it reports the duration the generator asked for, so
 * the session records the load and the deck renders what it is holding. Nothing else is reached
 * from a server render — peek and the canvas are effects, which never run here.
 */
const stubEngine = () => silentEngine();

const render = (source?: { gen: "click-train" | "noise"; secs: number; hz?: number }) => {
  const instrument = createInstrument(manualClock(), stubEngine);
  if (source !== undefined) instrument.send({ t: "deck.load", deck: "a", source });
  return renderToStaticMarkup(<Deck instrument={instrument} deck="a" active />);
};

const renderEffects = (setup?: (instrument: ReturnType<typeof createInstrument>) => void) => {
  const instrument = createInstrument(manualClock(), stubEngine);
  setup?.(instrument);
  return renderToStaticMarkup(<Deck instrument={instrument} deck="a" active />);
};

/**
 * The load arguments the UI has to be able to reach: a deck that can only make 4-second sources
 * at the default frequency is a deck an agent can drive further than a person can (plan §4).
 */
describe("Deck load fields", () => {
  it("names the deck it is holding without a select button to press", () => {
    const markup = render({ gen: "click-train", secs: 2, hz: 8 });
    // Touching the panel is the selection gesture, so there is no control for it (P16). The
    // name truncates on one line and carries its full text as the title beside it.
    expect(markup).not.toContain("Select deck a");
    expect(markup).toMatch(/title="click-train · 2.00s"[^>]*>click-train/u);
    expect(markup).toContain("truncate");
  });

  it("offers the length of a load, disabled until something is loaded", () => {
    const markup = render();
    expect(markup).toMatch(/id="a-secs" disabled=""/u);
    // The bound comes from the generators themselves, so the field offers what a load accepts.
    expect(markup).toMatch(/id="a-secs"[^>]*min="0.000125"/u);
    expect(markup).toMatch(/id="a-secs"[^>]*max="60"/u);
    expect(markup).not.toContain('id="a-hz"');
  });

  it("reads back the length and frequency the load actually carried", () => {
    const markup = render({ gen: "click-train", secs: 2, hz: 8 });
    expect(markup).toMatch(/id="a-secs" type="number"[^>]*value="2"/u);
    expect(markup).toMatch(/id="a-hz"[^>]*value="8"/u);
  });

  it("offers no frequency for a generator that has none", () => {
    expect(render({ gen: "noise", secs: 2 })).not.toContain('id="a-hz"');
  });

  it("shows the effective default rather than a zero frequency sentinel", () => {
    expect(render({ gen: "click-train", secs: 2, hz: 0 })).toMatch(/id="a-hz"[^>]*value="4"/u);
  });
});

describe("Deck effect rack", () => {
  it("offers every registered effect and shows no controls for an empty rack", () => {
    const markup = renderEffects();
    expect(markup).toContain("add Filter");
    expect(markup).toContain("add Delay");
    expect(markup).not.toContain('aria-label="Cutoff"');
    expect(markup).not.toContain('aria-label="Time"');
    expect(markup).not.toContain('aria-label="Feedback"');
    expect(markup).not.toContain('aria-label="Mix"');
  });

  it("renders active controls in rack order from registry labels and ranges", () => {
    const markup = renderEffects((instrument) => {
      instrument.send({ t: "effect.add", deck: "a", id: "flt", effect: "filter" });
      instrument.send({ t: "effect.add", deck: "a", id: "dly", effect: "delay" });
      instrument.send({
        t: "param.set",
        deck: "a",
        instance: "dly",
        param: "delay.mix",
        value: 0.7,
      });
    });

    // Slots are numbered by position, because two of one effect would otherwise be one name.
    expect(markup.indexOf('aria-label="Filter 1"')).toBeLessThan(
      markup.indexOf('aria-label="Delay 2"'),
    );
    // The add buttons never run out: a rack holds any number of instances of one entry (0030).
    expect(markup).toContain("add Filter");
    expect(markup).toContain("add Delay");
    expect(markup).toMatch(
      /aria-label="Cutoff"[^>]*aria-valuemin="20"[^>]*aria-valuemax="20000"[^>]*aria-valuenow="1000"/u,
    );
    expect(markup).toMatch(/aria-label="Mix"[^>]*aria-valuenow="0.7"/u);
  });
});

describe("Deck automation", () => {
  it("puts automation on the knob itself, with no lane editor or picker beside it (0028)", () => {
    const markup = render();
    expect(markup).toContain('aria-label="Gain"');
    // The lane preview, its picker and its point gestures are gone: a knob is the whole
    // affordance, and what it is holding is drawn on the knob (0028).
    expect(markup).not.toContain("Draw Deck a Gain automation");
    expect(markup).not.toContain('aria-label="Deck a automation target"');
    expect(markup).not.toContain("Automate Gain");
  });
});

describe("Deck file import", () => {
  it("ingests once and loads only the returned blob id", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "sample.wav", { type: "audio/wav" });
    const ingested: File[] = [];
    const repository: SessionRepository = {
      load: () => Promise.resolve(),
      save: () => Promise.resolve(),
      ingest: (received) => {
        ingested.push(received);
        return Promise.resolve("stored-id");
      },
      blob: () => Promise.resolve(file),
      blobs: () => Promise.resolve(new Map()),
      replace: () => Promise.resolve(),
    };
    const instrument = createInstrument(manualClock(), stubEngine, repository);
    await instrument.ready;

    await importDeckFile(instrument, "a", file);
    await Promise.resolve();

    expect(ingested).toEqual([file]);
    expect(instrument.probe().decks.a!.source).toEqual({ blobId: "stored-id" });
  });
});

type Props = { onPointerDownCapture?: () => void };

/** One deck's element tree, held rather than serialised, so its own handler can be pressed. */
const panel = (active: boolean) => {
  const instrument = createInstrument(manualClock(), stubEngine);
  const sent = vi.spyOn(instrument, "send");
  const root = Deck({ instrument, deck: "a", active });
  if (!isValidElement<Props>(root)) throw new Error("deck rendered no panel");
  return { instrument, sent, props: root.props };
};

/** Selection is what a pointer lands on, not a button beside it (0019, P16). */
describe("Deck activation", () => {
  it("sends deck.activate when a press lands inside an inactive deck", () => {
    const { instrument, sent, props } = panel(false);
    sent.mockClear();

    props.onPointerDownCapture?.();

    expect(sent).toHaveBeenCalledWith({ t: "deck.activate", deck: "a" });
    expect(instrument.probe().activeDeck).toBe("a");
  });

  it("sends nothing when the press lands inside the deck already active", () => {
    const { sent, props } = panel(true);
    sent.mockClear();

    props.onPointerDownCapture?.();

    expect(sent).not.toHaveBeenCalled();
  });
});
