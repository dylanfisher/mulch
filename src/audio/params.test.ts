import { describe, expect, it } from "vitest";
import { EFFECTS } from "./effects/registry";
import {
  AUTOMATION_PARAM_IDS,
  DECK_PARAM_DEFAULTS,
  DECK_PARAM_IDS,
  effectParamDefaults,
  PARAM_IDS,
  PARAMS,
  paramOwner,
  paramReachable,
} from "./params";

// oxlint-disable-next-line max-lines-per-function
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

  it("derives a deck's defaults and an instance's from that same lookup", () => {
    expect(DECK_PARAM_DEFAULTS).toEqual(
      Object.fromEntries(DECK_PARAM_IDS.map((id) => [id, PARAMS[id].default])),
    );
    // An instance starts from its own plugin's declarations and holds nothing else: a second
    // delay is a second set of these numbers, not a share of the deck's (0030).
    expect(effectParamDefaults("delay")).toEqual({
      "delay.time": 0.25,
      "delay.feedback": 0.35,
      "delay.mix": 0.25,
    });
  });

  it("derives every automation target from the registry, deck and effect alike", () => {
    expect(AUTOMATION_PARAM_IDS).toEqual([
      "deck.gain",
      "deck.pan",
      "filter.cutoff",
      "delay.time",
      "delay.feedback",
      "delay.mix",
      "eq.frequency",
      "eq.gain",
      "eq.q",
      "comp.threshold",
      "comp.ratio",
      "comp.output",
      "reverb.predelay",
      "reverb.wet",
    ]);
    // The complement, stated as itself: the rate is what stays out, and it is one exclusion rather
    // than two, because speed and pitch are both the buffer source's read rate (0031) — plus the
    // compressor's envelope shape, which is set for a source rather than performed, and the two
    // numbers the reverb's impulse is a function of, whose move is a rebuild and not a ramp
    // (0087).
    expect(PARAM_IDS.filter((id) => PARAMS[id].automation === undefined)).toEqual([
      "deck.speed",
      "deck.pitch",
      "comp.attack",
      "comp.release",
      "comp.knee",
      "reverb.decay",
      "reverb.tone",
    ]);
  });

  it("reaches a value only through the instance that holds it", () => {
    const rack = [
      { id: "one", effect: "filter" },
      { id: "two", effect: "delay" },
    ] as const;
    expect(paramReachable([], null, "deck.gain")).toBe(true);
    // A deck parameter belongs to no instance, and an effect's belongs to no deck (0030).
    expect(paramReachable(rack, "one", "deck.gain")).toBe(false);
    expect(paramReachable(rack, null, "filter.cutoff")).toBe(false);
    // The pair is the lookup: the right parameter on the wrong instance is not reachable.
    expect(paramReachable(rack, "two", "filter.cutoff")).toBe(false);
    expect(paramReachable(rack, "one", "filter.cutoff")).toBe(true);
    expect(paramReachable(rack, "missing", "filter.cutoff")).toBe(false);
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
