/**
 * @role Tests the looks a standing rack gives the picture: that they are read off the entries'
 *   declarations in the rack's own order and off nothing else, that each travels its presence at the
 *   shape's own rate and arrives outright on a halted yard, that a look the rack has let go of is
 *   dropped on the frame it reaches nought, and that the five reductions the painting spends — the
 *   bend, the wander, the tears, the share and the piece size — say what the rack it can hear says
 *   (0269, 0278, 0279, 0290, 0296).
 * @instead What a look *is*, and what the registry refuses of one → src/lib/moireLook.test.ts and
 *   src/audio/effects/registry.test.ts. The shatter's own arithmetic, over the band it is stated on
 *   → src/lib/moireSound.test.ts; the slices it is drawn through → src/lib/moireGeometry.test.ts,
 *   and the picture it actually breaks → src/ui/moireCanvasField.test.ts. Carrying a look's travel
 *   across a rebuilt set → src/ui/moireCarry.test.ts. The lattice, the one whole-field reading that
 *   is no effect's → src/ui/moireShape.test.ts.
 */
// One reading's own cases over one population, and a test file's imports are the modules the
// reading reaches. Over the soft cap with the piece size's own case (0290): the reductions are five
// readings of one rack, and a case moved out would state one of them away from the population every
// other is asserted against. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import { EFFECTS, isGrowable } from "@/audio/effects/registry";
import { effectParamDefaults, PARAMS } from "@/audio/params";
import { emptyMasterPeek } from "@/audio/context";
import { emptyDeckPeek } from "@/audio/deckPeek";
import { SHARD_CAP } from "@/lib/moireShards";
import { PLAIN_CUT, RACK_SHATTER_BROKEN } from "@/lib/moireSound";
import { normalize } from "@/lib/range";
import { NO_GROWN } from "@/ui/moireGrown";
import {
  looksCrowd,
  looksHeldInto,
  looksShards,
  looksSaturate,
  looksShatter,
  looksShatterSize,
  looksTravelInto,
  looksWander,
  looksWarp,
  rackLooks,
  type MoireLook,
} from "@/ui/moireLooks";
import { moireRows, refillRows as filledRows } from "@/ui/moireRows";
import { DRIFT_INK_SECS } from "@/ui/moireScreenInk";
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
    motion: {},
    bounds: {},
  };
};

/** One scatter wholly in: every window taken, and every window replacing what it is passing. */
const BROKEN = { "scatter.odds": 1, "scatter.gate": 1 };

/** And one sway all the way in, bending as far as it can. */
const SWAYING = { "sway.mix": 1, "sway.depth": PARAMS["sway.depth"].max };

/**
 * And one delay heard all the way in — the population the shared echo ceiling is stated across
 * (0294). Its Mix is spelt out rather than left at the default because a case below turns it down,
 * and the two readings have to be stated the same way round.
 */
const delay = (
  id: string,
  over: Partial<Pick<SessionEffect, "bypassed" | "params">> = {},
): SessionEffect => instance(id, { effect: "delay", params: { "delay.mix": 1 }, ...over });

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
  looksTravelInto(looks, SHAPE_SECS.value, SHAPE_SECS.value, true);
  return looks;
};

/** A table of tears poisoned so a slot the reading missed shows (`looksShards`). */
const into = (): Float64Array => new Float64Array(SHARD_CAP).fill(Number.NaN);

/** One place of a run, standing at `presence`, as the read holds it (`looksHeldInto`). */
const place = (presence: number) => ({
  effect: "filter",
  instance: "grown",
  presence,
  remain: 1,
  life: 1,
  values: [],
});

/** The presences and the helds `looksShards` fills, and the count it answers. */
const sharded = (
  looks: MoireLook[],
): { standing: number; at: Float64Array; held: Float64Array } => {
  const at = into();
  const held = into();
  return { standing: looksShards(looks, at, held), at, held };
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
    expect(rack.map((look) => look.look)).toEqual(["warp", "bloom", "shatter", "shards"]);
    expect(rack.map((look) => look.key)).toEqual(["s", "r", "g", "x"]);
    // The terms are the entry's own values: a turn on its range where the look says so, and the
    // parameter's own units where it says the wander.
    expect(rack[0]?.terms).toEqual({ bend: 1, wander: PARAMS["sway.rate"].default });
    // A room at its own defaults, both terms turns of their own ranges — the decay's a log one, so
    // the radius is where the knob stands and never the seconds it is stated in (0280).
    const wet = PARAMS["reverb.wet"];
    const decay = PARAMS["reverb.decay"];
    expect(rack[1]?.terms).toEqual({
      amount: normalize(wet.default, wet.min, wet.max, wet.curve),
      radius: normalize(decay.default, decay.min, decay.max, decay.curve),
    });
    // A scatter turned all the way up, its span left where its own knob rests: the share is a turn
    // of Odds and the piece size a turn of Span, on the log range that entry declares it over.
    const span = PARAMS["scatter.span"];
    expect(rack[2]?.terms).toEqual({
      share: 1,
      size: normalize(span.default, span.min, span.max, span.curve),
    });
    // The shards read no term at all: how torn the picture is, is how many automators are standing,
    // and an entry with no honest presence stands at one.
    expect(rack[3]?.terms).toEqual({});
    expect(rack[3]?.presence).toBe(1);
    // A bypassed entry is in none of it, which is the test every reading of the population is built
    // through; and neither is one turned down to nothing.
    expect(rackLooks([instance("g", { params: BROKEN, bypassed: true })])).toEqual([]);
    expect(
      rackLooks([instance("g", { params: { ...BROKEN, "scatter.gate": 0 } })])[0]?.presence,
    ).toBe(0);
    // Two of one kind are two looks with two keys, and nothing is summed by kind here.
    expect(arrived(scatters(2)).map((look) => look.key)).toEqual(["scatter 0", "scatter 1"]);
  });

  // P285: the property the whole picture is read through, pinned over the registry rather than
  // asserted of one entry. **Found by the knob's own name and not by a declaration**, because
  // nothing in `ParamDeclaration` marks a knob as a wet one: an entry whose blend is called
  // something else is outside this walk, and the honest fix if one ever arrives is a word in the
  // declaration rather than a fourth suffix here. The chain's half of this property enumerates
  // structurally (`at === "pass"`) and cannot miss one.
  it("takes a wet knob as the whole of a look's presence, wherever an entry owns one", () => {
    const wet = EFFECTS.flatMap((entry) =>
      entry.params
        // Every name a wet knob wears in this instrument: the Mix, the Wet, and the tape's own
        // Amount, which is the same knob under a third word (src/audio/effects/tape.ts).
        .filter((param) => /\.(mix|wet|amount)$/u.test(param.id))
        .map((param) => [entry, param.id] as const),
    );
    // The list is the registry's and not a copy of it: an entry that loses its wet knob leaves this
    // case with one pair fewer and nothing to state, which is why the count is asserted at all.
    expect(wet.length).toBeGreaterThan(0);
    for (const [entry, param] of wet) {
      // A wet knob *is* how present the effect is: what a mix of nothing leaves is the dry signal,
      // so the picture must draw nothing of that look at all (0202). An entry that read its wet as
      // an ordinary term and its presence off some other knob would draw a look at a mix of
      // nothing, and one that read it as both would square it (0287, 0288). Asked through the
      // registry's own predicate, which is what "declares a presence at all" is said by (0202).
      expect(isGrowable(entry) ? entry.presence.param : null).toBe(param);
      expect(isGrowable(entry) ? entry.presence.silent : null).toBe(PARAMS[param].min);
    }
  });

  it("travels each look's presence at the shape's own rate, and arrives outright on a halted yard", () => {
    const looks = rackLooks(scatters(1));
    looksTravelInto(looks, SHAPE_SECS.value, SHAPE_SECS.value / 2, true);
    expect(looks[0]?.at).toBeCloseTo(0.5);
    looksTravelInto(looks, SHAPE_SECS.value, SHAPE_SECS.value, true);
    expect(looks[0]?.at).toBe(1);
    // A yard that is not running has no clock to time a travel against, so everything arrives
    // outright — the answer the ink, the wind and the shape all give (0144).
    const halted = rackLooks(scatters(1));
    looksTravelInto(halted, SHAPE_SECS.value, 0.001, false);
    expect(halted[0]?.at).toBe(1);
    // And a look the rack has let go of drains out and is dropped on the frame it reaches nought,
    // rather than standing in the picture for as long as the yard stands unrebuilt.
    const leaving = rackLooks(scatters(1));
    looksTravelInto(leaving, SHAPE_SECS.value, SHAPE_SECS.value, true);
    const going = leaving[0];
    if (going === undefined) throw new Error("the rack drew no look");
    going.presence = 0;
    looksTravelInto(leaving, SHAPE_SECS.value, SHAPE_SECS.value / 2, true);
    expect(leaving).toHaveLength(1);
    expect(going.at).toBeCloseTo(0.5);
    looksTravelInto(leaving, SHAPE_SECS.value, SHAPE_SECS.value, true);
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

  // P294: the count the chain lacked, so that two of one kind share one ceiling's worth of ink.
  it("weighs the looks of one kind standing, off the rack it can hear", () => {
    // One delay claims the whole of the echoes' ceiling; two share it, so the field they leave is
    // the field one delay leaves and the repeats are twice as many (`echoCeiling`).
    expect(looksCrowd(arrived([delay("d")]), "echoes")).toBe(1);
    expect(looksCrowd(arrived([delay("d"), delay("e")]), "echoes")).toBe(2);
    expect(looksCrowd(arrived([delay("d"), delay("e"), delay("f")]), "echoes")).toBe(3);
    // A bypassed one counts nothing, because it is in no set at all — what nobody can hear takes no
    // ink out of the picture and must not dim what the ones that can be heard draw.
    expect(looksCrowd(arrived([delay("d"), delay("e", { bypassed: true })]), "echoes")).toBe(1);
    // And the count is of a kind and never of the rack: a sway standing beside two delays is no
    // part of what the ghosts share, and the echoes are no part of the bend.
    const mixed = arrived([
      delay("d"),
      instance("s", { effect: "sway", params: SWAYING }),
      delay("e"),
    ]);
    expect(looksCrowd(mixed, "echoes")).toBe(2);
    expect(looksCrowd(mixed, "warp")).toBe(1);
    expect(looksCrowd(mixed, "bloom")).toBe(0);
    expect(looksCrowd([], "echoes")).toBe(0);
  });

  // P294: and the half of the crowd that is a travel and not a population.
  it("weighs each of them by how far in it stands, at both ends of the travel", () => {
    // Weighted, which is the bend's shape and not a tally, which is the bend's shape and not a tally: a delay
    // added is nothing of a crowd on the frame it arrives and the whole of one when it has
    // travelled. A whole count here would dim the delay already standing to two delays' share while
    // the newcomer drew nothing at all — a picture whiter than one delay, for as long as the travel
    // takes, which is the one thing the shared ceiling exists to prevent.
    const coming = rackLooks([delay("d"), delay("e")]);
    expect(looksCrowd(coming, "echoes")).toBe(0);
    looksTravelInto(coming, SHAPE_SECS.value, SHAPE_SECS.value / 2, true);
    expect(looksCrowd(coming, "echoes")).toBeCloseTo(1, 10);
    looksTravelInto(coming, SHAPE_SECS.value, SHAPE_SECS.value, true);
    expect(looksCrowd(coming, "echoes")).toBe(2);
    // And a delay heard at half is half a delay's worth, for the same reason: what the ceiling is
    // shared between is the ink about to be laid. Half is a Mix of an eighth, because this entry
    // declares no `full` and so stands all the way in at its own default of a quarter (0202) —
    // spelt out here rather than derived, for the reason the look maths' defaults are.
    const half = arrived([delay("d", { params: { "delay.mix": 0.125 } }), delay("e")]);
    expect(looksCrowd(half, "echoes")).toBeCloseTo(1.5, 10);
    // And a delay the rack has let go of weighs whatever it is still drawing: `carryLooks` keeps it
    // in the set at no presence while its own ladder drains (src/ui/moireCarry.ts), so the crowd
    // falls with the ladder rather than stepping on the frame the set lets go of it.
    const leaving = arrived([delay("d"), delay("e")]);
    const going = leaving[1];
    if (going === undefined) throw new Error("the rack drew no second delay");
    going.presence = 0;
    looksTravelInto(leaving, SHAPE_SECS.value, SHAPE_SECS.value / 2, true);
    expect(going.at).toBeGreaterThan(0);
    expect(looksCrowd(leaving, "echoes")).toBeCloseTo(1.5, 10);
    looksTravelInto(leaving, SHAPE_SECS.value, SHAPE_SECS.value, true);
    expect(looksCrowd(leaving, "echoes")).toBe(1);
  });

  it("saturates the picture's ink by the pops it can hear, and never past the whole of it", () => {
    // A pop wholly in and wholly bright: the Mix is what the mask bites by and the Sheen is what
    // this reading is, so a pop with no sheen sharpens the field and leaves its colour alone.
    const bright = { "pop.mix": 1, "pop.sheen": 1 };
    expect(looksSaturate([])).toBe(0);
    expect(looksSaturate(arrived([instance("p", { effect: "pop", params: bright })]))).toBe(1);
    expect(
      looksSaturate(
        arrived([instance("p", { effect: "pop", params: { ...bright, "pop.sheen": 0 } })]),
      ),
    ).toBe(0);
    // Nothing a bypassed rack says reaches the picture, and neither does a pop nobody can hear:
    // the presence the term is weighted by is the Mix, which is what the entry declares silence at.
    expect(
      looksSaturate(arrived([instance("p", { effect: "pop", params: bright, bypassed: true })])),
    ).toBe(0);
    expect(
      looksSaturate(
        arrived([instance("p", { effect: "pop", params: { ...bright, "pop.mix": 0 } })]),
      ),
    ).toBe(0);
    const half = looksSaturate(
      arrived([instance("p", { effect: "pop", params: { ...bright, "pop.sheen": 0.5 } })]),
    );
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(1);
    // Two sum, and never past the whole of it — the warp's bend said of colour rather than shape.
    expect(
      looksSaturate(
        arrived([
          instance("p", { effect: "pop", params: bright }),
          instance("q", { effect: "pop", params: bright }),
        ]),
      ),
    ).toBe(1);
    // And it is weighted by how much of the pop the picture has actually taken, not by what the
    // knob says: a pop halfway in saturates halfway (`looksTravelInto`, 0279).
    const coming = rackLooks([instance("p", { effect: "pop", params: bright })]);
    looksTravelInto(coming, SHAPE_SECS.value, SHAPE_SECS.value / 2, true);
    expect(looksSaturate(coming)).toBeCloseTo(0.5);
  });

  // P296: one tear per automator standing, each at the presence it has travelled to.
  it("tears the picture once per automator standing, in rack order and never past the cap", () => {
    expect(sharded([]).standing).toBe(0);
    const one = sharded(arrived([instance("x", { effect: "automator" })]));
    expect(one.standing).toBe(1);
    expect(one.at[0]).toBe(1);
    // A run the frame has not read yet holds nothing, and says so rather than poisoning the slot.
    expect(one.held[0]).toBe(0);
    // Two automators, with something that is not one between them: two slots, in the rack's order.
    const two = sharded(
      arrived([
        instance("x", { effect: "automator" }),
        instance("r", { effect: "reverb" }),
        instance("y", { effect: "automator" }),
      ]),
    );
    expect(two.standing).toBe(2);
    expect(Array.from(two.at.subarray(0, 2))).toEqual([1, 1]);
    // Past the cap the count stops, and nothing past it is written.
    const many = sharded(
      arrived(
        Array.from({ length: SHARD_CAP + 2 }, (_each, at) =>
          instance(`x${at}`, { effect: "automator" }),
        ),
      ),
    );
    expect(many.standing).toBe(SHARD_CAP);
    expect(Array.from(many.at).every((presence) => presence === 1)).toBe(true);
    // A bypassed automator is in no set at all, and so in no slot.
    expect(
      sharded(arrived([instance("x", { effect: "automator", bypassed: true })])).standing,
    ).toBe(0);
  });

  // P298: how much each automator's run holds is written onto its look off the frame's read.
  it("writes how much each automator's run holds onto its look, and nought on every other", () => {
    const looks = arrived([
      instance("x", { effect: "automator" }),
      instance("r", { effect: "reverb" }),
      instance("y", { effect: "automator" }),
    ]);
    // Presences summed, so a place halfway in counts for half; a run the read does not hold is a
    // run holding nothing; and the slot is what the cut is handed.
    looksHeldInto(looks, new Map([["x", [place(1), place(1), place(0.5)]]]));
    expect(looks.map((look) => look.held)).toEqual([2.5, 0, 0]);
    expect(Array.from(sharded(looks).held.subarray(0, 2))).toEqual([2.5, 0]);
    // And rewritten every frame, not accumulated.
    looksHeldInto(looks, NO_GROWN);
    expect(looks.map((look) => look.held)).toEqual([0, 0, 0]);
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

  // P290: and how big a piece of the picture each break is, which is the scatters' own spans (0290).
  it("sizes the broken pieces on the spans, as a mean of them and never a sum", () => {
    const sized = (span: number, standing = 3): number =>
      looksShatterSize(
        arrived(
          Array.from({ length: standing }, (_each, at) =>
            instance(`s${at}`, { params: { ...BROKEN, "scatter.span": span } }),
          ),
        ),
      );
    // Nothing scattering says nothing about the size, and a longer window is a bigger piece.
    expect(looksShatterSize([])).toBe(0);
    expect(sized(PARAMS["scatter.span"].min)).toBe(0);
    expect(sized(PARAMS["scatter.span"].max)).toBe(1);
    // A mean and not a sum: two scatters break one field into pieces of one size, and adding a
    // second at the same span leaves that size exactly where it was — how *many* pieces are drawn
    // from elsewhere is the share beside it, which is the reading that does add up.
    expect(sized(0.5, 6)).toBeCloseTo(sized(0.5, 1), 12);
    // Two spans apart stand between them, and nearer the one more of the rack is set to.
    const long = { ...BROKEN, "scatter.span": PARAMS["scatter.span"].max };
    const short = { ...BROKEN, "scatter.span": PARAMS["scatter.span"].min };
    const mixed = looksShatterSize(
      arrived([instance("a", { params: long }), instance("b", { params: short })]),
    );
    expect(mixed).toBeGreaterThan(0);
    expect(mixed).toBeLessThan(1);
    // And it travels: a scatter halfway in weighs half of its own span, on the rate the rest of the
    // picture's shape travels at (0266).
    const arriving = rackLooks([instance("c", { params: long })]);
    looksTravelInto(arriving, SHAPE_SECS.value, SHAPE_SECS.value / 2, true);
    expect(arriving[0]?.at ?? 0).toBeLessThan(1);
    expect(looksShatterSize(arriving)).toBeCloseTo(1, 12);
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
        [],
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

  // P283: and the one thing a look says about the picture that is not drawn as a pass at all.
  it("saturates the set's own ink off the looks the read is handed, and off nothing else", () => {
    const bright = { "pop.mix": 1, "pop.sheen": 1 };
    const built = moireRows(
      [],
      [instance("p", { effect: "pop", params: bright })],
      4,
      PLAIN_CUT,
      null,
      NO_GROWN,
      null,
    );
    looksTravelInto(built.looks, SHAPE_SECS.value, SHAPE_SECS.value, true);
    expect(built.ink.saturate).toBe(0);
    const read = (looks: MoireLook[]): number => {
      filledRows(
        built.rows,
        built.reads,
        { ...emptyDeckPeek(), sounding: 1 },
        1,
        null,
        0,
        null,
        emptyMasterPeek(),
        DRIFT_INK_SECS.value,
        0,
        built.seed,
        built.toward,
        built.ink,
        looks,
        built.jolt,
        shapeRest(),
      );
      return built.ink.saturate;
    };
    // The read travels the ink toward what the standing looks ask for, and a whole reach of it
    // arrives: a pop wholly in and wholly bright is the picture at the whole of its saturation.
    expect(read(built.looks)).toBe(1);
    // And off the looks alone — handed none, the same rows drain it back out again. This is the
    // one line that joins a standing pop to the tile it is filmed through: the pass draws no
    // colour, and the ink is where the Sheen lands (`looksSaturate`, `inkTravelInto`, 0266, 0283).
    expect(read([])).toBe(0);
  });
});
