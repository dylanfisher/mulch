import { describe, expect, it } from "vitest";
import { FunnelIcon } from "@phosphor-icons/react/Funnel";
import { EFFECT_NAMES } from "@/lib/copy";
import {
  DRIFT_GEOMETRIES,
  DRIFT_PROFILES,
  LINEAR_GEOMETRY,
  RESERVED_PROFILES,
  STRAIGHT_DIMENSIONS,
  type DriftGeometry,
  type DriftProfile,
} from "@/lib/moire";
import { EFFECTS, effectForParam, validateEffects } from "./registry";
import type { Effect } from "./contract";

const unbuilt = (id: string, param: string, drift: DriftProfile = "slope"): Effect => ({
  id,
  label: id,
  width: "half",
  icon: FunnelIcon,
  drift,
  geometry: LINEAR_GEOMETRY,
  driftFrom: [{ param, into: "period" }],
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
      validateEffects([unbuilt("one", "shared"), unbuilt("two", "shared", "twin")]);
    }).toThrow(/duplicate effect param id: shared/u);
  });

  // A lane asks for a value per point, which is the rate a rebuild refuses, and there is no
  // gesture end between two of them (0090).
  // A row's pitch says how fast and its angle says which parameter; the profile is the only thing
  // that says what kind of thing is running, so two entries sharing one is two effects that read
  // alike — answered here at load rather than in the painter (P99, 0122).
  it("carries a distinct drift profile per entry, and none of them a reserved one", () => {
    expect(new Set(EFFECTS.map(({ drift }) => drift)).size).toBe(EFFECTS.length);
    expect(EFFECTS.some(({ drift }) => RESERVED_PROFILES.includes(drift))).toBe(false);
    // And a reserved wave is one the picture can actually draw, not a name nothing has (0145).
    for (const profile of RESERVED_PROFILES) expect(DRIFT_PROFILES).toContain(profile);
  });

  it("rejects two effects claiming one drift profile", () => {
    expect(() => {
      validateEffects([unbuilt("one", "one.a", "twin"), unbuilt("two", "two.a", "twin")]);
    }).toThrow(/duplicate effect drift profile: twin/u);
  });

  // The plain grating belongs to the loop's reference row and to a deck's own knobs, so an effect
  // wearing it would draw as the thing it is being read against.
  it("rejects an effect claiming any profile a row no effect owns is cut to", () => {
    // P105: the source cuts the reference row out of its own pool, so there is more than one
    // reserved wave and an entry may claim none of them (0145).
    for (const profile of RESERVED_PROFILES) {
      expect(() => {
        validateEffects([unbuilt("one", "one.a", profile)]);
      }).toThrow(/claims a reserved drift profile: one/u);
    }
  });

  // Beside the profile, and answered at load for the same reason: an entry that declares no way in
  // draws a row folded out of an instance's id alone, which is a picture of what a rack holds
  // rather than of what it is set to (0139, 0122).
  it("carries a way into the picture per entry, into a dimension it reaches once", () => {
    for (const { driftFrom, params } of EFFECTS) {
      expect(driftFrom.length).toBeGreaterThan(0);
      expect(new Set(driftFrom.map(({ into }) => into)).size).toBe(driftFrom.length);
      const owned = new Set(params.map(({ id }) => id));
      for (const { param } of driftFrom) expect(owned.has(param)).toBe(true);
    }
  });

  it("rejects an effect whose values reach the picture nowhere", () => {
    expect(() => {
      validateEffects([{ ...unbuilt("one", "one.a"), driftFrom: [] }]);
    }).toThrow(/effect declares no drift mapping: one/u);
  });

  it("rejects an effect mapping a value it does not own", () => {
    expect(() => {
      validateEffects([
        { ...unbuilt("one", "one.a"), driftFrom: [{ param: "two.a", into: "period" }] },
      ]);
    }).toThrow(/maps a drift value it does not own: one\.two\.a/u);
  });

  it("rejects two of one effect's values reaching one dimension", () => {
    const one = unbuilt("one", "one.a");
    expect(() => {
      validateEffects([
        {
          ...one,
          params: [one.params[0]!, { ...one.params[0]!, id: "one.b" }],
          driftFrom: [
            { param: "one.a", into: "depth" },
            { param: "one.b", into: "depth" },
          ],
        },
      ]);
    }).toThrow(/two drift values reach one dimension: one\.depth/u);
  });

  // A geometry is not claimed exclusively the way a profile is — two rooms are both radial — so
  // what the registry answers for is that the picture has maths to cut a row along it at all.
  it("carries a coordinate the picture can cut a row along, per entry", () => {
    for (const effect of EFFECTS) expect(DRIFT_GEOMETRIES).toContain(effect.geometry);
  });

  it("rejects an effect cut along a coordinate the picture cannot draw", () => {
    const bent = unbuilt("bent", "bent.one");
    expect(() => {
      // The one shape of this the type system cannot refuse: a declaration that reaches the
      // registry from outside its own literal, which is what a plugin written by hand is.
      // oxlint-disable-next-line no-unsafe-type-assertion
      validateEffects([{ ...bent, geometry: "helix" as DriftGeometry }]);
    }).toThrow(/unknown effect drift geometry: bent/u);
  });

  it("rejects a second spacing declared on a row that is not straight", () => {
    // A ring family opens out across the picture by construction, so a chirp on one reaches the
    // painter as a value nothing reads; an octave of one is a picture-sized bake per copy, which is
    // the one thing that must never reach a frame. Both are refused rather than dropped (0143).
    const bent = unbuilt("bent", "bent.one");
    for (const into of STRAIGHT_DIMENSIONS) {
      expect(() => {
        validateEffects([
          { ...bent, geometry: "radial", driftFrom: [{ param: "bent.one", into }] },
        ]);
      }).toThrow(
        new RegExp(
          String.raw`a curved effect cannot claim a straight row's ${into}: bent\.bent\.one`,
          "u",
        ),
      );
    }
    // And a straight one may claim either: the refusal is about the coordinate, not the dimension.
    for (const into of STRAIGHT_DIMENSIONS) {
      const flat = unbuilt("flat", "flat.one");
      flat.driftFrom = [{ param: "flat.one", into }];
      expect(() => {
        validateEffects([flat]);
      }).not.toThrow();
    }
  });

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
