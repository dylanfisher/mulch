import { describe, expect, it } from "vitest";
import { EFFECTS } from "./effects/registry";
import {
  AUTOMATION_PARAM_IDS,
  automationTargets,
  DECK_PARAM_IDS,
  PARAM_DEFAULTS,
  PARAM_IDS,
  PARAMS,
  paramOwner,
} from "./params";

describe("parameter registry", () => {
  it("composes deck and effect declarations into the sole lookup", () => {
    const effectIds = EFFECTS.flatMap((effect) => effect.params.map((param) => param.id));
    expect(PARAM_IDS).toEqual([...DECK_PARAM_IDS, ...effectIds]);
    expect(PARAMS["filter.cutoff"]).toMatchObject({
      label: "Cutoff",
      min: 20,
      max: 20_000,
      default: 1_000,
      curve: "log",
    });
  });

  it("derives every default from that same lookup", () => {
    expect(PARAM_DEFAULTS).toEqual(
      Object.fromEntries(PARAM_IDS.map((id) => [id, PARAMS[id].default])),
    );
    expect(PARAM_DEFAULTS["delay.time"]).toBe(0.25);
    expect(PARAM_DEFAULTS["delay.feedback"]).toBe(0.35);
    expect(PARAM_DEFAULTS["delay.mix"]).toBe(0.25);
  });

  it("derives every automation target from the registry, deck and effect alike", () => {
    expect(AUTOMATION_PARAM_IDS).toEqual(["deck.gain", "filter.cutoff"]);
    expect(PARAMS["deck.gain"].automation).toBe("linear");
    expect(PARAMS["filter.cutoff"].automation).toBe("linear");
    // Opted in one entry at a time: the rest of the registry stays out until it is performed.
    expect(PARAM_IDS.filter((id) => PARAMS[id].automation === undefined)).toEqual([
      "deck.pan",
      "delay.time",
      "delay.feedback",
      "delay.mix",
    ]);
  });

  it("offers an effect's target only to a deck whose rack holds that effect", () => {
    expect(automationTargets([])).toEqual(["deck.gain"]);
    expect(automationTargets(["delay"])).toEqual(["deck.gain"]);
    expect(automationTargets(["filter", "delay"])).toEqual(["deck.gain", "filter.cutoff"]);
    expect(paramOwner("deck.gain")).toBeNull();
    expect(paramOwner("filter.cutoff")).toBe("filter");
  });
});
