/**
 * @role Tests the looks a standing rack gives the picture: that they are read off the entries'
 *   declarations in the rack's own order and off nothing else, that each travels its presence at the
 *   shape's own rate and arrives outright on a halted yard, that a look the rack has let go of is
 *   dropped on the frame it reaches nought, and that the four reductions the painting spends — the
 *   bend, the wander, the folds and the share — say what the rack it can hear says (0269, 0278, 0279).
 * @instead What a look *is*, and what the registry refuses of one → src/lib/moireLook.test.ts and
 *   src/audio/effects/registry.test.ts. The shatter's own arithmetic, over the band it is stated on
 *   → src/lib/moireSound.test.ts; the slices it is drawn through → src/lib/moireGeometry.test.ts,
 *   and the picture it actually breaks → src/ui/moireCanvasField.test.ts. Carrying a look's travel
 *   across a rebuilt set → src/ui/moireCarry.test.ts. The lattice, the one whole-field reading that
 *   is no effect's → src/ui/moireShape.test.ts.
 */
// One reading's own cases over one population, and a test file's imports are the modules the
// reading reaches. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { describe, expect, it } from "vitest";

import { effectParamDefaults, PARAMS } from "@/audio/params";
import { emptyMasterPeek } from "@/audio/context";
import { emptyDeckPeek } from "@/audio/deckPeek";
import { FOLD_CAP } from "@/lib/moireFold";
import { PLAIN_CUT, RACK_SHATTER_BROKEN } from "@/lib/moireSound";
import { NO_GROWN } from "@/ui/moireGrown";
import {
  looksFolds,
  looksShatter,
  looksTravelInto,
  looksWander,
  looksWarp,
  rackLooks,
  type MoireLook,
} from "@/ui/moireLooks";
import { moireRows, refillRows as filledRows } from "@/ui/moireRows";
import { SHAPE_SECS, shapeRest } from "@/ui/moireShape";
import type { SessionEffect } from "@/state/session";

/**
 * A rack instance the way the session builds one — every parameter its entry declares, through the
 * defaults the session itself would fill, at the default unless a case says otherwise. The same
 * fixture the wind's own cases are written with, and for the same reason: `paramIn` throws on a
 * value an instance does not hold (0030), so half an entry is an entry no session could produce.
 */
const instance = (
  id: string,
  over: Partial<Pick<SessionEffect, "effect" | "bypassed" | "params">> = {},
): SessionEffect => {
  const effect = over.effect ?? "scatter";
  return {
    id,
    effect,
    bypassed: over.bypassed ?? false,
    params: { ...effectParamDefaults(effect, id), ...over.params },
    automation: {},
    bounds: {},
  };
};

/** One scatter wholly in: every window taken, and every window replacing what it is passing. */
const BROKEN = { "scatter.odds": 1, "scatter.gate": 1 };

/** And one sway all the way in, bending as far as it can. */
const SWAYING = { "sway.mix": 1, "sway.depth": PARAMS["sway.depth"].max };

/** A rack of `standing` broken scatters, which is the population the band is stated across. */
const scatters = (standing: number): SessionEffect[] =>
  Array.from({ length: standing }, (_each, at) => instance(`scatter ${at}`, { params: BROKEN }));

/**
 * The looks a rack draws, with every one of them arrived — which is what the picture holds once the
 * travel has run its course, and so what every reading below is stated against. The travel itself is
 * a case of its own.
 */
const arrived = (effects: SessionEffect[]): MoireLook[] => {
  const looks = rackLooks(effects);
  looksTravelInto(looks, SHAPE_SECS, SHAPE_SECS, true);
  return looks;
};

/** How broken a rack draws the picture, once its looks have arrived. */
const shattered = (effects: SessionEffect[]): number => looksShatter(arrived(effects));

// One flat list of the reading's cases: what a rack's looks are, how they travel and what each
// reduction says are one question about one population. 0007.
// oxlint-disable-next-line max-lines-per-function
describe("the looks a standing rack gives the picture", () => {
  it("reads the entries that declare one, in the rack's own order and keyed by instance", () => {
    expect(rackLooks([])).toEqual([]);
    const rack = arrived([
      instance("s", { effect: "sway", params: SWAYING }),
      instance("r", { effect: "reverb" }),
      instance("g", { params: BROKEN }),
      instance("x", { effect: "automator" }),
    ]);
    // Rack order, because the order the sound goes through the rack is the order the picture is
    // chained in — and an entry whose look has not landed yet is in none of it.
    expect(rack.map((look) => look.look)).toEqual(["warp", "shatter", "fold"]);
    expect(rack.map((look) => look.key)).toEqual(["s", "g", "x"]);
    // The terms are the entry's own values: a turn on its range where the look says so, and the
    // parameter's own units where it says the wander.
    expect(rack[0]?.terms).toEqual({ bend: 1, wander: PARAMS["sway.rate"].default });
    expect(rack[1]?.terms).toEqual({ share: 1 });
    // The fold reads no term at all: how many times the plane is folded is how many automators are
    // standing, and an entry with no honest presence stands at one.
    expect(rack[2]?.terms).toEqual({});
    expect(rack[2]?.presence).toBe(1);
    // A bypassed entry is in none of it, which is the test every reading of the population is built
    // through; and neither is one turned down to nothing.
    expect(rackLooks([instance("g", { params: BROKEN, bypassed: true })])).toEqual([]);
    expect(
      rackLooks([instance("g", { params: { ...BROKEN, "scatter.gate": 0 } })])[0]?.presence,
    ).toBe(0);
    // Two of one kind are two looks with two keys, and nothing is summed by kind here.
    expect(arrived(scatters(2)).map((look) => look.key)).toEqual(["scatter 0", "scatter 1"]);
  });

  it("travels each look's presence at the shape's own rate, and arrives outright on a halted yard", () => {
    const looks = rackLooks(scatters(1));
    looksTravelInto(looks, SHAPE_SECS, SHAPE_SECS / 2, true);
    expect(looks[0]?.at).toBeCloseTo(0.5);
    looksTravelInto(looks, SHAPE_SECS, SHAPE_SECS, true);
    expect(looks[0]?.at).toBe(1);
    // A yard that is not running has no clock to time a travel against, so everything arrives
    // outright — the answer the ink, the wind and the shape all give (0144).
    const halted = rackLooks(scatters(1));
    looksTravelInto(halted, SHAPE_SECS, 0.001, false);
    expect(halted[0]?.at).toBe(1);
    // And a look the rack has let go of drains out and is dropped on the frame it reaches nought,
    // rather than standing in the picture for as long as the yard stands unrebuilt.
    const leaving = rackLooks(scatters(1));
    looksTravelInto(leaving, SHAPE_SECS, SHAPE_SECS, true);
    const going = leaving[0];
    if (going === undefined) throw new Error("the rack drew no look");
    going.presence = 0;
    looksTravelInto(leaving, SHAPE_SECS, SHAPE_SECS / 2, true);
    expect(leaving).toHaveLength(1);
    expect(going.at).toBeCloseTo(0.5);
    looksTravelInto(leaving, SHAPE_SECS, SHAPE_SECS, true);
    expect(leaving).toEqual([]);
  });

  it("bends the field by its sways, and wanders at the rate they are weighted to", () => {
    expect(looksWarp(arrived([instance("s", { effect: "sway", params: SWAYING })]))).toBe(1);
    expect(
      looksWarp(
        arrived([instance("s", { effect: "sway", params: { ...SWAYING, "sway.mix": 0 } })]),
      ),
    ).toBe(0);
    expect(
      looksWarp(arrived([instance("s", { effect: "sway", params: SWAYING, bypassed: true })])),
    ).toBe(0);
    const half = looksWarp(
      arrived([instance("s", { effect: "sway", params: { ...SWAYING, "sway.mix": 0.25 } })]),
    );
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(1);
    // Two sum, and never past the whole of the bend.
    expect(
      looksWarp(
        arrived([
          instance("s", { effect: "sway", params: SWAYING }),
          instance("t", { effect: "sway", params: SWAYING }),
        ]),
      ),
    ).toBe(1);
    // And the wander is the sways' own rates, weighted by how far in each is — a mean and not a
    // sum, because two sways are one field bending at one speed.
    expect(
      looksWander(
        arrived([
          instance("s", { effect: "sway", params: { ...SWAYING, "sway.rate": 2 } }),
          instance("t", { effect: "sway", params: { ...SWAYING, "sway.rate": 4 } }),
        ]),
      ),
    ).toBe(3);
    expect(looksWander([])).toBe(0);
  });

  it("folds the plane once per automator standing, and never past the cap", () => {
    expect(looksFolds([])).toBe(0);
    expect(looksFolds(arrived([instance("x", { effect: "automator" })]))).toBe(1);
    expect(
      looksFolds(
        arrived(
          Array.from({ length: FOLD_CAP + 2 }, (_each, at) =>
            instance(`x${at}`, { effect: "automator" }),
          ),
        ),
      ),
    ).toBe(FOLD_CAP);
    expect(looksFolds(arrived([instance("x", { effect: "automator", bypassed: true })]))).toBe(0);
    // Fractional on the way there, because a fold arriving is two folded pictures crossfaded.
    const folding = rackLooks([instance("x", { effect: "automator" })]);
    looksTravelInto(folding, SHAPE_SECS, SHAPE_SECS / 2, true);
    expect(looksFolds(folding)).toBeCloseTo(0.5);
  });

  it("breaks the field by the scatters it can hear and nothing else", () => {
    // Nothing standing is nothing, and one whole scatter is nothing too: its claim on the picture
    // is one row's pitch, which displaces nothing visible (0145, 0269).
    expect(shattered([])).toBe(0);
    expect(shattered(scatters(1))).toBe(0);
    expect(shattered(scatters(RACK_SHATTER_BROKEN))).toBe(1);
    const three = shattered(scatters(3));
    expect(three).toBeGreaterThan(0);
    expect(three).toBeLessThan(1);
    // A bypassed entry is not in the picture at all, which is the test the rows and the wind are
    // both built through: what nobody can hear is not in it.
    expect(shattered([...scatters(3), instance("off", { params: BROKEN, bypassed: true })])).toBe(
      three,
    );
    // And neither is one gated to nothing: a gate of nought writes its input straight back out
    // however wide its windows are (0202), and that is the entry's own declared presence rather
    // than a second reading of the same knob.
    expect(
      shattered([...scatters(3), instance("shut", { params: { ...BROKEN, "scatter.gate": 0 } })]),
    ).toBe(three);
    // Nor one taking no window at all: both of its own values weigh it, and either at nothing is an
    // instance scattering nothing.
    expect(
      shattered([...scatters(3), instance("never", { params: { ...BROKEN, "scatter.odds": 0 } })]),
    ).toBe(three);
    // Nothing else in the rack is in it. A yard six reverbs deep is washed and not broken, which is
    // the reading beside this one (0267).
    expect(
      shattered(Array.from({ length: 6 }, (_e, at) => instance(`r${at}`, { effect: "reverb" }))),
    ).toBe(0);
  });

  it("reads each instance over its own values and never off a default", () => {
    // Odds and Gate are read where the instance is set, so a knob crossing a stop moves the whole
    // field: six scatters at the default are not six at the top of their travel.
    const defaults = shattered(
      Array.from({ length: RACK_SHATTER_BROKEN }, (_each, at) => instance(`d${at}`)),
    );
    expect(defaults).toBeGreaterThan(0);
    expect(defaults).toBeLessThan(1);
    expect(shattered(scatters(RACK_SHATTER_BROKEN))).toBe(1);
    // And each of them separately: a rack of one turned up and five parked is not a rack of six
    // parked, which is what "per instance" means.
    const parked = Array.from({ length: RACK_SHATTER_BROKEN }, (_each, at) => instance(`p${at}`));
    const turned = [instance("up", { params: BROKEN }), ...parked.slice(1)];
    expect(shattered(turned)).toBeGreaterThan(shattered(parked));
  });

  it("rests on the set beside the wash and the age, read once and never per row", () => {
    const built = moireRows([], scatters(3), 4, PLAIN_CUT, null, NO_GROWN, null);
    expect(built.looks.map((look) => look.key)).toEqual(["scatter 0", "scatter 1", "scatter 2"]);
    const held = built.looks;
    // The per-frame read writes the wash and travels the ink; it never rebuilds this. What it is
    // read off is a record of every instance's own values, which is an allocation per entry per
    // painting if it is asked on a frame (0070) — and what it is a fact about is what the rack is
    // *set to*, which a rebuild has already answered.
    for (let frame = 0; frame < 3; frame++) {
      filledRows(
        built.rows,
        built.reads,
        { ...emptyDeckPeek(), sounding: 1 },
        1,
        null,
        0,
        null,
        emptyMasterPeek(),
        1 / 60,
        0,
        built.seed,
        built.toward,
        built.ink,
        built.jolt,
        shapeRest(),
      );
    }
    expect(built.looks).toBe(held);
    // And they belong to the field and to no row: nothing in the picture carries a look of its own,
    // the way the wash and the age are the set's and not a row's (0213).
    expect(built.rows.some((row) => "look" in row)).toBe(false);
    // A knob touch is the rebuild that moves them, and a rack turned up is a picture further broken.
    expect(looksShatter(arrived(scatters(6))) > looksShatter(arrived(scatters(3)))).toBe(true);
  });
});
