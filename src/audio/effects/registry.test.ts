// One file, one registry contract: every rule holds over the same one list of entries, and the
// look cases are the drift declarations' own complaint said of the whole-field move (0122, 0279).
// Waived at the file rather than raised for the tree.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
// And the same waiver for the count of them: a rule that holds over every entry is asserted against
// whatever those entries declare themselves into, so the knob floor case (0294) reaches the one
// parameter lookup and the range maths as well. Splitting the file to shed an import would split
// the contract.
// oxlint-disable import/max-dependencies
import { describe, expect, it } from "vitest";

import { LATTICE_GEOMETRY } from "@/lib/moireLattice";
import { FunnelIcon } from "@phosphor-icons/react/Funnel";
import { EFFECT_NAMES } from "@/lib/copyNames";
import {
  COLOUR_REACH,
  DRIFT_GEOMETRIES,
  LINEAR_GEOMETRY,
  STRAIGHT_DIMENSIONS,
  type DriftGeometry,
} from "@/lib/moire";
import {
  LOOK_NAMES,
  LOOK_TERMS,
  LOOKS,
  RESERVED_LOOKS,
  type LookName,
  type LookTerm,
} from "@/lib/moireLook";
import { DRIFT_PROFILES, RESERVED_PROFILES, type DriftProfile } from "@/lib/moireProfiles";
import { PARAMS } from "@/audio/params";
import { PLAYER_BURST_MAX, PLAYER_BURST_MIN } from "@/lib/player";
import { normalize } from "@/lib/range";
import { SETTLE_FLOOR_SECS } from "@/lib/settle";
import { AUTO_UNREACHED, WEIGHT_OF } from "./automatorParams";
import { effectById, EFFECTS, effectForParam, isGrowable, validateEffects } from "./registry";
import { defineEffect, type Effect, type ParamDeclaration } from "./contract";

/** Every term of the look above, off the one parameter a fixture owns. */
const SHARDS_FROM = (param: string): { param: string; into: LookTerm }[] =>
  LOOK_TERMS.filter((term) => LOOKS.shards.terms[term] !== undefined).map((into) => ({
    param,
    into,
  }));

const unbuilt = (id: string, param: string, drift: DriftProfile = "cross"): Effect => ({
  id,
  label: id,
  width: "half",
  face: "knobs",
  settle: () => SETTLE_FLOOR_SECS,
  icon: FunnelIcon,
  drift,
  geometry: LINEAR_GEOMETRY,
  driftFrom: [{ param, into: "period" }],
  // One look nothing else in a fixture claims, with its one parameter answering for every term of
  // it — every entry must declare a look (0290) and must leave none of its terms unread (0359), and
  // a fixture with one knob says so with the knob it has.
  look: "shards",
  lookFrom: SHARDS_FROM(param),
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

  // 0322, 0323: the registry's own list moved — an entry left it and one arrived, and what each of
  // them owns went with it. Asserted here rather than spread over the files that no longer mention
  // a filter, because the registry is the one place that says which entries exist.
  it("holds a panner and no filter, and every look and pool moved with them", () => {
    const ids = EFFECTS.map(({ id }) => id);
    expect(ids).toContain("panner");
    expect(ids).not.toContain("filter");
    // A low-pass is what the EQ's shape is now, so a second entry answering the same question is
    // gone and so is everything only it declared.
    expect(LOOK_NAMES).not.toContain("soften");
    expect(Object.keys(LOOKS)).not.toContain("soften");
    expect(DRIFT_PROFILES).not.toContain("slope");
    expect(Object.keys(EFFECT_NAMES)).not.toContain("filter");
    // And the arrival is a whole entry: its own look, its own wave, a presence that puts it in the
    // growable pool, and twenty-four names of each kind whose nouns nothing else uses.
    const panner = effectById("panner");
    expect(panner.look).toBe("stagger");
    expect(LOOKS.stagger.at).toBe("pass");
    expect(panner.drift).toBe("cross");
    expect(DRIFT_PROFILES).toContain("cross");
    expect(panner.presence).toMatchObject({ param: "panner.spread" });
    expect(isGrowable(panner)).toBe(true);
    const pools = EFFECT_NAMES.panner;
    expect(pools?.adjectives).toHaveLength(24);
    expect(pools?.nouns).toHaveLength(24);
  });

  it("rejects duplicate effect ids", () => {
    expect(() => {
      validateEffects([unbuilt("same", "one"), unbuilt("same", "two")]);
    }).toThrow(/duplicate effect id: same/u);
  });

  it("rejects duplicate parameter ids across effects", () => {
    expect(() => {
      validateEffects([
        unbuilt("one", "shared"),
        {
          ...unbuilt("two", "shared", "twin"),
          look: "warp",
          lookFrom: [
            { param: "shared", into: "bend" },
            { param: "shared", into: "wander" },
          ],
        },
      ]);
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

  it("turns a colour on every entry with a value to turn one with", () => {
    // Colour is something an effect turns (0141), and a rack whose entries none of them turned it
    // was one hue whatever it held. Every entry claims at least one of the three, except the
    // automator, which holds no value of its own (0296), and the delay, whose three values are the
    // anchor's, the feedback's and the depth's oldest claims (0142, 0143, 0148).
    const colours = new Set<string>(Object.keys(COLOUR_REACH));
    for (const { id, driftFrom } of EFFECTS) {
      if (id === "automator" || id === "delay") continue;
      expect(
        driftFrom.some(({ into }) => colours.has(into)),
        `${id} turns no colour`,
      ).toBe(true);
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
  // value says nothing about a row read identically from here, so every parameter is now drawn or
  // written off, and a reason that is not written is not a reason. The look's terms are the other
  // way it is drawn (0359): a choice lands there because every dimension of a row is a quantity, and
  // a value its own look draws is reached and may not also be written off — while a value in both
  // `driftFrom` and `lookFrom` is an entry saying one honest thing twice, which several do.
  it("says something about every one of its own values, either way", () => {
    for (const { id, params, driftFrom, lookFrom, driftUnreached } of EFFECTS) {
      const reached = new Set([...driftFrom, ...(lookFrom ?? [])].map((each) => each.param));
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

  // P356 step 9: the panner and the compressor were the two entries with a value in neither list —
  // the three stage toggles and the makeup — and both of them now say all of it, the toggles as the
  // stagger's three stages and the makeup as the squash's lift (0359).
  it("leaves no value of a panner or a compressor outside the picture", () => {
    for (const id of ["panner", "compressor"] as const) {
      const { params, driftFrom, lookFrom } = effectById(id);
      const reached = new Set([...driftFrom, ...(lookFrom ?? [])].map((each) => each.param));
      for (const param of params) {
        expect(`${id}: ${param.id} ${reached.has(param.id)}`).toBe(`${id}: ${param.id} true`);
      }
    }
  });

  // P356 step 10: what the automator writes off is now the eleven pool weights and nothing else —
  // the six knobs that shape its run reach the shards look, and a weight's own reach is the rows the
  // run it grows lays (0360). A twelfth line here is a knob that has quietly left the picture.
  it("writes off the automator's eleven pool weights and nothing else", () => {
    expect(AUTO_UNREACHED.map((each) => each.param)).toEqual(Object.values(WEIGHT_OF));
    expect(AUTO_UNREACHED).toHaveLength(11);
    // And every other knob of it is drawn, by a dimension of its row or by a term of its look.
    const { params, driftFrom, lookFrom } = effectById("automator");
    const reached = new Set([...driftFrom, ...(lookFrom ?? [])].map((each) => each.param));
    const written = new Set<string>(AUTO_UNREACHED.map((each) => each.param));
    for (const param of params) {
      const said = reached.has(param.id) !== written.has(param.id);
      expect(`automator: ${param.id} ${said}`).toBe(`automator: ${param.id} true`);
    }
  });

  // And the list the block is closing, said as a whole rather than per entry: the only values still
  // written off are the automator's pool weights. A new one here is an entry deciding for itself
  // that it has nothing to say.
  it("writes off only the knobs a step of this block still owes", () => {
    const owed = new Set<string>(AUTO_UNREACHED.map((each) => each.param));
    for (const { id, driftUnreached } of EFFECTS) {
      for (const { param } of driftUnreached ?? []) {
        expect(`${id}: ${param} ${owed.has(param)}`).toBe(`${id}: ${param} true`);
      }
    }
  });

  // P294: a knob read logarithmically has no bottom at nought, and the one that is a length of time
  // has no bottom there either — a delay of nothing is not a delay.
  it("floors every logarithmic knob above nought, the delay's Time among them", () => {
    for (const [id, spec] of Object.entries(PARAMS)) {
      if (spec.curve !== "log") continue;
      // Said as a string so a failure names the knob rather than reading `expected 0 to be > 0`.
      expect(`${id} ${spec.min > 0}`).toBe(`${id} true`);
    }
    // Why the floor is owed rather than nice: a logarithmic range that reached nought is not read
    // at all but thrown on, which src/lib/range.test.ts:50 already pins and this does not restate.
    // And the delay's Time is the one that gained the floor: ten milliseconds, on the curve, with
    // the default well past the middle of the knob rather than in the first eighth of it.
    const time = PARAMS["delay.time"];
    expect(time.curve).toBe("log");
    expect(time.min).toBe(0.01);
    expect(normalize(time.default, time.min, time.max, time.curve)).toBeGreaterThan(0.5);
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

  // An entry whose default is its silence has to say what being all the way in means, or it fades
  // from nothing to nothing. It was the EQ's own case, and is nobody's since that presence moved
  // (0325) — which is why the case is asked of a fixture and not of the registry.
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

  // 0359: a look's term is the other way into the picture, so a value its own look draws is reached
  // — and an entry saying both about one value gives two answers, exactly as one in `driftFrom` and
  // `driftUnreached` does.
  it("takes a look's term as an answer, and refuses one beside a silence", () => {
    const one = unbuilt("one", "one.a");
    const two = {
      ...one,
      params: [
        one.params[0]!,
        { ...one.params[0]!, id: "one.b" },
        { ...one.params[0]!, id: "one.c" },
      ],
      look: "squash" as const,
      lookFrom: [
        { param: "one.a", into: "floor" as const },
        { param: "one.b", into: "ceiling" as const },
        { param: "one.c", into: "lift" as const },
      ],
    };
    // `one.b` is in no drift list at all, and the look reading it is what answers for it.
    expect(() => {
      validateEffects([two]);
    }).not.toThrow();
    expect(() => {
      validateEffects([{ ...two, driftUnreached: [{ param: "one.b", because: "nowhere" }] }]);
    }).toThrow(/declares a value its look reads unreached: one\.one\.b/u);
  });

  // A geometry is not claimed exclusively the way a profile is — two rooms are both radial — so
  // what the registry answers for is that the picture has maths to cut a row along it at all.
  it("carries a coordinate the picture can cut a row along, per entry", () => {
    for (const effect of EFFECTS) expect(DRIFT_GEOMETRIES).toContain(effect.geometry);
  });

  // Beside the drift declarations, and answered at load for the same reasons: a look the picture
  // has no maths for reaches the painter as a move nothing draws, two entries on one look draw the
  // same move twice, and the lattice is the whole rack standing and no plugin's (0122, 0278, 0279).
  it("carries an honest look on every entry, and every entry one", () => {
    const claimed = new Set<LookName>();
    for (const effect of EFFECTS) {
      const { look, lookFrom, params } = effect;
      expect(LOOKS[look]).toBeDefined();
      expect(RESERVED_LOOKS).not.toContain(look);
      expect(claimed.has(look)).toBe(false);
      claimed.add(look);
      const terms = Object.keys(LOOKS[look].terms);
      const reached = (lookFrom ?? []).map(({ into }) => into);
      expect(new Set(reached)).toEqual(new Set(terms));
      expect(reached).toHaveLength(terms.length);
      const owned = new Set(params.map(({ id }) => id));
      for (const { param } of lookFrom ?? []) expect(owned.has(param)).toBe(true);
    }
    // The thirteen that stand today, on the entries whose whole-field moves have landed (0278, 0280,
    // 0281, 0282, 0283, 0285, 0286, 0287, 0288, 0289, 0371).
    expect(claimed).toEqual(
      new Set([
        "warp",
        "shards",
        "shatter",
        "stagger",
        "bloom",
        "blocks",
        "echoes",
        "sharpen",
        "wobble",
        "band",
        "squash",
        "double",
        "blink",
      ]),
    );
  });

  it("rejects a look the picture has no maths for, and one two entries claim", () => {
    const one = unbuilt("one", "one.a");
    expect(() => {
      // The one shape of this the type system cannot refuse: a declaration reaching the registry
      // from outside its own literal, which is what a plugin written by hand is.
      // oxlint-disable-next-line no-unsafe-type-assertion
      validateEffects([{ ...one, look: "glow" as LookName }]);
    }).toThrow(/unknown effect look: one\.glow/u);
    expect(() => {
      validateEffects([
        {
          ...one,
          look: "shatter",
          lookFrom: [
            { param: "one.a", into: "share" },
            { param: "one.a", into: "size" },
          ],
        },
        {
          ...unbuilt("two", "two.a", "twin"),
          look: "shatter",
          lookFrom: [
            { param: "two.a", into: "share" },
            { param: "two.a", into: "size" },
          ],
        },
      ]);
    }).toThrow(/duplicate effect look: shatter/u);
  });

  it("rejects an effect claiming the lattice, which is the rack's own", () => {
    const one = unbuilt("one", "one.a");
    for (const look of RESERVED_LOOKS) {
      expect(() => {
        validateEffects([{ ...one, look }]);
      }).toThrow(/effect claims a reserved look: one/u);
    }
  });

  it("rejects a look term the entry does not own, reaches twice, or leaves unread", () => {
    const one = unbuilt("one", "one.a");
    expect(() => {
      validateEffects([{ ...one, look: "shatter", lookFrom: [{ param: "two.a", into: "share" }] }]);
    }).toThrow(/maps a look value it does not own: one\.two\.a/u);
    expect(() => {
      validateEffects([
        {
          ...one,
          look: "shatter",
          lookFrom: [
            { param: "one.a", into: "share" },
            { param: "one.a", into: "share" },
          ],
        },
      ]);
    }).toThrow(/two look values reach one term: one\.share/u);
    expect(() => {
      validateEffects([{ ...one, look: "shatter", lookFrom: [{ param: "one.a", into: "bend" }] }]);
    }).toThrow(/a look has no such term: one\.bend/u);
    // A term nothing reaches is a look reading a number nobody stated.
    expect(() => {
      validateEffects([{ ...one, look: "shatter", lookFrom: [] }]);
    }).toThrow(/effect leaves a look term unread: one\.share/u);
    // And an entry that names no look at all is refused outright, now that every pass has landed
    // and there is nothing left for an entry to be waiting on (0290). The type says so too; this is
    // the one shape of it the type system cannot see, which is a plugin written by hand.
    expect(() => {
      // oxlint-disable-next-line no-unsafe-type-assertion
      validateEffects([{ ...one, look: undefined as unknown as LookName }]);
    }).toThrow(/effect declares no look: one/u);
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

  it("rejects an effect cut along the lattice, which is the field's own", () => {
    // The lattice is a picture of how much rack is standing, as the two fractal coordinates are a
    // picture of the run: no plugin may wear any of the three (0246, 0278).
    const bent = unbuilt("bent", "bent.one");
    expect(() => {
      validateEffects([{ ...bent, geometry: LATTICE_GEOMETRY }]);
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

  /**
   * The choice list's own rule, answered where a plugin is written rather than where the registry
   * loads: a parameter that names its steps names every one of them, or a picker built from the
   * list cannot reach a value the node can stand in (0325).
   */
  it("refuses a parameter whose choices disagree with its own steps", () => {
    const one = unbuilt("one", "one.pick");
    // Built off the fixture's own parameter with its lane dropped, which is the rule below.
    const { automation: _laned, ...amount } = one.params[0]!;
    const picked = { ...amount, max: 2, step: 1, choices: ["A", "B", "C"] } as const;
    expect(() => defineEffect({ ...one, params: [picked] })).not.toThrow();
    expect(() => defineEffect({ ...one, params: [{ ...picked, choices: ["A", "B"] }] })).toThrow(
      /name every one of its steps/u,
    );
    expect(() =>
      defineEffect({ ...one, params: [{ ...picked, choices: ["A", "B", "C", "D"] }] }),
    ).toThrow(/name every one of its steps/u);
    // And an amount cannot be named at all: without a step there is nothing for a name to stand
    // for, and the list would be four words over a continuum.
    const { step: _dropped, ...unstepped } = picked;
    expect(() => defineEffect({ ...one, params: [unstepped] })).toThrow(/must be stepped/u);
    // Nor may a choice hold a lane: a picker draws none, so a lane on one is a name a hand picked
    // and the next pass wrote over, with nothing on screen to say so.
    expect(() => defineEffect({ ...one, params: [{ ...picked, automation: "linear" }] })).toThrow(
      /cannot take a lane/u,
    );
  });

  /**
   * The tap's own rule, answered beside the choice list's and for the same reason: a parameter
   * that says a hand may tap it out is a length of wall seconds the burst's arithmetic can answer
   * with, and both of those words are checked where the plugin is written (0326).
   */
  it("refuses a tap on a parameter that is not seconds of the burst's own range", () => {
    const one = unbuilt("one", "one.time");
    const seconds = {
      ...one.params[0]!,
      min: PLAYER_BURST_MIN,
      max: PLAYER_BURST_MAX,
      default: 0.25,
      beat: true,
    } as const;
    expect(() => defineEffect({ ...one, params: [seconds] })).not.toThrow();
    // A range inside the burst's is a range the tap can reach every corner of; one outside it at
    // either end is a knob whose top or bottom no press could ever write.
    expect(() => defineEffect({ ...one, params: [{ ...seconds, min: 0 }] })).toThrow(
      /inside the burst's own range/u,
    );
    expect(() =>
      defineEffect({ ...one, params: [{ ...seconds, max: PLAYER_BURST_MAX + 1 }] }),
    ).toThrow(/inside the burst's own range/u);
    // And a name is not a length: there is no interval to tap out between two of them.
    const { automation: _laned, ...amount } = seconds;
    expect(() =>
      defineEffect({
        ...one,
        params: [{ ...amount, min: 0.005, max: 2.005, step: 1, choices: ["A", "B", "C"] }],
      }),
    ).toThrow(/naming its choices cannot be tapped/u);
  });

  it("indexes parameter ownership without another declaration", () => {
    expect(effectForParam("eq.frequency")).toBe("eq");
    expect(effectForParam("delay.time")).toBe("delay");
    expect(effectForParam("delay.feedback")).toBe("delay");
    expect(effectForParam("delay.mix")).toBe("delay");
  });
});
