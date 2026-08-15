import { describe, expect, it } from "vitest";
import { EFFECTS } from "./effects/registry";
import {
  AUTOMATION_PARAM_IDS,
  DECK_PARAM_IDS,
  PARAM_DEFAULTS,
  PARAM_IDS,
  PARAMS,
  paramOwner,
  paramReachable,
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
    expect(AUTOMATION_PARAM_IDS).toEqual(["deck.gain", "filter.cutoff", "eq.frequency", "eq.gain"]);
    expect(PARAMS["deck.gain"].automation).toBe("linear");
    expect(PARAMS["filter.cutoff"].automation).toBe("linear");
    // The EQ's frequency and gain opt in separately, so either can be performed without the other.
    expect(PARAMS["eq.frequency"].automation).toBe("linear");
    expect(PARAMS["eq.gain"].automation).toBe("linear");
    // Opted in one entry at a time: the rest of the registry stays out until it is performed.
    expect(PARAM_IDS.filter((id) => PARAMS[id].automation === undefined)).toEqual([
      "deck.pan",
      "delay.time",
      "delay.feedback",
      "delay.mix",
      "eq.q",
    ]);
  });

  it("reaches an effect's parameter only from a deck whose rack holds that effect", () => {
    expect(paramReachable([], "deck.gain")).toBe(true);
    expect(paramReachable(["delay"], "filter.cutoff")).toBe(false);
    expect(paramReachable(["filter", "delay"], "filter.cutoff")).toBe(true);
    expect(paramOwner("deck.gain")).toBeNull();
    expect(paramOwner("filter.cutoff")).toBe("filter");
    expect(paramOwner("eq.frequency")).toBe("eq");
  });
});

describe("the parametric EQ's registry entry", () => {
  it("registers all three parameters entirely from its plugin declaration", () => {
    expect(PARAMS["eq.frequency"]).toMatchObject({
      label: "Freq",
      min: 20,
      max: 20_000,
      default: 1_000,
      curve: "log",
    });
    expect(PARAMS["eq.gain"]).toMatchObject({ label: "EQ Gain", min: -24, max: 24, default: 0 });
    expect(PARAMS["eq.q"]).toMatchObject({ label: "Q", min: 0.1, max: 18, default: 1 });
    // Every automation target's label is what the picker and its aria-label say, so two targets
    // sharing one would be two lanes nobody could tell apart.
    const labels = AUTOMATION_PARAM_IDS.map((id) => PARAMS[id].label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
