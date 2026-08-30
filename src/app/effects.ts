/**
 * @role The rack commands: what adding, copying, bounding, bypassing, removing and reordering one
 *   effect instance do to the session, the graph and the log. Its own file beside ./clips.ts and
 *   ./deckPlayer.ts for the same reason those are — one subject's reducers, reached from
 *   ./execute.ts's one switch and nowhere else (0007, 0023).
 * @instead The rewire each of these performs → src/audio/effects/rack.ts, which knows nothing of
 *   commands. What an instance's window means to the run inside it →
 *   src/audio/effects/automator.ts.
 */
import {
  effectAutomationParamIds,
  effectParamDefaults,
  effectParamIds,
  paramIn,
  PARAMS,
} from "@/audio/params";
import { assertEffectInstanceId, type EffectInstanceId } from "@/audio/effects/contract";
import { effectById } from "@/audio/effects/registry";
import { clamp } from "@/lib/range";
import { deckIn, patchDeck, type DeckState } from "@/state/store";
import type { EffectBounds, SessionEffect } from "@/state/session";
import type { Command, GroupedEditCommand } from "./commands";
import { boundsCommands } from "./restore";
import type { Runtime } from "./runtime";

/**
 * One instance rewritten in place, leaving every other entry's identity untouched. Exported
 * because a value and a lane are written onto an instance from ./execute.ts through the very same
 * rewrite, and two of these is two authorities on what "the rest of the rack is untouched" means.
 */
export function patchInstance(
  deck: DeckState,
  instance: EffectInstanceId,
  patch: (entry: SessionEffect) => SessionEffect,
): SessionEffect[] {
  return deck.effects.map((entry) => (entry.id === instance ? patch(entry) : entry));
}

/**
 * An instance arriving. The id is the caller's, opaque and durable, so a rack may hold two
 * delays and each is addressed by the name whoever added it wrote. Only a repeated *instance* id
 * is refused — adding a second instance of an effect the rack already holds is the point (0030).
 */
export function addEffect(cmd: Extract<Command, { t: "effect.add" }>, rt: Runtime): void {
  const deck = deckIn(rt.store.getState().decks, cmd.deck);
  if (deck.effects.some((entry) => entry.id === cmd.id)) {
    rt.bus.emit({ t: "error", detail: `deck ${cmd.deck}: instance already held: ${cmd.id}` });
    return;
  }

  // A fresh instance starts at its plugin's declared defaults: values are the instance's, so
  // there is nothing on the deck for a second delay to inherit from the first (0030).
  const params = effectParamDefaults(cmd.effect, cmd.id);
  // Graph construction and reconnection happen first. If either throws, the session and event
  // stream remain unchanged; without a host, the ordered state still behaves like param.set.
  const index = rt.engine?.addEffect(cmd.deck, cmd.id, cmd.effect, params) ?? deck.effects.length;
  patchDeck(rt.store, cmd.deck, {
    effects: [
      ...deck.effects,
      { id: cmd.id, effect: cmd.effect, bypassed: false, params, automation: {}, bounds: {} },
    ],
  });
  rt.bus.emit({
    t: "effect.added",
    deck: cmd.deck,
    instance: cmd.id,
    effect: cmd.effect,
    index,
  });
}

/**
 * One instance again, immediately after the one it copies. The copy arrives the way a restored
 * instance does — `effect.add`, then its values, then its bypass — as one grouped, undoable
 * durable edit, so duplicating is not a second way to build a rack entry (0078, 0092).
 *
 * Where it lands is the `effect.reorder` inside that group, exactly as a yard's copy lands under
 * the yard it came from (0111): `effect.add` has only ever meant *at the end*, and an index field
 * on it would be a second way to say where an instance goes.
 *
 * What it does not share with the original is exactly the identity: its own opaque id, and the
 * name and ordinal its card reads out of that id (0076, 0081). Everything else it holds it takes,
 * lanes included — the reason to copy an instance is to keep what was ridden onto it and move it,
 * and a yard's copy has always agreed (0092 amended).
 */
export async function duplicateEffect(
  cmd: Extract<Command, { t: "effect.duplicate" }>,
  rt: Runtime,
): Promise<void> {
  assertEffectInstanceId(cmd.instance, "effect.duplicate instance");
  assertEffectInstanceId(cmd.id, "effect.duplicate id");
  const rack = rackOf(cmd, rt);
  if (rack === null) return;
  // Refused here rather than left to the `effect.add` inside the group: that one would report
  // the clash and the values behind it would then rewrite the instance already under that id.
  if (rack.deck.effects.some((entry) => entry.id === cmd.id)) {
    rt.bus.emit({ t: "error", detail: `effect.duplicate: instance already held: ${cmd.id}` });
    return;
  }
  const copied = rack.entry;
  await rt.historyGroup([
    { t: "effect.add", deck: cmd.deck, id: cmd.id, effect: copied.effect },
    // Straight after the add, which appends: the copy is moved next to its original inside the
    // group, so a rack and a yard list agree about where a copy goes (0111).
    { t: "effect.reorder", deck: cmd.deck, instance: cmd.id, index: rack.index + 1 },
    ...effectParamIds(copied.effect).map((param): GroupedEditCommand => ({
      t: "param.set",
      deck: cmd.deck,
      instance: cmd.id,
      param,
      value: paramIn(copied.params, param),
    })),
    { t: "effect.bypass", deck: cmd.deck, instance: cmd.id, bypassed: copied.bypassed },
    // What the original's run was allowed to draw goes with it, for the reason its lanes do: the
    // reason to copy an instance is to keep what was done to it (0092, 0208).
    ...boundsCommands(cmd.deck, cmd.id, copied.bounds),
    // Last, and after the values they fall back to: the restoration order a preset is hydrated
    // in, because this is the same expansion (0027).
    ...effectAutomationParamIds(copied.effect).flatMap((param): GroupedEditCommand[] => {
      const lane = copied.automation[param];
      return lane === undefined
        ? []
        : [{ t: "automation.set", deck: cmd.deck, instance: cmd.id, param, points: lane }];
    }),
  ]);
  rt.bus.emit({
    t: "effect.duplicated",
    deck: cmd.deck,
    instance: cmd.instance,
    to: cmd.id,
    effect: copied.effect,
  });
}

/**
 * The instance an operation names, or an error on the log saying it was not there. Naming an
 * instance the deck does not hold is unanswerable, not malformed: a stale macro is exactly the
 * case the log exists for, and it must change nothing (0023).
 */
function rackOf(
  cmd: Extract<Command, { t: `effect.${string}` }>,
  rt: Runtime,
): { deck: DeckState; entry: SessionEffect; index: number } | null {
  if (!("instance" in cmd)) throw new TypeError(`${cmd.t} names no instance`);
  const deck = deckIn(rt.store.getState().decks, cmd.deck);
  const index = deck.effects.findIndex((entry) => entry.id === cmd.instance);
  const entry = deck.effects[index];
  if (entry === undefined) {
    rt.bus.emit({ t: "error", detail: `deck ${cmd.deck}: instance is not held: ${cmd.instance}` });
    return null;
  }
  return { deck, entry, index };
}

/**
 * One window on one thing an instance's run may draw, or that parameter's own declared range
 * back. Clamped into that range rather than refused, exactly as a value is, and stored low end
 * first however the two ends arrived — a window handed over upside down is the same window.
 *
 * The graph is told first, and it answers by crossfading the whole run into a redrawn one: what
 * may be drawn has changed, so the population drawn under the old window leaves the way anything
 * leaves (0207, 0208).
 */
export function boundEffect(cmd: Extract<Command, { t: "effect.bounds" }>, rt: Runtime): void {
  const rack = rackOf(cmd, rt);
  if (rack === null) return;
  if (effectById(rack.entry.effect).grows !== true) {
    rt.bus.emit({
      t: "error",
      detail: `effect.bounds: ${rack.entry.effect} draws nothing: ${cmd.instance}`,
    });
    return;
  }
  const spec = PARAMS[cmd.param];
  const bounds: EffectBounds = { ...rack.entry.bounds };
  if (cmd.bounds === null) delete bounds[cmd.param];
  else {
    bounds[cmd.param] = {
      min: clamp(Math.min(cmd.bounds.min, cmd.bounds.max), spec.min, spec.max),
      max: clamp(Math.max(cmd.bounds.min, cmd.bounds.max), spec.min, spec.max),
    };
  }
  // Already there: no redraw, no durable change, and therefore nothing to say — the guard
  // `effect.bypass` carries, and it earns its keep here because the graph's answer to a window is
  // to fade the whole run out and draw it again (0207). A thumb pressed and let go where it stood
  // would otherwise re-phase the population.
  const was = rack.entry.bounds[cmd.param];
  const now = bounds[cmd.param];
  if (was?.min === now?.min && was?.max === now?.max) return;
  rt.engine?.setEffectBounds(cmd.deck, cmd.instance, bounds);
  patchDeck(rt.store, cmd.deck, {
    effects: patchInstance(rack.deck, cmd.instance, (entry) => ({ ...entry, bounds })),
  });
  rt.bus.emit({
    t: "effect.bounds.changed",
    deck: cmd.deck,
    instance: cmd.instance,
    effect: rack.entry.effect,
    param: cmd.param,
    bounds: bounds[cmd.param] ?? null,
  });
}

export function bypassEffect(cmd: Extract<Command, { t: "effect.bypass" }>, rt: Runtime): void {
  const rack = rackOf(cmd, rt);
  if (rack === null) return;
  // Already there: no rewire, no durable change, and therefore nothing to say (deck.activate).
  if (rack.entry.bypassed === cmd.bypassed) return;

  // The graph is rewired first. If it refuses, the session and the log are untouched — and
  // without a host the ordered state still moves, like param.set and effect.add (0023).
  rt.engine?.setEffectBypass(cmd.deck, cmd.instance, cmd.bypassed);
  patchDeck(rt.store, cmd.deck, {
    effects: patchInstance(rack.deck, cmd.instance, (entry) => ({
      ...entry,
      bypassed: cmd.bypassed,
    })),
  });
  rt.bus.emit({
    t: "effect.bypass.changed",
    deck: cmd.deck,
    instance: cmd.instance,
    effect: rack.entry.effect,
    bypassed: cmd.bypassed,
  });
}

export function removeEffect(cmd: Extract<Command, { t: "effect.remove" }>, rt: Runtime): void {
  const rack = rackOf(cmd, rt);
  if (rack === null) return;

  rt.engine?.removeEffect(cmd.deck, cmd.instance);
  // The instance's values and lanes go with it: they were never the deck's to keep, which is
  // the whole of what instance-scoped identity means (0030).
  patchDeck(rt.store, cmd.deck, {
    effects: rack.deck.effects.filter((entry) => entry.id !== cmd.instance),
  });
  rt.bus.emit({
    t: "effect.removed",
    deck: cmd.deck,
    instance: cmd.instance,
    effect: rack.entry.effect,
    index: rack.index,
  });
}

export function reorderEffect(cmd: Extract<Command, { t: "effect.reorder" }>, rt: Runtime): void {
  const rack = rackOf(cmd, rt);
  if (rack === null) return;
  // Out of range clamps rather than rejects, the way param.set clamps into a registry range.
  const to = clamp(cmd.index, 0, rack.deck.effects.length - 1);
  if (to === rack.index) return;

  const effects = rack.deck.effects.filter((entry) => entry.id !== cmd.instance);
  effects.splice(to, 0, rack.entry);
  rt.engine?.reorderEffects(
    cmd.deck,
    effects.map((entry) => entry.id),
  );
  patchDeck(rt.store, cmd.deck, { effects });
  rt.bus.emit({
    t: "effect.reordered",
    deck: cmd.deck,
    instance: cmd.instance,
    effect: rack.entry.effect,
    from: rack.index,
    to,
  });
}
