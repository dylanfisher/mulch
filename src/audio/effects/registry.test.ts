import { describe, expect, it } from "vitest";
import { EFFECTS, effectForParam, validateEffects } from "./registry";
import type { Effect } from "./contract";

const unbuilt = (id: string, param: string): Effect => ({
  id,
  label: id,
  params: [{ id: param, label: param, min: 0, max: 1, default: 0 }],
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
