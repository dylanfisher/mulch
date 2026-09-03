/**
 * @role The jolt the whole picture answers a hit with: the third band of the one crest reading, the
 *   distance the walk just jumped, the snap up and the fall back, and the floor it lays under every
 *   row's own reading — which is the extreme movement the picture used to make only when a rack
 *   changed (0271).
 * @instead The other two bands of the same reading, and the wash they buy →
 *   src/ui/moireRowsField.test.ts. The rows a set holds and the read that fills them →
 *   src/ui/moireRows.test.ts. A row joining the picture or leaving it → src/ui/moireArrival.test.ts.
 */
import { describe, expect, it } from "vitest";

import { emptyDeckPeek } from "@/audio/deckPeek";
import { emptyMasterPeek } from "@/audio/context";
import { DRIFT_AGE_FLOOR } from "@/lib/moireAge";
import { fractalStopsRest } from "@/lib/moireFractal";
import { PLAIN_CUT, WASH_CREST_SMEARED, WASH_CREST_STRUCK, washAmount } from "@/lib/moireSound";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { oneSong } from "@/lib/playerSongs";
import { playerWalk } from "@/lib/playerWalk";
import { NO_GROWN } from "@/ui/moireGrown";
import {
  DRIFT_JOLT_SECS,
  JOLT_CREST_HIT,
  joltHeard,
  joltInto,
  joltRest,
  joltWalked,
} from "@/ui/moireJolt";
import { moireRows, refillRows } from "@/ui/moireRows";
import { screenInkRest } from "@/ui/moireScreenInk";
import { shapeRest } from "@/ui/moireShape";
import type { PlayerPeek } from "@/audio/deckPeek";
import type { PlayerSpec } from "@/lib/player";

/** A window loud enough to be heard at all, which is what a crest is only a reading of beside. */
const HEARD = 0.5;

/** A yard's pattern, arranged as nothing and otherwise exactly what a switch press leaves. */
const JUMPING: PlayerSpec = { seed: 7, ...PLAYER_DEFAULTS, songs: oneSong([]) };

/** The walk standing on `slot`, as the read hands one over. */
const standingOn = (slot: number, at: number | null, dropped = false): PlayerPeek => ({
  ...emptyDeckPeek().player,
  step: { ...playerWalk(JUMPING)(), slot, dropped },
  at,
});

describe("the jolt the picture answers a hit with", () => {
  /**
   * One crest, three bands. Under the smeared crest the field washes and jolts nothing; between the
   * two the picture says nothing about the shape of the window at all; past the struck crest the
   * wash is already nought and the jolt is what the reading has left to say.
   */
  it("reads a struck window as a jolt exactly where the wash has stopped reading", () => {
    expect(joltHeard(WASH_CREST_SMEARED, HEARD)).toBe(0);
    expect(washAmount(WASH_CREST_SMEARED, HEARD)).toBe(1);
    expect(joltHeard(WASH_CREST_STRUCK, HEARD)).toBe(0);
    expect(washAmount(WASH_CREST_STRUCK, HEARD)).toBe(0);
    const between = (WASH_CREST_STRUCK + JOLT_CREST_HIT.value) / 2;
    expect(joltHeard(between, HEARD)).toBeCloseTo(0.5, 9);
    expect(joltHeard(JOLT_CREST_HIT.value, HEARD)).toBe(1);
    expect(joltHeard(JOLT_CREST_HIT.value * 2, HEARD)).toBe(1);
    // And silence is not a hit, for the reason silence is not a wash.
    expect(joltHeard(JOLT_CREST_HIT.value, 0)).toBe(0);
    expect(joltHeard(0, HEARD)).toBe(0);
  });

  /**
   * And the walk's own strike is the distance it jumped rather than the fact that it stepped: a
   * pattern creeping round its neighbours is not the thing worth throwing the picture for.
   */
  it("jolts on how far the walk jumped, once per landing, and not at all on a hole", () => {
    const jolt = joltRest();
    // Nothing to measure from yet: the first landing of a pass is the jolt's first ordinal.
    expect(joltWalked(standingOn(0, 0), jolt)).toBe(0);
    joltInto(jolt, 0, standingOn(0, 0), 1, 0, DRIFT_JOLT_SECS.value);
    expect(jolt.slot).toBe(0);

    // The far side of the ring is the whole strike, and one slot along is the least of one.
    expect(joltWalked(standingOn(PLAYER_SLOTS / 2, 1), jolt)).toBe(1);
    expect(joltWalked(standingOn(1, 1), jolt)).toBeCloseTo(2 / PLAYER_SLOTS, 9);
    // The ring wraps: the slot below the top of the loop is one step away and not fifteen.
    expect(joltWalked(standingOn(PLAYER_SLOTS - 1, 1), jolt)).toBeCloseTo(2 / PLAYER_SLOTS, 9);
    // A hole has nothing anyone can hear, so it throws nothing.
    expect(joltWalked(standingOn(PLAYER_SLOTS / 2, 1, true), jolt)).toBe(0);

    // And once per landing: the same ordinal standing a second frame strikes nothing more.
    joltInto(jolt, 1, standingOn(PLAYER_SLOTS / 2, 1), 1, 0, DRIFT_JOLT_SECS.value);
    expect(joltWalked(standingOn(PLAYER_SLOTS / 2, 1), jolt)).toBe(0);
  });

  /**
   * And the shape of the jolt itself: up outright, because a hit that eased in is not a hit, and
   * down at a rate, because one that vanished on the next frame is not a jolt.
   */
  it("snaps up to a hit outright and falls back over the jolt", () => {
    const jolt = joltRest();
    const still = standingOn(0, null);
    joltInto(jolt, 1, still, 1, 0, DRIFT_JOLT_SECS.value);
    expect(jolt.at).toBe(1);
    joltInto(jolt, 0, still, 1, DRIFT_JOLT_SECS.value / 2, DRIFT_JOLT_SECS.value);
    expect(jolt.at).toBeCloseTo(0.5, 9);
    joltInto(jolt, 0, still, 1, DRIFT_JOLT_SECS.value, DRIFT_JOLT_SECS.value);
    expect(jolt.at).toBe(0);
    // And no fall at all where there is no clock to fall against, which is a halted yard.
    joltInto(jolt, 1, still, 1, 0, 0);
    joltInto(jolt, 0, still, 1, 0.05, 0);
    expect(jolt.at).toBe(0);
  });

  /**
   * And how far a hit is allowed to throw: over half the room on a fresh performance and over the
   * whole of it on one that has been running — the age widening what a term may reach rather than
   * inventing one.
   */
  it("throws a fresh picture over half the room and an old one over all of it", () => {
    const fresh = joltRest();
    joltInto(fresh, 1, standingOn(0, null), 0, 0, DRIFT_JOLT_SECS.value);
    expect(fresh.at).toBeCloseTo(DRIFT_AGE_FLOOR.value, 9);
    const old = joltRest();
    joltInto(old, 1, standingOn(0, null), 1, 0, DRIFT_JOLT_SECS.value);
    expect(old.at).toBe(1);
  });

  /**
   * And where it is actually spent: as a floor under every row's own reading. A row nothing is
   * metering rests at nought, and under a jolt the whole picture reads as hard-worked at once —
   * which is the same movement the picture used to make only when the rack changed.
   */
  it("lays the field's jolt under every row's own reading", () => {
    const set = moireRows([], [], 4, PLAIN_CUT, null, NO_GROWN, null);
    const peek = emptyDeckPeek();
    peek.sounding = 1;
    peek.meter = HEARD;
    peek.crest = JOLT_CREST_HIT.value;
    refillRows(
      set.rows,
      set.reads,
      peek,
      1,
      null,
      4,
      null,
      emptyMasterPeek(),
      0.05,
      1,
      fractalStopsRest(),
      fractalStopsRest(),
      screenInkRest(),
      [],
      set.jolt,
      shapeRest(),
    );
    expect(set.jolt.at).toBe(1);
    for (const row of set.rows) expect(row.pulse).toBe(1);
  });
});
