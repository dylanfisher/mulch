/**
 * @role What `motion.set` does: hold one parameter's motion — a character and a seed — on the
 *   deck or on the one rack instance that declares it, take the key's lane away in the same
 *   write, hand the graph the spec, and say so (0309). Split from execute.ts the way the player's
 *   commands were, because that file is at its cap (0045, docs/map.md).
 * @instead Every other command's behaviour, including the lane write this mirrors → src/app/execute.ts.
 *   What a motion draws → src/lib/motion.ts.
 */
import { paramIn, isAutomationParam } from "@/audio/params";
import { patchDeck } from "@/state/store";
import type { Command } from "./commands";
import { patchInstance } from "./effects";
import { targetOf } from "./execute";
import type { Runtime } from "./runtime";

export function setMotion(cmd: Extract<Command, { t: "motion.set" }>, rt: Runtime): void {
  const target = targetOf(cmd, rt);
  if (target === null) return;
  if (!isAutomationParam(target.param)) {
    throw new TypeError(`param does not support automation: ${target.param}`);
  }
  const { deck, instance } = target;
  // A motion is held where the lane it replaces would be, and setting one deletes that lane: a
  // key holds one or the other, and one rack state has one JSON (0030, 0309).
  if (target.instance === null) {
    const motion = { ...deck.motion };
    const automation = { ...deck.automation };
    if (cmd.motion === null) delete motion[target.param];
    else {
      motion[target.param] = cmd.motion;
      delete automation[target.param];
    }
    patchDeck(rt.store, cmd.deck, { motion, automation });
    rt.engine?.setMotion(cmd.deck, null, target.param, cmd.motion, deck.params[target.param]);
  } else {
    const held = target.instance;
    const param = target.param;
    patchDeck(rt.store, cmd.deck, {
      effects: patchInstance(deck, held, (current) => {
        const motion = { ...current.motion };
        const automation = { ...current.automation };
        if (cmd.motion === null) delete motion[param];
        else {
          motion[param] = cmd.motion;
          delete automation[param];
        }
        return { ...current, motion, automation };
      }),
    });
    rt.engine?.setMotion(cmd.deck, held, param, cmd.motion, paramIn(target.entry.params, param));
  }
  rt.bus.emit({
    t: "motion.changed",
    deck: cmd.deck,
    ...(instance === null ? {} : { instance }),
    param: target.param,
    motion: cmd.motion,
  });
}
