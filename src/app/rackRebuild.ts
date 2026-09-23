/**
 * @role A rack emptied and built again from the session's own entries — the walk a restored
 *   session makes over the rack that is no yard's, and the one a Stop pressed on a session that is
 *   already stopped makes over every rack there is, because fresh nodes are what a tail cannot
 *   survive (0390).
 * @instead The host that holds the racks and decides when to call this → src/app/engine.ts, which
 *   is at its cap. What a rack rewire does to the graph → src/audio/effects/rack.ts.
 */
import type { DeckVoice } from "@/audio/deckVoice";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { effectAutomationParamIds, paramIn, PARAMS } from "@/audio/params";
import { playedLane } from "@/lib/automation";
import type { MasterEffects } from "@/audio/masterEffects";
import { effectSnapshot, type SessionEffect } from "@/state/session";
import { deckIn, type DeckId, type SessionState } from "@/state/store";

/**
 * The rewires this walk asks for, which a yard's voice and the master rack both answer: one shape
 * for both, so the rebuild is written once whichever rack it is standing over (0320, 0321).
 */
export type RackBuilder = Pick<
  DeckVoice,
  "addEffect" | "setEffectBounds" | "setEffectBypass" | "removeEffect" | "setAutomation"
>;

/**
 * And the two a rebuilt rack has to be told again. A rack remembers neither: `setSync` and
 * `setTempo` fan a number out over the instances standing at the moment of the call, and a fresh
 * instance is built from its values alone (src/audio/effects/rack.ts) — so an entry that paces
 * itself by the session's clock comes back at its own nought unless the clock is pushed down
 * behind the rebuild. Every other rebuild in the app already does this beside itself (0097, 0371).
 */
export type SilencedRack = RackBuilder & Pick<DeckVoice, "setSync" | "setTempo">;

/** The session's clock as a rack takes it: the shared jump clock, and the beat that rack counts on. */
export type RackClocks = { sync: number | null; tempo: (deck: DeckId | null) => number };

/**
 * Every lane one stored instance holds, armed against its own binding and its own manual value —
 * each of them read through the window the instance holds it inside, because the graph hears the
 * squeezed gesture and never the stored one (0393). An instance's lanes are held beside its values
 * and go with it, so there is nothing here that could name a binding the rack does not have (0030).
 */
export function armInstanceLanes(
  voice: Pick<DeckVoice, "setAutomation">,
  entry: SessionEffect,
): void {
  for (const param of effectAutomationParamIds(entry.effect)) {
    const lane = entry.automation[param];
    if (lane !== undefined) {
      const played = playedLane(lane, PARAMS[param], entry.laneBounds[param]);
      voice.setAutomation(entry.id, param, played, paramIn(entry.params, param));
    }
  }
}

/**
 * One rack torn down and stood up again as exactly `effects`, in the order a restore already uses:
 * the instances, their windows, their bypass, then their lanes — each naming an instance the rack
 * must already hold by then (0023, 0027, 0030, 0208). `held` is what to take away first, which is
 * the rack's own answer where it may differ from the session and the session's ids where it may
 * not.
 */
export function rebuildRack(
  rack: RackBuilder,
  held: readonly EffectInstanceId[],
  effects: readonly SessionEffect[],
): void {
  for (const instance of held) rack.removeEffect(instance);
  for (const entry of effects) {
    rack.addEffect(entry.id, entry.effect, entry.params);
    rack.setEffectBounds(entry.id, entry.bounds);
  }
  for (const entry of effects) if (entry.bypassed) rack.setEffectBypass(entry.id, true);
  for (const entry of effects) armInstanceLanes(rack, entry);
}

/**
 * Every rack in the session put back the way it is written down — the yards' and then the one that
 * is no yard's. Nothing durable moves: each rack is rebuilt out of the entries it already holds,
 * so what is lost is only what the nodes were carrying, which is the point. A delay line and a
 * reverb are memory, and the only way to have a rack forget is to give it new nodes: there is no
 * parameter for "empty what you are holding", and turning the mix down leaves the loop circulating
 * behind it (0390).
 *
 * The yards are asked by the session's own ids rather than by the racks' — a voice answers no
 * `held()`, and a rack that disagreed with the session would be a bug everywhere else in the app
 * (principle 5). The master is asked for its own, the way a restore asks it.
 */
export function silenceRacks(
  master: SilencedRack & { held(): EffectInstanceId[] },
  voices: Iterable<readonly [DeckId, SilencedRack]>,
  state: SessionState,
  clocks: RackClocks,
): void {
  const stand = (rack: SilencedRack, deck: DeckId | null): void => {
    rack.setSync(clocks.sync);
    rack.setTempo(clocks.tempo(deck));
  };
  for (const [deck, voice] of voices) {
    const { effects } = deckIn(state.decks, deck);
    rebuildRack(
      voice,
      effects.map((entry) => entry.id),
      effects,
    );
    stand(voice, deck);
  }
  rebuildRack(master, master.held(), state.master.effects);
  stand(master, null);
}

/**
 * Whether two racks are the same rack, through the one durable projection: a rack state has
 * exactly one JSON, which is what history's own comparison rests on (0021).
 */
const sameRack = (held: readonly SessionEffect[], wanted: readonly SessionEffect[]): boolean =>
  JSON.stringify(held.map((entry) => effectSnapshot(entry))) ===
  JSON.stringify(wanted.map((entry) => effectSnapshot(entry)));

/**
 * The master rack emptied and rebuilt to be exactly what a restored session holds, in the order
 * restoration already uses: the instances, their windows, their bypass, then their lanes — each
 * naming an instance the rack must already hold (0023, 0027, 0030, 0208).
 *
 * **Nothing happens where the rack is already that rack**, which is most restores: a checkpoint is
 * the whole session, so an undo of a knob on one yard would otherwise tear down and rebuild every
 * master instance's nodes — cutting a master reverb's tail on an edit that was nothing to do with
 * it. A voice does not have this problem because it is prepared beside the live one and crossfaded;
 * there is one master bus, so the comparison is what stands in for that (0321).
 */
// Its own export rather than inside src/app/engine.ts's `prepareRestore` commit, which needs a real
// AudioContext to reach — and what is worth pinning is the comparison above, not the context.
export function restoreMaster(
  master: MasterEffects,
  held: readonly SessionEffect[],
  effects: readonly SessionEffect[],
): void {
  if (sameRack(held, effects)) return;
  rebuildRack(master, master.held(), effects);
}
