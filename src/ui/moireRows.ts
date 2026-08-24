/**
 * @role What a yard's drift is made of before anything draws it: one row per lane it is running,
 *   one per instance its rack is playing, one for its loop — and, for an instance, how the values
 *   it is set to reach that row through the dimensions its registry entry declared. Pure of React
 *   and of the canvas, so the rows a yard makes are read without rendering one.
 * @instead The picture itself, its two sizes and the frame loop → src/ui/MoireStrip.tsx. The
 *   periods, the estimate and what a row means → src/lib/moire.ts. Drawing them →
 *   src/ui/moireCanvas.ts.
 */
import {
  DECK_AUTOMATION_PARAM_IDS,
  effectAutomationParamIds,
  paramIn,
  PARAMS,
  paramKey,
} from "@/audio/params";
import { effectById } from "@/audio/effects/registry";
import { laneSpan } from "@/lib/automation";
import { fold } from "@/lib/copy";
import {
  driftReached,
  DRIFT_REST,
  FLAT_BEND,
  laneBend,
  PLAIN_PROFILE,
  type DriftProfile,
  type DriftReach,
  type MoireRow,
} from "@/lib/moire";
import { normalize } from "@/lib/range";
import type { DeckState } from "@/state/store";

/**
 * One lane as a row: the key `peek()` files its phase under, the period it repeats on, the
 * waveform its parameter draws it with, its own gesture across one cycle, and the profile the
 * effect it belongs to declared. The middle two are what keep two lanes of the same period on
 * different parameters from drawing the same row; the last is what says which kind of thing the
 * knob is on.
 */
export type MoireLane = {
  key: string;
  period: number;
  shape: number;
  bend: readonly number[];
  profile: DriftProfile;
};

/**
 * Every lane this deck is actually running — its own and every rack instance's — each with the
 * period `laneSpan` reports for it, which P53 made something a gesture edits (0079). A lane that
 * never moved has no period and is not a row: an unmoving line is not drift.
 */
export function deckLanes(
  automation: DeckState["automation"],
  effects: DeckState["effects"],
): MoireLane[] {
  const lanes: MoireLane[] = [];
  for (const param of DECK_AUTOMATION_PARAM_IDS) {
    const lane = automation[param];
    if (lane === undefined || laneSpan(lane) <= 0) continue;
    lanes.push({
      key: paramKey(null, param),
      period: laneSpan(lane),
      // The parameter and not the key: a row's shape says which knob is drifting, so the same
      // knob on two rack instances reads as the same kind of row and their gestures separate them.
      shape: fold(param),
      bend: laneBend(lane),
      // A deck's own knob belongs to no effect, so it is cut to the plain grating the loop is.
      profile: PLAIN_PROFILE,
    });
  }
  for (const instance of effects) {
    // What the rack skips (src/audio/effects/rack.ts) is not in the signal path, so neither its
    // own row nor any lane riding it is in the picture: a bypassed instance is a sound nobody can
    // hear (0139). It leaves while the switch is off and comes back unchanged when it is on,
    // because nothing about a row is stored.
    if (instance.bypassed) continue;
    for (const param of effectAutomationParamIds(instance.effect)) {
      const lane = instance.automation[param];
      if (lane === undefined || laneSpan(lane) <= 0) continue;
      lanes.push({
        key: paramKey(instance.id, param),
        period: laneSpan(lane),
        shape: fold(param),
        bend: laneBend(lane),
        // A lane on an effect's knob is that effect doing something, so it is cut to the profile
        // the registry entry declares, exactly as the instance's own row below is.
        profile: effectById(instance.effect).drift,
      });
    }
  }
  return lanes;
}

/**
 * Where each value an instance's registry entry declared a way into the picture for stands in its
 * own range, as a turn on 0..1 — what `driftReached` folds into the row. Read off the value the
 * session holds rather than off a lane: the value is what is read, not whether it is automated, so
 * a knob at rest still says what its effect is doing and a lane on that knob goes on bending the
 * row it already bends (0139).
 */
export function effectReach(instance: DeckState["effects"][number]): DriftReach[] {
  return effectById(instance.effect).driftFrom.map(({ param, into }) => {
    const spec = PARAMS[param];
    return {
      into,
      turn: normalize(paramIn(instance.params, param), spec.min, spec.max, spec.curve),
    };
  });
}

/**
 * The picture's rows at their own zero, and beside them where each one's phase is read from — a
 * lane's key, or null for a row no lane drives. Only `phase` moves after this.
 *
 * Every lane carries its own identity, the waveform its parameter draws and its own bend. Every
 * instance the rack is playing carries a row too, whether or not anything is automating it: its
 * identity is folded out of its own id the way its name already is (0076), and the rest of it —
 * how long it runs, how deep it cuts, how fine it is drawn, how far it breathes — is what the
 * effect is set to, through the dimensions its registry entry declared (0139). A bypassed instance
 * carries none: what nobody can hear is not in the picture. The loop belongs to no parameter, so
 * it draws the plainest row there is and bends nothing: it is the reference the others are read
 * against, not another gesture.
 */
export function moireRows(
  lanes: readonly MoireLane[],
  effects: DeckState["effects"],
  loopPeriod: number,
): { rows: MoireRow[]; keys: (string | null)[] } {
  const rows: MoireRow[] = lanes.map(({ period, shape, bend, profile }) => ({
    period,
    phase: 0,
    reference: false,
    shape,
    bend,
    profile,
    ...DRIFT_REST,
  }));
  const keys: (string | null)[] = lanes.map(({ key }) => key);
  for (const instance of effects) {
    if (instance.bypassed) continue;
    // The fold is still the row's identity — its angle and where in its cycle it starts — and what
    // the effect is set to is the rest of it, through the dimensions its registry entry declared.
    const seed = fold(instance.id);
    rows.push({
      ...driftReached(seed, effectReach(instance)),
      phase: 0,
      reference: false,
      shape: seed,
      profile: effectById(instance.effect).drift,
    });
    keys.push(null);
  }
  if (loopPeriod > 0) {
    rows.push({
      period: loopPeriod,
      phase: 0,
      reference: true,
      shape: 0,
      bend: FLAT_BEND,
      profile: PLAIN_PROFILE,
      ...DRIFT_REST,
    });
    keys.push(null);
  }
  return { rows, keys };
}

/**
 * Whether a surface holding these rows belongs on the frame loop. The one answer both sizes ask.
 * A halted yard is painted but not animated: `laneNow()` freezes on a halt and the playhead holds
 * where it stopped (0040), so every phase is the phase the last frame drew — an idle page runs
 * zero frames (src/ui/frame.ts), and a picture that is not moving is a commit, not a subscription.
 */
export const paintsPerFrame = (playing: boolean, rows: number): boolean => playing && rows > 0;
