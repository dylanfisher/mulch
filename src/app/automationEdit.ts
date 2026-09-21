/**
 * @role One parameter's lane and the two records that live exactly as long as it does: what drew
 *   it, and the floor and ceiling it is squeezed into. With them the one rule that resolves a
 *   (rack, instance, param) address, because every one of these commands and `param.set` alike
 *   is answered by it (0023, 0030, 0314, 0393).
 * @instead Every other command's behaviour, and the one exhaustive dispatch → src/app/execute.ts,
 *   which this split out of at the hard cap (0007, 0045). The maths of a lane → src/lib/automation.ts.
 */
import {
  isAutomationParam,
  paramIn,
  paramReachable,
  PARAMS,
  type DeckParamId,
  type EffectParamId,
  type ParamId,
} from "@/audio/params";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { clamp, snapToStep } from "@/lib/range";
import { normalizeAutomationLane, playedLane } from "@/lib/automation";
import {
  laneIn,
  MASTER_HOLDS_NO_PARAMS,
  patchDeck,
  patchRack,
  type DeckState,
  type RackHeld,
  type RackId,
  rackIn,
} from "@/state/store";
import type { SessionEffect } from "@/state/session";
import type { Command } from "./commands";
import { patchInstance } from "./effects";
import { rackSaid } from "./refusals";
import type { Runtime } from "./runtime";

/**
 * The value a command names, resolved: the deck itself, or one instance of one effect in its
 * rack. `paramReachable` is the single rule, and an unreachable pair is a refusal that changes
 * nothing — the same answer a stale rack macro gets (0023, 0030).
 */
export type ParamTarget = { held: RackHeld } & (
  | { deck: DeckState; instance: null; entry: null; param: DeckParamId }
  | {
      deck: DeckState | null;
      instance: EffectInstanceId;
      entry: SessionEffect;
      param: EffectParamId;
    }
);

export function targetOf(
  cmd: { t: string; deck: RackId; instance?: EffectInstanceId; param: ParamId },
  rt: Runtime,
): ParamTarget | null {
  const instance = cmd.instance ?? null;
  const held = rackIn(rt.store.getState(), cmd.deck);
  // The one guard the master's address needs, at the top of the reducer rather than at every
  // reader below it: the rack that is no yard's holds no parameter of its own, so a command
  // naming it without an instance names nothing (0320, 0321).
  if (held.deck === null && instance === null) {
    rt.bus.emit({ t: "error", detail: `${rackSaid(cmd.deck)}: ${MASTER_HOLDS_NO_PARAMS}` });
    return null;
  }
  if (!paramReachable(held.effects, instance, cmd.param)) {
    rt.bus.emit({
      t: "error",
      detail: `${rackSaid(cmd.deck)}: ${cmd.param} is not on ${instance ?? "the deck"}`,
    });
    return null;
  }
  // paramReachable is the proof: reachable without an instance means the deck declares the
  // parameter, and reachable with one means that instance's plugin does. A boolean rule cannot
  // narrow the union it just proved, so this is the one place that says so.
  // oxlint-disable no-unsafe-type-assertion
  if (instance === null) {
    if (held.deck === null) throw new Error("the master rack holds no parameters of its own");
    return { held, deck: held.deck, instance, entry: null, param: cmd.param as DeckParamId };
  }
  const entry = held.effects.find((candidate) => candidate.id === instance);
  if (entry === undefined) throw new Error(`rack lost instance ${instance} while resolving`);
  return { held, deck: held.deck, instance, entry, param: cmd.param as EffectParamId };
  // oxlint-enable no-unsafe-type-assertion
}

/**
 * The floor and ceiling one lane is squeezed into, or null for one that swings its parameter's
 * whole range. Held beside the lane and keyed the same way, exactly as what drew it is, so it
 * travels with a rack entry the way that entry's lanes do (0314, 0393). Nothing else changes: the
 * gesture is untouched, and what the host hears is that gesture read through the new window.
 */
// One window written where its lane is: the refusal, the clamp, the one owner that holds both and
// the lane the host then hears. Splitting it separates a window from the lane it is only
// meaningful beside. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function setLaneBounds(
  cmd: Extract<Command, { t: "automation.bounds" }>,
  rt: Runtime,
): void {
  const target = targetOf(cmd, rt);
  if (target === null) return;
  if (!isAutomationParam(target.param)) {
    throw new TypeError(`param does not support automation: ${target.param}`);
  }
  const { deck, held } = target;
  const lane = laneIn(held, target.instance, target.param);
  // A window on a parameter holding no lane is a fact about nothing — the same rule what drew a
  // lane keeps, and unanswerable rather than malformed (0023, 0314, principle 5).
  if (cmd.bounds !== null && lane === undefined) {
    rt.bus.emit({
      t: "error",
      detail: `automation.bounds: ${target.param} holds no lane on ${target.instance ?? "the deck"}`,
    });
    return;
  }
  const spec = PARAMS[target.param];
  // Out of range clamps and the ends are put in order, the way `effect.bounds`' window is: a hand
  // that drags one end past the other has said one window, not an empty one. And a stepped
  // parameter's window stands on that parameter's own grid, the way a value set on it does: the
  // squeeze counts its steps from the floor (`snapToStep`), so a floor off the grid would put
  // every point of the played lane off it — whole semitones landing between two (0393).
  const end = (value: number): number =>
    spec.step === undefined
      ? clamp(value, spec.min, spec.max)
      : snapToStep(value, spec.min, spec.max, spec.step);
  const window =
    cmd.bounds === null
      ? undefined
      : {
          min: end(Math.min(cmd.bounds.min, cmd.bounds.max)),
          max: end(Math.max(cmd.bounds.min, cmd.bounds.max)),
        };
  const played = playedLane(lane ?? [], spec, window);
  if (target.instance === null) {
    const own = deck!;
    const laneBounds = { ...own.laneBounds };
    if (window === undefined) delete laneBounds[target.param];
    else laneBounds[target.param] = window;
    patchDeck(rt.store, cmd.deck!, { laneBounds });
    rt.engine?.setAutomation(cmd.deck, null, target.param, played, own.params[target.param]);
  } else {
    const on = target.instance;
    const param = target.param;
    patchRack(
      rt.store,
      cmd.deck,
      patchInstance(held.effects, on, (current) => {
        const laneBounds = { ...current.laneBounds };
        if (window === undefined) delete laneBounds[param];
        else laneBounds[param] = window;
        return { ...current, laneBounds };
      }),
    );
    rt.engine?.setAutomation(cmd.deck, on, param, played, paramIn(target.entry.params, param));
  }
  rt.bus.emit({
    t: "automation.bounds",
    deck: cmd.deck,
    ...(target.instance === null ? {} : { instance: target.instance }),
    param: target.param,
    bounds: window === undefined ? null : { min: window.min, max: window.max },
  });
}

// One lane written where its value is — the deck's own records or the one instance's — and the two
// records that live exactly as long as it does cleared with it, in both. Splitting it hands the
// same three records to two helpers with one caller each. 0007.
// oxlint-disable-next-line max-lines-per-function
export function setAutomation(cmd: Extract<Command, { t: "automation.set" }>, rt: Runtime): void {
  const lane = normalizeAutomationLane(cmd.points, PARAMS[cmd.param]);
  const target = targetOf(cmd, rt);
  if (target === null) return;
  if (!isAutomationParam(target.param)) {
    throw new TypeError(`param does not support automation: ${target.param}`);
  }

  // What the host hears: the gesture read onto the window this lane is squeezed into. Taken
  // before the clear below, because a lane cleared squeezes to itself either way (0393).
  const played = playedLane(
    lane,
    PARAMS[target.param],
    target.instance === null
      ? target.deck.laneBounds[target.param]
      : target.entry.laneBounds[target.param],
  );
  const { deck, held, instance } = target;
  // A lane is held where its value is: beside the deck's own parameters, or on the one instance
  // that declares it. Clearing removes the key either way, so one rack state has one JSON (0030).
  // The sibling goes with it: a lane cleared is a lane nothing drew any more, which is 0311's
  // rule written where the fact lives rather than in a knob's ref (0314).
  if (target.instance === null) {
    const own = deck!;
    const automation = { ...own.automation };
    const drawn = { ...own.drawn };
    const laneBounds = { ...own.laneBounds };
    if (lane.length === 0) {
      delete automation[target.param];
      delete drawn[target.param];
      delete laneBounds[target.param];
    } else automation[target.param] = lane;
    patchDeck(rt.store, cmd.deck!, { automation, drawn, laneBounds });
    rt.engine?.setAutomation(cmd.deck, null, target.param, played, own.params[target.param]);
  } else {
    const on = target.instance;
    const param = target.param;
    patchRack(
      rt.store,
      cmd.deck,
      patchInstance(held.effects, on, (current) => {
        const automation = { ...current.automation };
        const drawn = { ...current.drawn };
        const laneBounds = { ...current.laneBounds };
        if (lane.length === 0) {
          delete automation[param];
          delete drawn[param];
          delete laneBounds[param];
        } else automation[param] = lane;
        return { ...current, automation, drawn, laneBounds };
      }),
    );
    rt.engine?.setAutomation(cmd.deck, on, param, played, paramIn(target.entry.params, param));
  }
  rt.bus.emit({
    t: "automation.changed",
    deck: cmd.deck,
    ...(instance === null ? {} : { instance }),
    param: target.param,
    points: lane.map((point) => ({ at: point.at, value: point.value })),
  });
}

/**
 * What drew one lane, or null for one nothing drew. Nothing reaches the graph: the character and
 * the count are read by the knob that redraws, and the lane the redraw then sends is what the
 * host hears (0314). It is held beside the lane, keyed the same way, so a rack entry's drawn
 * state travels with the entry the way its lanes do.
 */
export function setDrawn(cmd: Extract<Command, { t: "automation.drawn" }>, rt: Runtime): void {
  const target = targetOf(cmd, rt);
  if (target === null) return;
  if (!isAutomationParam(target.param)) {
    throw new TypeError(`param does not support automation: ${target.param}`);
  }
  const { deck, held } = target;
  // What drew a lane exists exactly while that lane does (0314): a drawn state on a parameter
  // holding none is a fact about nothing, and it would light a character and a count over a knob
  // with nothing to redraw. Unanswerable rather than malformed, like every other command naming
  // something that is not there (0023, principle 5).
  if (cmd.drawn !== null && laneIn(held, target.instance, target.param) === undefined) {
    rt.bus.emit({
      t: "error",
      detail: `automation.drawn: ${target.param} holds no lane on ${target.instance ?? "the deck"}`,
    });
    return;
  }
  // Rebuilt field by field rather than spread: what the command carries is proved by the wire and
  // nothing else of it belongs in the session (0314).
  const said =
    cmd.drawn === null ? null : { character: cmd.drawn.character, redraw: cmd.drawn.redraw };
  if (target.instance === null) {
    const drawn = { ...deck!.drawn };
    if (said === null) delete drawn[target.param];
    else drawn[target.param] = said;
    patchDeck(rt.store, cmd.deck!, { drawn });
  } else {
    const on = target.instance;
    const param = target.param;
    patchRack(
      rt.store,
      cmd.deck,
      patchInstance(held.effects, on, (current) => {
        const drawn = { ...current.drawn };
        if (said === null) delete drawn[param];
        else drawn[param] = said;
        return { ...current, drawn };
      }),
    );
  }
  rt.bus.emit({
    t: "automation.drawn",
    deck: cmd.deck,
    ...(target.instance === null ? {} : { instance: target.instance }),
    param: target.param,
    drawn: said,
  });
}
