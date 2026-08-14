import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import type { Engine } from "@/app/engine";
import { createInstrument } from "@/app/facade";
import { Deck } from "@/ui/Deck";

/**
 * The smallest engine a `deck.load` needs: it reports the duration the generator asked for, so
 * the session records the load and the deck renders what it is holding. Nothing else is reached
 * from a server render — peek and the canvas are effects, which never run here.
 */
const stubEngine = (): Engine => ({
  load: (_deck, source) => source.secs,
  play: () => {},
  stop: () => {},
  setLoop: () => null,
  setParam: () => {},
  addEffect: () => 0,
  peek: () => {},
  peaks: () => null,
});

const render = (source?: { gen: "click-train" | "noise"; secs: number; hz?: number }) => {
  const instrument = createInstrument(manualClock(), stubEngine);
  if (source !== undefined) instrument.send({ t: "deck.load", deck: "a", source });
  return renderToStaticMarkup(<Deck instrument={instrument} deck="a" />);
};

const renderEffects = (setup?: (instrument: ReturnType<typeof createInstrument>) => void) => {
  const instrument = createInstrument(manualClock(), stubEngine);
  setup?.(instrument);
  return renderToStaticMarkup(<Deck instrument={instrument} deck="a" />);
};

/**
 * The load arguments the UI has to be able to reach: a deck that can only make 4-second sources
 * at the default frequency is a deck an agent can drive further than a person can (plan §4).
 */
describe("Deck load fields", () => {
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
  it("offers every registered inactive effect and no inactive controls", () => {
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
      instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
      instrument.send({ t: "param.set", deck: "a", param: "delay.mix", value: 0.7 });
      instrument.send({ t: "effect.add", deck: "a", effect: "delay" });
    });

    expect(markup.indexOf('aria-label="Filter"')).toBeLessThan(
      markup.indexOf('aria-label="Delay"'),
    );
    expect(markup).not.toContain("add Filter");
    expect(markup).not.toContain("add Delay");
    expect(markup).toMatch(
      /aria-label="Cutoff"[^>]*aria-valuemin="20"[^>]*aria-valuemax="20000"[^>]*aria-valuenow="1000"/u,
    );
    expect(markup).toMatch(/aria-label="Mix"[^>]*aria-valuenow="0.7"/u);
  });
});
