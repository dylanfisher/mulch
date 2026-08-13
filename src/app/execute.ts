/**
 * @role What each command actually does. Every command arrives here, from a click, a JSONL line
 *   or a test, and this is the only code that changes the session.
 * @instead Guarding the shape of what arrived from the wire → src/app/facade.ts. Talking to the
 *   graph → src/app/engine.ts. This file is the middle: it decides, it does not build nodes.
 */
import { PARAMS } from "@/audio/params";
import { clamp, snapToStep } from "@/lib/range";
import { DECK_IDS, type DeckId, patchDeck, type SessionStore } from "@/state/store";
import type { EventBus } from "./bus";
import type { Command } from "./commands";
import type { Engine } from "./engine";

export type Runtime = {
  store: SessionStore;
  bus: EventBus;
  /** Absent when there is no audio host — pure tests under Node, where the spine still runs. */
  engine: Engine | null;
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
  assertDeck(cmd.deck);
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

  patchDeck(rt.store, cmd.deck, {
    params: { ...rt.store.getState().decks[cmd.deck].params, [cmd.param]: value },
  });
  // The graph is optional; the session is not. A param set with no audio host still lands, so a
  // command file can set up a mix under Node and a later render reads it back.
  rt.engine?.setParam(cmd.deck, cmd.param, value);
  rt.bus.emit({ t: "param.changed", deck: cmd.deck, param: cmd.param, value });
}

function load(cmd: Extract<Command, { t: "deck.load" }>, rt: Runtime): void {
  assertDeck(cmd.deck);
  const source: unknown = cmd.source;
  if (typeof source !== "object" || source === null) {
    throw new TypeError(`deck.load source is not a source: ${String(source)}`);
  }
  if ("blobId" in cmd.source) {
    rt.bus.emit({
      t: "error",
      detail: "unimplemented: deck.load from the blob store — ingest lands with the session",
    });
    return;
  }
  const engine = audio(rt, cmd.t);
  if (engine === null) return;

  // renderSourceBuffer validates the generator and its length, and throws by design: an unknown
  // gen or a nonsense `secs` is malformed wire input, not an unanswerable command.
  const duration = engine.load(cmd.deck, cmd.source);
  patchDeck(rt.store, cmd.deck, { source: cmd.source, duration, loop: null });
  rt.bus.emit({ t: "deck.loaded", deck: cmd.deck, duration });
}

function play(cmd: Extract<Command, { t: "deck.play" }>, rt: Runtime): void {
  assertDeck(cmd.deck);
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
  assertDeck(cmd.deck);
  assertFinite("loop in", cmd.in);
  assertFinite("loop out", cmd.out);
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  // Clamped to what is loaded, and cleared when `out` is not past `in` — the graph decides,
  // and the session records what it decided rather than what was asked for.
  patchDeck(rt.store, cmd.deck, { loop: engine.setLoop(cmd.deck, cmd.in, cmd.out) });
}

export function execute(cmd: Command, rt: Runtime): void {
  switch (cmd.t) {
    case "param.set":
      setParam(cmd, rt);
      return;
    case "deck.load":
      load(cmd, rt);
      return;
    case "deck.play":
      play(cmd, rt);
      return;
    case "deck.stop":
      assertDeck(cmd.deck);
      // Stopping a stopped deck is silent by design: the graph reports deck.stopped only when
      // something was actually playing, so the log never carries an event for a no-op.
      audio(rt, cmd.t)?.stop(cmd.deck);
      return;
    case "deck.loop":
      setLoop(cmd, rt);
      return;
    case "session.save":
      rt.bus.emit({ t: "error", detail: `unimplemented: ${cmd.t}` });
      return;
    default:
      throw new TypeError(`unknown command: ${String((cmd as { t?: unknown }).t)}`);
  }
}
