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
  it("carries a name pool per entry, and no pool for an effect that is not one", () => {
    for (const { id } of EFFECTS) expect(EFFECT_NAMES[id]).toBeDefined();
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

  it("indexes parameter ownership without another declaration", () => {
    expect(effectForParam("filter.cutoff")).toBe("filter");
    expect(effectForParam("delay.time")).toBe("delay");
    expect(effectForParam("delay.feedback")).toBe("delay");
    expect(effectForParam("delay.mix")).toBe("delay");
  });
});
