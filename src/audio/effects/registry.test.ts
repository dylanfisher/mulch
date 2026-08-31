import { describe, expect, it } from "vitest";
import { FunnelIcon } from "@phosphor-icons/react/Funnel";
import { EFFECT_NAMES } from "@/lib/copyNames";
import {
  DRIFT_GEOMETRIES,
  LINEAR_GEOMETRY,
  STRAIGHT_DIMENSIONS,
  type DriftGeometry,
} from "@/lib/moire";
import { DRIFT_PROFILES, RESERVED_PROFILES, type DriftProfile } from "@/lib/moireProfiles";
import { SETTLE_FLOOR_SECS } from "@/lib/settle";
import { EFFECTS, effectForParam, validateEffects } from "./registry";
import type { Effect, ParamDeclaration } from "./contract";

const unbuilt = (id: string, param: string, drift: DriftProfile = "slope"): Effect => ({
  id,
  label: id,
  width: "half",
  face: "knobs",
  settle: () => SETTLE_FLOOR_SECS,
  icon: FunnelIcon,
  drift,
  geometry: LINEAR_GEOMETRY,
  driftFrom: [{ param, into: "period" }],
  presence: { param, silent: 0, full: 1 },
  params: [
    { id: param, label: param, min: 0, max: 1, default: 0, precision: 2, automation: "linear" },
  ],
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

  // The pools live in src/lib/copyNames.ts, which may not import this tier (docs/map.md), so this is
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

  // The sweep 0148 is: an entry that had run out of dimensions to claim and one that had decided a
  // value says nothing about a row read identically from here, so every parameter is now in exactly
  // one of the two lists and a reason that is not written is not a reason.
  it("says something about every one of its own values, either way", () => {
    for (const { id, params, driftFrom, driftUnreached } of EFFECTS) {
      const reached = new Set(driftFrom.map((each) => each.param));
      const unreached = new Set((driftUnreached ?? []).map((each) => each.param));
      for (const param of params) {
        expect(`${id}: ${param.id} ${reached.has(param.id) || unreached.has(param.id)}`).toBe(
          `${id}: ${param.id} true`,
        );
        expect(reached.has(param.id) && unreached.has(param.id)).toBe(false);
      }
      const owned = new Set(params.map((param) => param.id));
      for (const { param, because } of driftUnreached ?? []) {
        expect(owned.has(param)).toBe(true);
        expect(because.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("rejects an effect that is silent about a value of its own", () => {
    const one = unbuilt("one", "one.a");
    expect(() => {
      validateEffects([{ ...one, params: [one.params[0]!, { ...one.params[0]!, id: "one.b" }] }]);
    }).toThrow(/effect is silent about a value of its own: one\.one\.b/u);
  });

  // How an effect is turned down to nothing is the one fact an automator needs of every entry, and
  // no two of them spell it alike — so it is declared and checked here rather than guessed at by
  // whoever is fading it (0202).
  it("rejects a presence the entry does not own", () => {
    const one = unbuilt("one", "one.a");
    expect(() => {
      validateEffects([{ ...one, presence: { param: "one.b", silent: 0 } }]);
    }).toThrow(/effect names a presence it does not own: one\.one\.b/u);
  });

  it("rejects a silence outside the parameter's own range", () => {
    const one = unbuilt("one", "one.a");
    expect(() => {
      validateEffects([{ ...one, presence: { param: "one.a", silent: 2 } }]);
    }).toThrow(/effect is silent outside its own range: one\.one\.a/u);
  });

  // A fade is a schedule on the bound AudioParam. A parameter with no lane is reached through the
  // manual join instead, which is capped at PARAM_RAMP_SECS — a step, not a fade.
  it("rejects a presence with no lane to be faded on", () => {
    const one = unbuilt("one", "one.a");
    expect(() => {
      const { automation: _lane, ...noLane } = one.params[0]!;
      validateEffects([{ ...one, params: [noLane] }]);
    }).toThrow(/a presence must be schedulable: one\.one\.a/u);
  });

  // The compressor forces `held`: its makeup multiplies whatever comes out, so a ratio of one with
  // a drawn makeup is a step in level rather than nothing at all.
  it("rejects a held value the entry does not own, and one that is its own presence", () => {
    const one = unbuilt("one", "one.a");
    expect(() => {
      validateEffects([
        { ...one, presence: { param: "one.a", silent: 0, full: 1, held: ["one.b"] } },
      ]);
    }).toThrow(/effect holds a value it does not own: one\.one\.b/u);
    expect(() => {
      validateEffects([
        { ...one, presence: { param: "one.a", silent: 0, full: 1, held: ["one.a"] } },
      ]);
    }).toThrow(/effect holds its own presence: one\.one\.a/u);
  });

  // The EQ's own case: a peaking band ships flat, so an entry whose default is its silence has to
  // say what being all the way in means, or it fades from nothing to nothing.
  it("rejects an entry that is silent at its own default, and a full that is not", () => {
    const one = unbuilt("one", "one.a");
    expect(() => {
      validateEffects([{ ...one, presence: { param: "one.a", silent: 0 } }]);
    }).toThrow(/effect is silent at its own default: one\.one\.a/u);
    expect(() => {
      validateEffects([{ ...one, presence: { param: "one.a", silent: 0, full: 0 } }]);
    }).toThrow(/effect is full where it is silent: one\.one\.a/u);
    expect(() => {
      validateEffects([{ ...one, presence: { param: "one.a", silent: 0, full: 9 } }]);
    }).toThrow(/effect is full outside its own range: one\.one\.a/u);
  });

  it("rejects an entry with no presence and no reason for it", () => {
    const one = unbuilt("one", "one.a");
    expect(() => {
      validateEffects([{ ...one, presence: { none: "  " } }]);
    }).toThrow(/effect declares no presence for no reason: one/u);
  });

  // Every shipped entry answers, because the automator draws from all of them.
  it("declares a presence on every entry that is not the automator", () => {
    for (const effect of EFFECTS) {
      const presence = effect.presence;
      if ("none" in presence) {
        expect(presence.none.trim().length).toBeGreaterThan(0);
        continue;
      }
      const spec: ParamDeclaration | undefined = effect.params.find(
        ({ id }) => id === presence.param,
      );
      expect(spec).toBeDefined();
      expect(spec?.automation).toBe("linear");
      expect(presence.silent).toBeGreaterThanOrEqual(spec?.min ?? Number.NaN);
      expect(presence.silent).toBeLessThanOrEqual(spec?.max ?? Number.NaN);
    }
  });

  it("rejects one value claiming two dimensions", () => {
    // The converse of the rule above, and the other way an entry can misreport itself now that the
    // two lists are the whole account of its parameters: one value, one answer.
    const one = unbuilt("one", "one.a");
    expect(() => {
      validateEffects([
        {
          ...one,
          driftFrom: [
            { param: "one.a", into: "period" },
            { param: "one.a", into: "depth" },
          ],
        },
      ]);
    }).toThrow(/a drift value is declared more than once: one\.one\.a/u);
  });

  it("rejects an unreached declaration that is not owned, is also reached, or gives no reason", () => {
    const one = unbuilt("one", "one.a");
    const two = { ...one, params: [one.params[0]!, { ...one.params[0]!, id: "one.b" }] };
    expect(() => {
      validateEffects([
        { ...two, driftUnreached: [{ param: "one.c", because: "it is not ours" }] },
      ]);
    }).toThrow(/declares a value it does not own unreached: one\.one\.c/u);
    expect(() => {
      validateEffects([
        {
          ...two,
          driftFrom: [
            { param: "one.a", into: "period" },
            { param: "one.b", into: "depth" },
          ],
          driftUnreached: [{ param: "one.b", because: "both at once" }],
        },
      ]);
    }).toThrow(/a drift value is declared more than once: one\.one\.b/u);
    // And the same words for a value written down unreached twice: one value, two answers.
    expect(() => {
      validateEffects([
        {
          ...two,
          driftUnreached: [
            { param: "one.b", because: "once" },
            { param: "one.b", because: "and again" },
          ],
        },
      ]);
    }).toThrow(/a drift value is declared more than once: one\.one\.b/u);
    expect(() => {
      validateEffects([{ ...two, driftUnreached: [{ param: "one.b", because: "  " }] }]);
    }).toThrow(/declares a value unreached for no reason: one\.one\.b/u);
    // And the shape the registry is actually written in passes: one reached, one written down.
    expect(() => {
      validateEffects([
        { ...two, driftUnreached: [{ param: "one.b", because: "no honest room" }] },
      ]);
    }).not.toThrow();
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
