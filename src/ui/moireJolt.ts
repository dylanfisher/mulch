/**
 * @role The jolt the whole picture answers a hit with: how hard the output just struck, how far the
 *   walk just jumped, how far a jolt throws the picture at all, and the one step that snaps it up
 *   and lets it fall. A reading of what the yard is doing and never a parameter — no registry entry
 *   declares it and nothing about it is durable (0145, 0128) — so it rests on the field the way the
 *   wash does (0213) and belongs to no row.
 * @instead The other end of the one crest reading, and every other reading of a sound →
 *   src/lib/moireSound.ts, whose band this one begins where it leaves off. Where the jolt is
 *   actually spent — every row's own `pulse`, and through it the depth every row is cut at and the
 *   anchor every drifting row is thrown around → `refillRows` in src/ui/moireRows.ts,
 *   `pulsedDepth` in src/lib/moireSound.ts and `driftedCentre` in src/lib/moire.ts. How far the
 *   performance's own age lets one throw → `agedJolt` in src/lib/moireAge.ts. Keeping a jolt
 *   mid-fall across a rebuilt set → src/ui/moireCarry.ts.
 */
import { easedToward } from "@/lib/moire";
import { agedJolt } from "@/lib/moireAge";
import { WASH_CREST_STRUCK, WASH_HEARD_FLOOR } from "@/lib/moireSound";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { clamp, normalize } from "@/lib/range";
import type { PlayerPeek } from "@/audio/deckPeek";
import { tunable } from "@/lib/moireTuning";
import { cellPushRest, type MoireCellPush } from "@/ui/moireCellPush";

/**
 * How hard the picture is jolting and what it last jolted for. Two numbers, because a jolt is an
 * accumulation and a landing is an event: without the ordinal the walk's own strike would be taken
 * again at every frame of one landing, which is a jolt held up rather than a jolt.
 */
export type MoireJolt = {
  /** How hard the whole field is jolting right now, nothing to wholly. */
  at: number;
  /**
   * And which landing of this pass it last read — the ordinal `peek()` already counts
   * (`PlayerPeek.at`), so a landing strikes on the frame the walk steps onto it and never again.
   * Null while nothing has stood at all.
   */
  landing: number | null;
  /**
   * And which landings are still pushing the marks, and where each of them stands on the picture:
   * the same event this jolt is struck by, read where the whole field answers it at once and read
   * again here for the row it landed on (`cellPushInto`, src/ui/moireCellPush.ts). On the jolt
   * rather than beside it because it is one landing and one reading of it (principle 1), and so
   * that what carries a jolt mid-fall across a rebuilt set carries the flares with it
   * (`carryJolt`, src/ui/moireCarry.ts).
   */
  pushes: MoireCellPush[];
  /**
   * And which slot that landing read from, which is the only thing the strike is measured against:
   * how far the walk jumped is a distance on the grid, and an ordinal is a count of steps rather
   * than a place on it. Null for the same frames the ordinal is.
   */
  slot: number | null;
};

/** Where a jolt stands before anything has struck it: still, and nothing struck yet. */
export const joltRest = (): MoireJolt => ({
  at: 0,
  landing: null,
  slot: null,
  pushes: cellPushRest(),
});

/**
 * The crest a window jolts the picture wholly at. **The third band of the one crest reading**, and
 * it begins exactly where the wash's leaves off: under `WASH_CREST_SMEARED` the gaps between the
 * transients are filled and the field washes, between that and `WASH_CREST_STRUCK` the picture says
 * nothing about the shape of the window at all, and past `WASH_CREST_STRUCK` there is a transient
 * standing further and further clear of everything around it — which is the hit. One reading, three
 * bands, no second measurement of the same window (principle 1).
 *
 * Twenty, because eight is already "a hit with room either side of it": what stands twenty times
 * its own window's mean power is a struck skin in near silence, and nothing an instrument sustains
 * reaches it. Under that the jolt is the fraction of the way it got.
 */
export const JOLT_CREST_HIT = tunable("jolt.crest", 20, { min: 8, max: 40, step: 1 });

/**
 * How hard the output just struck, from the crest of its own window and the level beside it —
 * nought everywhere the wash has anything to say, and one under a transient standing wholly clear.
 * **Silence is not a hit**, for the reason silence is not a wash: a crest of nought is the analyser
 * saying it measured nothing, and a window under the heard floor is a yard drawing the picture it
 * drew before there was a reading (0145).
 */
export const joltHeard = (crest: number, level: number): number =>
  Number.isFinite(crest) && crest > 0 && level >= WASH_HEARD_FLOOR
    ? normalize(
        clamp(crest, WASH_CREST_STRUCK, JOLT_CREST_HIT.value),
        WASH_CREST_STRUCK,
        JOLT_CREST_HIT.value,
      )
    : 0;

/**
 * The furthest two slots of the grid can stand apart. The grid is a ring — a walk crosses the top
 * of the loop like any other boundary — so the far side of it is half the slots away and no jump
 * is longer than that.
 */
const JOLT_SLOTS_APART = PLAYER_SLOTS / 2;

/**
 * How hard the landing the walk has just stepped onto strikes the picture: how far it jumped, as a
 * share of the furthest it could. **The distance and not the fact of a step**, because a pattern
 * creeping round its neighbours and a pattern thrown across the loop are two different things to
 * watch and one of them is the one worth jolting for — and it is the same fact the module's own row
 * already draws in steps, read here for what it does to the whole field rather than to that row
 * (0157).
 *
 * **A hole strikes nothing**: a landing scheduled and never opened has nothing anyone can hear, and
 * what nobody can hear is not in the picture — the same test every row in it is built through.
 *
 * Nought until the walk has stepped somewhere from somewhere: the first landing of a pass has no
 * distance behind it, so it is the jolt's first ordinal and not its first strike.
 */
export function joltWalked(player: Readonly<PlayerPeek>, jolt: Readonly<MoireJolt>): number {
  const step = player.step;
  if (step === null || player.at === null || player.at === jolt.landing) return 0;
  if (jolt.slot === null || step.dropped) return 0;
  const apart = Math.abs(step.slot - jolt.slot);
  return clamp(Math.min(apart, PLAYER_SLOTS - apart) / JOLT_SLOTS_APART, 0, 1);
}

/**
 * How long a whole jolt takes to fall back, in seconds. **Under a second and a half**, which is the
 * length the eye reads as one lurch and its recovery: past a couple of seconds the field never
 * comes to rest between two hits of an ordinary pattern and the picture is permanently thrown,
 * which is the flash this replaced said continuously instead of once (0271). Far shorter than a
 * wind's turn (`DRIFT_WIND_SECS`, src/ui/moireWind.ts), because a wind is a population changing and
 * a jolt is a hit.
 */
export const DRIFT_JOLT_SECS = tunable("jolt.secs", 1.5, { min: 0.1, max: 6, step: 0.1 });

/** The whole travel a jolt has: nothing to wholly. */
const JOLT_REACH = tunable("jolt.reach", 1, { min: 0.5, max: 2, step: 0.1 });

/**
 * One step of the jolt: up to whatever struck this frame outright, and back down at the rate a
 * whole fall takes `over` seconds. **Up outright and down rated, which is the whole shape of it** —
 * a hit that eased in is not a hit, and a hit that vanished on the next frame is not a jolt.
 *
 * How hard the strike is allowed to throw the picture is `agedJolt`: a fresh performance jolts over
 * half the band and one that has been running throws the whole of it, which is the age widening
 * what a term may reach rather than inventing one (0141, 0251).
 *
 * Falls outright where there is no clock to fall against, which is the answer the ink, the wind and
 * a row's own arrival all give a halted yard (0144, 0266, 0270).
 */
export function joltInto(
  jolt: MoireJolt,
  struck: number,
  player: Readonly<PlayerPeek>,
  age: number,
  elapsed: number,
  over: number,
): void {
  jolt.landing = player.at;
  jolt.slot = player.step?.slot ?? null;
  const thrown = agedJolt(clamp(struck, 0, 1), age);
  jolt.at =
    thrown > jolt.at ? thrown : easedToward(jolt.at, thrown, elapsed, over, JOLT_REACH.value);
}
