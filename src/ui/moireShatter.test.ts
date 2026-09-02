/**
 * @role Tests how broken the standing rack draws the picture: that the reading is the standing
 *   scatters' own Odds and Gate and nothing else, that it rests on the field beside the wash and the
 *   age rather than on a row, and that it is read once when the set is built (0269).
 * @instead The reading's own arithmetic, over the band it is stated on → src/lib/moireSound.test.ts.
 *   The slices the share is drawn through, and the ceiling it is bounded at →
 *   src/lib/moireGeometry.test.ts, and the picture it actually breaks → src/ui/moireCanvas.test.ts. The other whole-field reading of
 *   the same population → src/ui/moireWind.test.ts.
 */
import { describe, expect, it } from "vitest";

import { effectParamDefaults } from "@/audio/params";
import { emptyMasterPeek } from "@/audio/context";
import { emptyDeckPeek } from "@/audio/deckPeek";
import { PLAIN_CUT, RACK_SHATTER_BROKEN } from "@/lib/moireSound";
import { NO_GROWN } from "@/ui/moireGrown";
import { moireRows, refillRows as filledRows } from "@/ui/moireRows";
import { rackShatter } from "@/ui/moireShatter";
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

/** A rack of `standing` of those, which is the population the band is stated across. */
const scatters = (standing: number): SessionEffect[] =>
  Array.from({ length: standing }, (_each, at) => instance(`scatter ${at}`, { params: BROKEN }));

// One flat list of the reading's own cases: what it reads and what it leaves out are one question
// about one population. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("how much of a standing rack is scatter", () => {
  it("reads the scatters it can hear and nothing else", () => {
    // Nothing standing is nothing, and one whole scatter is nothing too: its claim on the picture
    // is one row's pitch, which displaces nothing visible (0145, 0269).
    expect(rackShatter([])).toBe(0);
    expect(rackShatter(scatters(1))).toBe(0);
    expect(rackShatter(scatters(RACK_SHATTER_BROKEN))).toBe(1);
    const three = rackShatter(scatters(3));
    expect(three).toBeGreaterThan(0);
    expect(three).toBeLessThan(1);
    // A bypassed entry is not in the picture at all, which is the test the rows and the wind are
    // both built through: what nobody can hear is not in it.
    expect(rackShatter([...scatters(3), instance("off", { params: BROKEN, bypassed: true })])).toBe(
      three,
    );
    // And neither is one gated to nothing: a gate of nought writes its input straight back out
    // however wide its windows are (0202), and that is the entry's own declared presence rather
    // than a second reading of the same knob.
    expect(
      rackShatter([...scatters(3), instance("shut", { params: { ...BROKEN, "scatter.gate": 0 } })]),
    ).toBe(three);
    // Nor one taking no window at all: both of its own values weigh it, and either at nothing is an
    // instance scattering nothing.
    expect(
      rackShatter([
        ...scatters(3),
        instance("never", { params: { ...BROKEN, "scatter.odds": 0 } }),
      ]),
    ).toBe(three);
    // Nothing else in the rack is in it. A yard six reverbs deep is washed and not broken, which is
    // the reading beside this one (0267).
    expect(
      rackShatter(Array.from({ length: 6 }, (_e, at) => instance(`r${at}`, { effect: "reverb" }))),
    ).toBe(0);
  });

  it("reads each instance over its own values and never off a default", () => {
    // Odds and Gate are read where the instance is set, so a knob crossing a stop moves the whole
    // field: six scatters at the default are not six at the top of their travel.
    const defaults = rackShatter(
      Array.from({ length: RACK_SHATTER_BROKEN }, (_each, at) => instance(`d${at}`)),
    );
    expect(defaults).toBeGreaterThan(0);
    expect(defaults).toBeLessThan(1);
    expect(rackShatter(scatters(RACK_SHATTER_BROKEN))).toBe(1);
    // And each of them separately: a rack of one turned up and five parked is not a rack of six
    // parked, which is what "per instance" means.
    const parked = Array.from({ length: RACK_SHATTER_BROKEN }, (_each, at) => instance(`p${at}`));
    const turned = [instance("up", { params: BROKEN }), ...parked.slice(1)];
    expect(rackShatter(turned)).toBeGreaterThan(rackShatter(parked));
  });

  it("rests on the set beside the wash and the age, read once and never per row", () => {
    const built = moireRows([], scatters(3), 4, PLAIN_CUT, null, NO_GROWN, null);
    const { shatter } = built;
    expect(shatter).toBeGreaterThan(0);
    // The per-frame read writes the wash and travels the ink; it never touches this. What it is
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
      );
    }
    expect(built.shatter).toBe(shatter);
    // And it belongs to the field and to no row: nothing in the picture carries a shatter of its
    // own, the way the wash and the age are the set's and not a row's (0213).
    expect(built.rows.some((row) => "shatter" in row)).toBe(false);
    // A knob touch is the rebuild that moves it, and a rack turned up is a picture further broken.
    expect(moireRows([], scatters(6), 4, PLAIN_CUT, null, NO_GROWN, null).shatter).toBeGreaterThan(
      shatter,
    );
  });
});
