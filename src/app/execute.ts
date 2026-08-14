/**
 * @role What each command actually does. Every command arrives here, from a click, a JSONL line
 *   or a test, and this is the only code that changes the session.
 * @instead Guarding the shape of what arrived from the wire → src/app/facade.ts. Talking to the
 *   graph → src/app/engine.ts. This file is the middle: it decides, it does not build nodes.
 */
import { PARAMS } from "@/audio/params";
import { isEffectId } from "@/audio/effects/registry";
import { clamp, snapToStep } from "@/lib/range";
import { assertSourceRef } from "@/lib/source";
import { DECK_IDS, type DeckId, patchDeck, type SessionStore } from "@/state/store";
import type { SessionRepository } from "@/state/repository";
import type { EventBus } from "./bus";
import type { Command } from "./commands";
import type { Engine } from "./engine";

export type Runtime = {
  store: SessionStore;
  bus: EventBus;
  /** Absent when there is no audio host — pure tests under Node, where the spine still runs. */
  engine: Engine | null;
  repository: SessionRepository | null;
  save(reason: "manual" | "autosave"): void;
  beginLoad(deck: DeckId): number;
  isCurrentLoad(deck: DeckId, token: number): boolean;
};

// Commands arrive as parsed JSON from outside the type system, so the runtime checks here are
// load-bearing, not belt-and-braces. Malformed input throws; a well-formed command whose
// implementation a later milestone owns emits an error event instead (0009).
function assertDeck(deck: DeckId): void {
  if (!DECK_IDS.includes(deck)) throw new TypeError(`unknown deck: ${deck}`);
}

function assertFinite(label: string, value: number): void {
  const raw: unknown = value;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    throw new TypeError(`${label} is not a finite number: ${String(raw)}`);
  }
}

/**
 * The audio host, or an error on the log saying why the command did nothing. A command that
 * needs sound is not malformed when there is no context — it is unanswerable, and the log is
 * where an agent finds that out.
 */
function audio(rt: Runtime, cmd: Command["t"]): Engine | null {
  if (rt.engine !== null) return rt.engine;
  rt.bus.emit({ t: "error", detail: `no audio host: ${cmd} needs an AudioContext` });
  return null;
}

function setParam(cmd: Extract<Command, { t: "param.set" }>, rt: Runtime): void {
  // hasOwn, not an index-and-check: the types say a ParamId always resolves, but this value
  // arrived as JSON and the runtime check is the load-bearing one.
  if (!Object.hasOwn(PARAMS, cmd.param)) throw new TypeError(`unknown param: ${cmd.param}`);
  // clamp() is pure Math.min/max and would pass NaN straight through to the store and the log —
  // where it serialises to null. Refuse anything but a finite number.
  assertFinite("param value", cmd.value);

  const spec = PARAMS[cmd.param];
  // Out of range clamps rather than rejects, the way a plugin host treats an automation value —
  // and the event carries the value actually applied.
  const value =
    spec.step === undefined
      ? clamp(cmd.value, spec.min, spec.max)
      : snapToStep(cmd.value, spec.min, spec.max, spec.step);

  patchDeck(rt.store, cmd.deck, (deck) => ({ params: { ...deck.params, [cmd.param]: value } }));
  // The graph is optional; the session is not. A param set with no audio host still lands, so a
  // command file can set up a mix under Node and a later render reads it back.
  rt.engine?.setParam(cmd.deck, cmd.param, value);
  rt.bus.emit({ t: "param.changed", deck: cmd.deck, param: cmd.param, value });
}

function load(cmd: Extract<Command, { t: "deck.load" }>, rt: Runtime): void | Promise<void> {
  const source: unknown = cmd.source;
  assertSourceRef(source, "deck.load source");
  const token = rt.beginLoad(cmd.deck);
  if ("blobId" in cmd.source) {
    const blobSource = cmd.source;
    const engine = audio(rt, cmd.t);
    if (engine === null) return;
    if (rt.repository === null) {
      rt.bus.emit({ t: "error", detail: "no persistence: deck.load cannot retrieve a blob" });
      return;
    }
    return (async () => {
      let blob: Blob | null | undefined;
      try {
        blob = await rt.repository?.blob(blobSource.blobId);
      } catch (error) {
        if (!rt.isCurrentLoad(cmd.deck, token)) return;
        throw error;
      }
      if (!rt.isCurrentLoad(cmd.deck, token)) return;
      if (blob === null || blob === undefined)
        throw new Error(`missing blob: ${blobSource.blobId}`);
      const duration = await engine.loadBlob(cmd.deck, blob, () =>
        rt.isCurrentLoad(cmd.deck, token),
      );
      if (duration === null) return;
      patchDeck(rt.store, cmd.deck, { source: blobSource, duration, loop: null });
      rt.bus.emit({ t: "deck.loaded", deck: cmd.deck, duration });
    })();
  }
  const engine = audio(rt, cmd.t);
  if (engine === null) return;

  // renderSourceBuffer validates the generator and its length, and throws by design: an unknown
  // gen or a nonsense `secs` is malformed wire input, not an unanswerable command.
  const duration = engine.load(cmd.deck, cmd.source);
  patchDeck(rt.store, cmd.deck, { source: cmd.source, duration, loop: null });
  rt.bus.emit({ t: "deck.loaded", deck: cmd.deck, duration });
}

function addEffect(cmd: Extract<Command, { t: "effect.add" }>, rt: Runtime): void {
  if (!isEffectId(cmd.effect)) throw new TypeError(`unknown effect: ${String(cmd.effect)}`);
  const deck = rt.store.getState().decks[cmd.deck];
  if (deck.effects.includes(cmd.effect)) {
    rt.bus.emit({
      t: "error",
      detail: `deck ${cmd.deck}: effect already active: ${cmd.effect}`,
    });
    return;
  }

  // Graph construction and reconnection happen first. If either throws, the session and event
  // stream remain unchanged; without a host, the ordered state still behaves like param.set.
  const index = rt.engine?.addEffect(cmd.deck, cmd.effect, deck.params) ?? deck.effects.length;
  patchDeck(rt.store, cmd.deck, { effects: [...deck.effects, cmd.effect] });
  rt.bus.emit({ t: "effect.added", deck: cmd.deck, effect: cmd.effect, index });
}

function play(cmd: Extract<Command, { t: "deck.play" }>, rt: Runtime): void {
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  if (rt.store.getState().decks[cmd.deck].duration === 0) {
    rt.bus.emit({ t: "error", detail: `deck ${cmd.deck} has nothing loaded` });
    return;
  }
  // No deck.started here: the graph reports that when playback actually begins, a lookahead
  // from now, and one fact has one source (docs/plan.md §1).
  engine.play(cmd.deck);
}

function setLoop(cmd: Extract<Command, { t: "deck.loop" }>, rt: Runtime): void {
  assertFinite("loop in", cmd.in);
  assertFinite("loop out", cmd.out);
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  // Clamped to what is loaded, and cleared when `out` is not past `in` — the graph decides,
  // and both the session and the log carry what it decided rather than what was asked for.
  const loop = engine.setLoop(cmd.deck, cmd.in, cmd.out);
  patchDeck(rt.store, cmd.deck, { loop });
  rt.bus.emit({ t: "deck.loop.changed", deck: cmd.deck, loop });
}

export function execute(cmd: Command, rt: Runtime): void | Promise<void> {
  // Once, before dispatch, rather than at the head of every handler: every command but
  // session.save names a deck, and a guard repeated five times is one the sixth command
  // forgets. It stays a throw — an unknown deck is malformed wire input, not a refusal.
  if ("deck" in cmd) assertDeck(cmd.deck);

  switch (cmd.t) {
    case "param.set":
      setParam(cmd, rt);
      return;
    case "effect.add":
      addEffect(cmd, rt);
      return;
    case "deck.load":
      return load(cmd, rt);
    case "deck.play":
      play(cmd, rt);
      return;
    case "deck.stop":
      // Stopping a stopped deck is silent by design: the graph reports deck.stopped only when
      // something was actually playing, so the log never carries an event for a no-op.
      audio(rt, cmd.t)?.stop(cmd.deck);
      return;
    case "deck.loop":
      setLoop(cmd, rt);
      return;
    case "session.save":
      rt.save("manual");
      return;
    default:
      throw new TypeError(`unknown command: ${String((cmd as { t?: unknown }).t)}`);
  }
}
