import { describe, expect, it } from "vitest";
import { TONE_REF_HZ } from "@/lib/waveform";
import { EFFECTS } from "./effects/registry";
import {
  AUTOMATION_PARAM_IDS,
  DECK_PARAM_DEFAULTS,
  DECK_PARAM_IDS,
  effectParamDefaults,
  instanceHalf,
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
    expect(effectParamDefaults("delay", "d1")).toEqual({
      "delay.time": 0.25,
      "delay.feedback": 0.35,
      "delay.mix": 0.25,
    });
  });

  // A seed is which run this is, so two automators added the same afternoon are two runs — and
  // the same file replayed is the same pair of them, because the draw is the id's and not a
  // `Math.random()` at the moment of the add (0076, 0089).
  it("draws a seeded parameter from the instance's own id rather than from its default", () => {
    const one = effectParamDefaults("automator", "a1")["auto.seed"];
    const two = effectParamDefaults("automator", "a2")["auto.seed"];
    expect(one).not.toBe(two);
    expect(effectParamDefaults("automator", "a1")["auto.seed"]).toBe(one);
    const seed = PARAMS["auto.seed"];
    expect(one).toBeGreaterThanOrEqual(seed.min);
    expect(one).toBeLessThanOrEqual(seed.max);
    // Every other parameter of the same entry is still exactly what its plugin declared.
    expect(effectParamDefaults("automator", "a1")["auto.count"]).toBe(PARAMS["auto.count"].default);
  });

  it("declares the tone's pitch once, as the deck's own parameter in hertz", () => {
    // The pitch left the stored SourceRef and is a deck parameter like any other (0110): declared
    // here, and therefore in the knob row, in a clip and in the archive with no second path.
    expect(PARAMS["deck.tone"]).toMatchObject({
      label: "Tone",
      default: TONE_REF_HZ,
      curve: "log",
    });
    expect(PARAM_IDS.filter((id) => id === "deck.tone")).toEqual(["deck.tone"]);
    expect(paramOwner("deck.tone")).toBeNull();
    // A ratio of one at its default, so every deck carries the value and only a tone hears it.
    expect(DECK_PARAM_DEFAULTS["deck.tone"]).toBe(TONE_REF_HZ);
    expect(PARAMS["deck.tone"].min).toBeGreaterThan(0);
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
      "tape.time",
      "tape.feedback",
      "tape.tone",
      "tape.wow",
      "tape.amount",
      "pop.lift",
      "pop.snap",
      "pop.width",
      "pop.sheen",
      "pop.mix",
    ]);
    // The complement, stated as itself: the rate is what stays out, and it is one exclusion rather
    // than three, because speed, pitch and a tone's own hertz are all the one read rate the
    // buffer source is played at (0031, 0110)— plus the
    // compressor's envelope shape, which is set for a source rather than performed, and the two
    // numbers the reverb's impulse is a function of, whose move is a rebuild and not a ramp
    // (0087) — plus the tape's drive and hiss, which are the condition of the machine rather
    // than a gesture over it: a head is worn and a tape is noisy, and neither is performed.
    expect(PARAM_IDS.filter((id) => PARAMS[id].automation === undefined)).toEqual([
      "deck.speed",
      "deck.pitch",
      "deck.tone",
      "comp.attack",
      "comp.release",
      "comp.knee",
      "reverb.decay",
      "reverb.tone",
      "tape.drive",
      "tape.hiss",
      // And the whole of the automator, which performs rather than being performed: its seed says
      // which run this is, its weights are the shape of a pool, and a lane on any of them would be
      // a gesture over the thing already making the gestures (0204).
      "auto.seed",
      "auto.count",
      "auto.stays",
      "auto.fade",
      "auto.drift",
      "auto.wander",
      "auto.filter",
      "auto.delay",
      "auto.eq",
      "auto.compressor",
      "auto.reverb",
      "auto.tape",
      "auto.pop",
    ]);
  });

  it("names every lane distinctly, so no two are one word", () => {
    // The rule five plugins each wrote down for the next one's author. The registry is loaded by
    // this import, so a sixth plugin reusing "Mix" throws before this assertion runs — the count
    // is what says the rule is still being asked.
    const labels = AUTOMATION_PARAM_IDS.map((id) => PARAMS[id].label);
    expect(new Set(labels).size).toBe(AUTOMATION_PARAM_IDS.length);
  });

  it("leaves the instance off a deck parameter's command rather than sending it empty", () => {
    // Absent, not present-and-undefined: the wire check and the durable shape both read the key's
    // presence, and four surfaces used to spell this ternary out for themselves (0030).
    expect(Object.hasOwn(instanceHalf(), "instance")).toBe(false);
    expect(instanceHalf("delay-1")).toEqual({ instance: "delay-1" });
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
