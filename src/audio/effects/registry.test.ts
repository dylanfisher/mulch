import { describe, expect, it } from "vitest";
import { FunnelIcon } from "@phosphor-icons/react/Funnel";
import { EFFECT_NAMES } from "@/lib/copy";
import { EFFECTS, effectForParam, validateEffects } from "./registry";
import type { Effect } from "./contract";

const unbuilt = (id: string, param: string): Effect => ({
  id,
  label: id,
  width: "half",
  icon: FunnelIcon,
  params: [{ id: param, label: param, min: 0, max: 1, default: 0, precision: 2 }],
  build: () => {
    throw new Error("not built by registry validation");
  },
});

// One flat list of the registry's contract cases, each a few lines — splitting it would separate
// the rules that hold over the same one list of effects (0007).
// oxlint-disable-next-line max-lines-per-function
describe("effect registry", () => {
  it("contains unique effect and parameter ids", () => {
    expect(() => {
      validateEffects(EFFECTS);
    }).not.toThrow();
    expect(new Set(EFFECTS.map(({ id }) => id)).size).toBe(EFFECTS.length);
  });

  // The picker offers entries by icon and label together, so two entries wearing one picture
  // would be two rows a person has to read twice (0056).
  it("carries a distinct icon per entry", () => {
    expect(new Set(EFFECTS.map(({ icon }) => icon)).size).toBe(EFFECTS.length);
  });

  // The pools live in src/lib/copy.ts, which may not import this tier (docs/map.md), so this is
  // the one place that can see both an effect id and the pool its instances are named from.
  it("carries both name pools per entry, and no pool for an effect that is not one", () => {
    for (const { id } of EFFECTS) {
      const pools = EFFECT_NAMES[id];
      expect(pools?.adjectives.length).toBeGreaterThan(0);
      expect(pools?.nouns.length).toBeGreaterThan(0);
    }
    expect(new Set(Object.keys(EFFECT_NAMES))).toEqual(new Set(EFFECTS.map(({ id }) => id)));
  });

  it("rejects duplicate effect ids", () => {
    expect(() => {
      validateEffects([unbuilt("same", "one"), unbuilt("same", "two")]);
    }).toThrow(/duplicate effect id: same/u);
  });

  it("rejects duplicate parameter ids across effects", () => {
    expect(() => {
      validateEffects([unbuilt("one", "shared"), unbuilt("two", "shared")]);
    }).toThrow(/duplicate effect param id: shared/u);
  });

  // A lane asks for a value per point, which is the rate a rebuild refuses, and there is no
  // gesture end between two of them (0090).
  it("rejects a parameter that declares both a rebuild and a lane", () => {
    const one = unbuilt("one", "one.both");
    const param = { ...one.params[0]!, rebuild: true, automation: "linear" } as const;
    expect(() => {
      validateEffects([{ ...one, params: [param] }]);
    }).toThrow(/cannot take a lane/u);
  });

  it("indexes parameter ownership without another declaration", () => {
    expect(effectForParam("filter.cutoff")).toBe("filter");
    expect(effectForParam("delay.time")).toBe("delay");
    expect(effectForParam("delay.feedback")).toBe("delay");
    expect(effectForParam("delay.mix")).toBe("delay");
  });
});
