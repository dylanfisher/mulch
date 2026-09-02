/**
 * @role Tests the wind the standing rack blows the picture with: that the rack's own tail and the
 *   direction it blows are one reading of one population, that the field is blown one way rather
 *   than swept back and forth, and that a population that moves turns the wind rather than
 *   restarting it (0267).
 * @instead The tail's own arithmetic, over the band it is stated on → src/lib/moireSound.test.ts.
 *   The term it becomes on the screen's transform → src/ui/moireScreen.test.ts. The rows the whole
 *   field owns beside this reading → src/ui/moireRowsField.test.ts.
 */
import { describe, expect, it } from "vitest";

import { effectParamDefaults, PARAMS } from "@/audio/params";
import { PLAIN_CUT, RACK_TAIL_BAND, RACK_TAIL_LONGEST_SECS } from "@/lib/moireSound";
import { emptyMasterPeek } from "@/audio/context";
import { emptyDeckPeek } from "@/audio/deckPeek";
import { carryWind } from "@/ui/moireCarry";
import { NO_GROWN } from "@/ui/moireGrown";
import { moireRows, refillRows as filledRows } from "@/ui/moireRows";
import {
  DRIFT_WIND_SECS,
  DRIFT_WIND_TURNS,
  rackWind,
  windRest,
  windTravelInto,
  windVeer,
} from "@/ui/moireWind";
import type { SessionEffect } from "@/state/session";

/**
 * A rack instance the way the session builds one — every parameter its entry declares, through the
 * defaults the session itself would fill (`effectParamDefaults`), at the default unless a case says
 * otherwise. `paramIn` throws on a value an instance does not hold (0030), so a fixture holding half
 * an entry is a fixture no session could produce.
 */
const instance = (
  id: string,
  over: Partial<Pick<SessionEffect, "effect" | "bypassed" | "params">> = {},
): SessionEffect => {
  const effect = over.effect ?? "reverb";
  return {
    id,
    effect,
    bypassed: over.bypassed ?? false,
    params: { ...effectParamDefaults(effect, id), ...over.params },
    automation: {},
    bounds: {},
  };
};

/** A reverb ringing for its longest decay, all the way in — the washiest entry the rack has. */
const RINGING = { "reverb.decay": 8, "reverb.wet": 1 };

// One flat list of the reading's own cases: the tail and the direction are two readings of one
// population taken in one pass, and a case that saw only one of them would not be about a wind. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the wind a standing rack blows the field with", () => {
  it("reads the rack it can hear and nothing else", () => {
    // Nothing standing is no wind at all, which is the picture a dry yard drew before there was a
    // tail in it (0145).
    expect(rackWind([]).tail).toBe(0);
    const ringing = rackWind([instance("a", { params: RINGING })]).tail;
    expect(ringing).toBeGreaterThan(0.9);
    // A bypassed entry is not in the picture at all, which is the test the rows are built through.
    expect(rackWind([instance("a", { params: RINGING, bypassed: true })]).tail).toBe(0);
    // And neither is one turned down to nothing: an eight-second decay at a wet of nothing is a
    // tail nobody can hear, and what nobody can hear is not in the picture (0202).
    expect(rackWind([instance("a", { params: { ...RINGING, "reverb.wet": 0 } })]).tail).toBe(0);
    // An entry that declares no honest presence is out of the tail and still in the population: the
    // automator is the thing doing the fading rather than a sound, and its own settle is everything
    // there is (0239) — read as a tail it would blow the whole field on a yard where nothing rings.
    const automating = [instance("a", { effect: "automator" })];
    expect(rackWind(automating).tail).toBe(0);
    expect(Math.abs(rackWind(automating).veering)).toBe(1);
    expect(rackWind([...automating, instance("b", { params: RINGING })]).tail).toBe(ringing);
    // The longest heard tail and never the sum: a dry entry beside a ringing one changes nothing.
    expect(rackWind([instance("a", { params: RINGING }), instance("b")]).tail).toBe(ringing);
    // And what it is read off is the entry's own `settle` over its own values, so the same entry
    // set shorter reads shorter — no list of which effects are washy exists anywhere (principle 1).
    expect(
      rackWind([instance("a", { params: { ...RINGING, "reverb.decay": 2 } })]).tail,
    ).toBeLessThan(ringing);
  });

  it("bands the tail against the longest one an entry can actually declare", () => {
    // The band's top is `reverb.decay`'s own ceiling, which is the longest thing in the instrument
    // that still falls silent. `lib` may not read the registry (docs/map.md), so the number is
    // written there and tied here: raise the ceiling and this says so rather than the band quietly
    // saturating an octave early.
    expect(RACK_TAIL_LONGEST_SECS).toBe(PARAMS["reverb.decay"].max);
    expect(RACK_TAIL_BAND[1]).toBe(RACK_TAIL_LONGEST_SECS);
  });

  it("folds its direction off the population, so an effect turns the wind and never restarts it", () => {
    // The same rack folds the same way however often it is asked: the direction is the population's
    // and not a draw (0204).
    const rack = [instance("a", { params: RINGING })];
    expect(rackWind(rack).veering).toBe(rackWind(rack).veering);
    // Two answers and two only — a drift along one axis has two directions, and how far and how
    // fast it goes is the tail's.
    for (const seed of [0, 1, 2, 3, 977, 1024]) expect(Math.abs(windVeer(seed))).toBe(1);
    // And a population that moves reaches both of them: an added effect can turn the wind, which is
    // the whole of why the direction is folded off the rack rather than drawn.
    const turned = new Set(
      Array.from(
        { length: 8 },
        (_, standing) =>
          rackWind(Array.from({ length: standing + 1 }, (_each, at) => instance(`entry ${at}`)))
            .veering,
      ),
    );
    expect(turned).toEqual(new Set([-1, 1]));
  });
});

/** A yard's own picture, whose set carries the reading and the travel across it. */
const set = (effects: SessionEffect[]): ReturnType<typeof moireRows> =>
  moireRows([], effects, 4, PLAIN_CUT, null, NO_GROWN, null);

// One flat list of the travel's own cases: the drift, the direction and the carry are three halves
// of one journey, and a case that saw only one of them would not be about a wind at all. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("how that wind travels", () => {
  it("blows the field one way and never back, and blows a dry rack nowhere", () => {
    const wind = windRest();
    // A whole `DRIFT_WIND_SECS` lands the direction outright, and from there the field is blown at
    // the tail's own speed: one way, at a rate, without the crawl's own return (0267).
    windTravelInto(wind, 1, 1, DRIFT_WIND_SECS, DRIFT_WIND_SECS);
    expect(wind.veer).toBe(1);
    const blown = wind.drift;
    windTravelInto(wind, 1, 1, 1, DRIFT_WIND_SECS);
    expect(wind.drift).toBeCloseTo(blown + DRIFT_WIND_TURNS, 10);
    // Wrapped into one turn of a cell, because the screen is a repeating pattern: a wrap there is
    // invisible, and it is what keeps a wind that has blown all day as exact as one a second old.
    for (let step = 0; step < 40; step++) windTravelInto(wind, 1, 1, 1, DRIFT_WIND_SECS);
    expect(wind.drift).toBeGreaterThanOrEqual(0);
    expect(wind.drift).toBeLessThan(1);
    // And a dry rack blows the field nowhere: a short tail is no drift, which is the picture drawn
    // before there was a rack behind it.
    const still = windRest();
    for (let step = 0; step < 60; step++) windTravelInto(still, 1, 0, 1 / 60, DRIFT_WIND_SECS);
    expect(still.veer).toBeGreaterThan(0);
    expect(still.drift).toBe(0);
  });

  it("turns at a rate rather than reversing between two frames, and arrives with no clock", () => {
    const wind = windRest();
    windTravelInto(wind, 1, 1, DRIFT_WIND_SECS, DRIFT_WIND_SECS);
    // A population that moves hands the field the other direction. Taken outright it would reverse
    // the whole picture between two frames, so it is travelled — a whole reversal in
    // `DRIFT_WIND_SECS`, through a moment of standing still (0266's rate, this reading's reach).
    windTravelInto(wind, -1, 1, DRIFT_WIND_SECS / 2, DRIFT_WIND_SECS);
    expect(wind.veer).toBeCloseTo(0, 10);
    windTravelInto(wind, -1, 1, DRIFT_WIND_SECS / 2, DRIFT_WIND_SECS);
    expect(wind.veer).toBeCloseTo(-1, 10);
    // Never past it: a travel that overshot would be a wind blowing harder for having turned.
    windTravelInto(wind, -1, 1, DRIFT_WIND_SECS, DRIFT_WIND_SECS);
    expect(wind.veer).toBe(-1);
    // And a yard with no clock behind it arrives outright and blows nowhere: a halted picture is
    // painted on a commit and never on a frame (0144), so a wind timed against a clock that is not
    // running would blow the field a whole commit's gap in one step.
    const halted = windRest();
    windTravelInto(halted, 1, 1, 30, 0);
    expect(halted.veer).toBe(1);
    expect(halted.drift).toBe(0);
  });

  it("rests on the set beside the wash and the age, read once and never per row", () => {
    const built = set([instance("a", { params: RINGING }), instance("b")]);
    const { tail, veering } = built;
    expect(tail).toBeGreaterThan(0.9);
    // The per-frame read writes the wash and travels the ink; it never touches these two. What they
    // are read off is a plugin's `settle` over a record of its own values, which is an allocation
    // per entry per painting if it is asked on a frame (0070) — and what it is a fact about is what
    // the rack is *set to*, which a rebuild has already answered.
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
    expect(built.tail).toBe(tail);
    expect(built.veering).toBe(veering);
    // And it belongs to the field and to no row: nothing in the picture carries a tail of its own,
    // the way the wash and the age are the set's and not a row's (0213).
    expect(built.rows.some((row) => "tail" in row || "wind" in row)).toBe(false);
  });

  it("keeps how far it has blown across the set a knob touch rebuilds", () => {
    const was = set([instance("a", { params: RINGING })]);
    // The reading and the direction come back with the set, beside the wash and the age: they are
    // facts about what the rack is set to, and a rebuild is what a durable move already is.
    expect(was.tail).toBeGreaterThan(0.9);
    expect(Math.abs(was.veering)).toBe(1);
    expect(was.wind).toEqual(windRest());
    windTravelInto(was.wind, was.veering, was.tail, DRIFT_WIND_SECS, DRIFT_WIND_SECS);
    expect(was.wind.drift).not.toBe(0);
    // A knob touch rebuilds the set, and a fresh one has been blown nowhere — so without the carry
    // the field would drop back to where no wind had ever reached it and set off again on every
    // pointer move, which is a wind that restarts rather than one that turns.
    const now = set([instance("a", { params: { ...RINGING, "reverb.decay": 6 } })]);
    expect(now.wind).toEqual(windRest());
    carryWind(was, now);
    expect(now.wind).toEqual(was.wind);
    // Where it is *going* is the new set's own population and is never carried.
    expect(now.tail).toBeLessThan(was.tail);
  });
});
