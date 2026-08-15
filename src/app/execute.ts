/**
 * @role What each command actually does. Every command arrives here, from a click, a JSONL line
 *   or a test, and this is the only code that changes the session.
 * @instead Guarding the shape of what arrived from the wire → src/app/facade.ts. Talking to the
 *   graph → src/app/engine.ts. This file is the middle: it decides, it does not build nodes.
 */
// The two generic parameter edits keep their wire validation beside the one exhaustive dispatch,
// and the clip commands add the durable session projection and the restoration order to the same
// file — every command's behaviour has exactly one home, which is what makes the switch below
// exhaustive. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines, import/max-dependencies
import {
  AUTOMATION_PARAM_IDS,
  isAutomationParam,
  paramOwner,
  paramReachable,
  PARAMS,
} from "@/audio/params";
import { isEffectId, type EffectId } from "@/audio/effects/registry";
import { clamp, snapToStep } from "@/lib/range";
import { normalizeAutomationLane } from "@/lib/automation";
import { assertSourceRef } from "@/lib/source";
import {
  activateDeck,
  addDeck,
  assertDeckId,
  deckIn,
  type DeckId,
  patchDeck,
  removeDeck,
  type SessionStore,
  setClips,
  fromDecks,
} from "@/state/store";
import type { SessionRepository } from "@/state/repository";
import {
  assertClipId,
  assertClipName,
  deckSnapshot,
  sessionSnapshot,
  type Clip,
  type Session,
} from "@/state/session";
import type { Command, GroupedEditCommand } from "./commands";
import type { Engine } from "./engine";
import type { EventBody } from "./events";
import { clipRestorationCommands } from "./restore";

export type Runtime = {
  store: SessionStore;
  bus: { emit(body: EventBody, at?: number): void };
  /** Absent when there is no audio host — pure tests under Node, where the spine still runs. */
  engine: Engine | null;
  repository: SessionRepository | null;
  save(reason: "manual" | "autosave"): void;
  beginLoad(deck: DeckId): number;
  isCurrentLoad(deck: DeckId, token: number): boolean;
  importArchive(handle: Extract<Command, { t: "session.import" }>["archive"]): Promise<void>;
  historyGroup(commands: GroupedEditCommand[]): Promise<void>;
  /**
   * Prove a whole durable session could be restored into this host — its blobs read, its graph
   * built and immediately discarded — without touching the live one. What lets clip.apply refuse
   * a missing or corrupt source before the deck or the graph moves (0027).
   */
  verifyRestorable(session: Session): Promise<void>;
  historyUndo(): Promise<void>;
  historyRedo(): Promise<void>;
};

// Commands arrive as parsed JSON from outside the type system, so the runtime checks here are
// load-bearing, not belt-and-braces. Malformed input throws; a well-formed command whose
// implementation a later milestone owns emits an error event instead (0009).
/**
 * The deck a command names, proved to exist. There is no registry of deck ids, so the session's
 * own list is the only thing that can answer — and a command for a deck nobody added throws, the
 * way one for an unregistered effect does (0029).
 */
function assertDeck(rt: Runtime, deck: DeckId): void {
  assertDeckId(deck, "deck");
  if (!rt.store.getState().deckIds.includes(deck)) {
    throw new TypeError(`unknown deck: ${deck}`);
  }
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

  const deck = deckIn(rt.store.getState().decks, cmd.deck);
  patchDeck(rt.store, cmd.deck, { params: { ...deck.params, [cmd.param]: value } });
  // The graph is optional; the session is not. A param set with no audio host still lands, so a
  // command file can set up a mix under Node and a later render reads it back.
  rt.engine?.setParam(cmd.deck, cmd.param, value);
  if (isAutomationParam(cmd.param) && paramReachable(deck.effects, cmd.param)) {
    const lane = deck.automation[cmd.param];
    if (lane !== undefined) rt.engine?.setAutomation(cmd.deck, cmd.param, lane, value);
  }
  rt.bus.emit({ t: "param.changed", deck: cmd.deck, param: cmd.param, value });
}

function setAutomation(cmd: Extract<Command, { t: "automation.set" }>, rt: Runtime): void {
  if (!isAutomationParam(cmd.param)) {
    throw new TypeError(`param does not support automation: ${cmd.param}`);
  }
  const spec = PARAMS[cmd.param];
  const lane = normalizeAutomationLane(cmd.points, spec);
  const deck = deckIn(rt.store.getState().decks, cmd.deck);
  const automation = { ...deck.automation };
  if (lane.length === 0) delete automation[cmd.param];
  else automation[cmd.param] = lane;
  patchDeck(rt.store, cmd.deck, { automation });
  if (paramReachable(deck.effects, cmd.param)) {
    rt.engine?.setAutomation(cmd.deck, cmd.param, lane, deck.params[cmd.param]);
  }
  rt.bus.emit({
    t: "automation.changed",
    deck: cmd.deck,
    param: cmd.param,
    points: lane.map((point) => ({ at: point.at, value: point.value })),
  });
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
  const deck = deckIn(rt.store.getState().decks, cmd.deck);
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
  // A lane retained across this effect's removal is scheduled again the moment it is back in the
  // rack, so removing and re-adding an effect restores its automation exactly (0024).
  for (const param of AUTOMATION_PARAM_IDS) {
    if (paramOwner(param) !== cmd.effect) continue;
    const lane = deck.automation[param];
    if (lane !== undefined) rt.engine?.setAutomation(cmd.deck, param, lane, deck.params[param]);
  }
  rt.bus.emit({ t: "effect.added", deck: cmd.deck, effect: cmd.effect, index });
}

/**
 * The rack an operation names, or an error on the log saying it was not there. Naming an effect
 * the deck does not hold is unanswerable, not malformed: a stale macro is exactly the case the
 * log exists for, and it must change nothing (0023).
 */
function rackOf(
  cmd: Extract<Command, { t: `effect.${string}` }>,
  rt: Runtime,
): { effects: EffectId[]; bypassed: EffectId[]; index: number } | null {
  if (!isEffectId(cmd.effect)) throw new TypeError(`unknown effect: ${String(cmd.effect)}`);
  const deck = deckIn(rt.store.getState().decks, cmd.deck);
  const index = deck.effects.indexOf(cmd.effect);
  if (index < 0) {
    rt.bus.emit({ t: "error", detail: `deck ${cmd.deck}: effect is not active: ${cmd.effect}` });
    return null;
  }
  return { effects: deck.effects, bypassed: deck.bypassed, index };
}

/** Bypass in rack order, so one rack state keeps one durable representation (0023). */
const inRackOrder = (effects: readonly EffectId[], off: ReadonlySet<EffectId>): EffectId[] =>
  effects.filter((effect) => off.has(effect));

function bypassEffect(cmd: Extract<Command, { t: "effect.bypass" }>, rt: Runtime): void {
  const bypassed: unknown = cmd.bypassed;
  if (typeof bypassed !== "boolean") {
    throw new TypeError(`effect bypass is not a boolean: ${String(bypassed)}`);
  }
  const rack = rackOf(cmd, rt);
  if (rack === null) return;
  // Already there: no rewire, no durable change, and therefore nothing to say (deck.activate).
  if (rack.bypassed.includes(cmd.effect) === cmd.bypassed) return;

  const off = new Set(rack.bypassed);
  if (cmd.bypassed) off.add(cmd.effect);
  else off.delete(cmd.effect);
  // The graph is rewired first. If it refuses, the session and the log are untouched — and
  // without a host the ordered state still moves, like param.set and effect.add (0023).
  rt.engine?.setEffectBypass(cmd.deck, cmd.effect, cmd.bypassed);
  patchDeck(rt.store, cmd.deck, { bypassed: inRackOrder(rack.effects, off) });
  rt.bus.emit({
    t: "effect.bypass.changed",
    deck: cmd.deck,
    effect: cmd.effect,
    bypassed: cmd.bypassed,
  });
}

function removeEffect(cmd: Extract<Command, { t: "effect.remove" }>, rt: Runtime): void {
  const rack = rackOf(cmd, rt);
  if (rack === null) return;

  const effects = rack.effects.filter((effect) => effect !== cmd.effect);
  rt.engine?.removeEffect(cmd.deck, cmd.effect);
  // Parameter values and automation lanes are deliberately left alone: a removed effect's
  // knob positions are the deck's, and P5 owns the lane rule (0023).
  patchDeck(rt.store, cmd.deck, {
    effects,
    bypassed: rack.bypassed.filter((effect) => effect !== cmd.effect),
  });
  rt.bus.emit({ t: "effect.removed", deck: cmd.deck, effect: cmd.effect, index: rack.index });
}

function reorderEffect(cmd: Extract<Command, { t: "effect.reorder" }>, rt: Runtime): void {
  const index: unknown = cmd.index;
  if (typeof index !== "number" || !Number.isInteger(index)) {
    throw new TypeError(`effect index is not an integer: ${String(index)}`);
  }
  const rack = rackOf(cmd, rt);
  if (rack === null) return;
  // Out of range clamps rather than rejects, the way param.set clamps into a registry range.
  const to = clamp(cmd.index, 0, rack.effects.length - 1);
  if (to === rack.index) return;

  const effects = rack.effects.filter((effect) => effect !== cmd.effect);
  effects.splice(to, 0, cmd.effect);
  rt.engine?.reorderEffects(cmd.deck, effects);
  patchDeck(rt.store, cmd.deck, {
    effects,
    bypassed: inRackOrder(effects, new Set(rack.bypassed)),
  });
  rt.bus.emit({
    t: "effect.reordered",
    deck: cmd.deck,
    effect: cmd.effect,
    from: rack.index,
    to,
  });
}

/**
 * The clip a command names, or an error on the log saying it is not there. Naming a clip the
 * session does not hold is unanswerable, not malformed — the same rule a stale rack macro gets,
 * and it must change nothing (0023, 0027).
 */
function clipOf(cmd: Extract<Command, { t: `clip.${string}` }>, rt: Runtime): Clip | null {
  assertClipId(cmd.id, `${cmd.t} id`);
  const clip = rt.store.getState().clips.find((candidate) => candidate.id === cmd.id);
  if (clip === undefined) {
    rt.bus.emit({ t: "error", detail: `${cmd.t}: no clip ${cmd.id}` });
    return null;
  }
  return clip;
}

function captureClip(cmd: Extract<Command, { t: "clip.capture" }>, rt: Runtime): void {
  assertClipId(cmd.id, "clip.capture id");
  assertClipName(cmd.name, "clip.capture name");
  const state = rt.store.getState();
  if (state.clips.some((clip) => clip.id === cmd.id)) {
    rt.bus.emit({ t: "error", detail: `clip.capture: clip already exists: ${cmd.id}` });
    return;
  }
  const preset = deckSnapshot(deckIn(state.decks, cmd.deck));
  // A clip without a source is one apply could not lead with a deck.load, so it is refused at
  // the only place it can be — capture (0027).
  if (preset.source === null) {
    rt.bus.emit({ t: "error", detail: `clip.capture: deck ${cmd.deck} has nothing loaded` });
    return;
  }
  setClips(rt.store, [...state.clips, { id: cmd.id, name: cmd.name, deck: preset }]);
  rt.bus.emit({ t: "clip.captured", clip: cmd.id, name: cmd.name, deck: cmd.deck });
}

function renameClip(cmd: Extract<Command, { t: "clip.rename" }>, rt: Runtime): void {
  assertClipName(cmd.name, "clip.rename name");
  const clip = clipOf(cmd, rt);
  if (clip === null) return;
  // Already named that: no durable change, and therefore nothing to say (deck.activate).
  if (clip.name === cmd.name) return;
  setClips(
    rt.store,
    rt.store
      .getState()
      .clips.map((candidate) =>
        candidate.id === cmd.id
          ? { id: candidate.id, name: cmd.name, deck: candidate.deck }
          : candidate,
      ),
  );
  rt.bus.emit({ t: "clip.renamed", clip: cmd.id, name: cmd.name });
}

function deleteClip(cmd: Extract<Command, { t: "clip.delete" }>, rt: Runtime): void {
  if (clipOf(cmd, rt) === null) return;
  setClips(
    rt.store,
    rt.store.getState().clips.filter((candidate) => candidate.id !== cmd.id),
  );
  // The clip's blob is not deleted here. Nothing owns it: it goes when the next save finds
  // nothing — no deck, no clip, no live checkpoint — still naming it (0027).
  rt.bus.emit({ t: "clip.deleted", clip: cmd.id });
}

/**
 * One deck rewritten to be exactly one clip. The whole target session is proved restorable
 * first, so a missing or corrupt source refuses before the deck, the graph or the log moves;
 * what then runs is ordinary commands in the ordinary restoration order, as one grouped,
 * undoable durable edit (0027).
 */
async function applyClip(cmd: Extract<Command, { t: "clip.apply" }>, rt: Runtime): Promise<void> {
  const clip = clipOf(cmd, rt);
  if (clip === null) return;
  const before = sessionSnapshot(rt.store.getState());
  await rt.verifyRestorable({
    ...before,
    decks: fromDecks(before.deckIds, (deck) =>
      deck === cmd.deck ? clip.deck : deckIn(before.decks, deck),
    ),
  });
  const current = deckIn(before.decks, cmd.deck);
  await rt.historyGroup(clipRestorationCommands(cmd.deck, current, clip.deck));
  rt.bus.emit({ t: "clip.applied", clip: cmd.id, deck: cmd.deck });
}

/**
 * A deck arriving. The id is the caller's, opaque and durable, and capturing one the session
 * already holds is refused rather than silently merged — the rule `clip.capture` follows (0029).
 * The first deck of an empty session also becomes the active one, so the keyboard has a target.
 */
function createDeck(cmd: Extract<Command, { t: "deck.add" }>, rt: Runtime): void {
  assertDeckId(cmd.deck, "deck.add deck");
  if (rt.store.getState().deckIds.includes(cmd.deck)) {
    rt.bus.emit({ t: "error", detail: `deck.add: deck already exists: ${cmd.deck}` });
    return;
  }
  // The graph first: a voice that will not build leaves the session and the log untouched.
  rt.engine?.addDeck(cmd.deck);
  addDeck(rt.store, cmd.deck);
  rt.bus.emit({ t: "deck.added", deck: cmd.deck });
  if (rt.store.getState().activeDeck === cmd.deck) {
    rt.bus.emit({ t: "deck.activated", deck: cmd.deck });
  }
}

/**
 * A deck leaving, including the last one: a session may hold none, and the screen then shows the
 * same affordance that added the first (0029). The voice is disposed and the measurement in
 * flight forgotten before the row goes, and the blob it referenced becomes collectable by the
 * ordinary reachability walk — nothing here deletes bytes (0027).
 */
function dropDeck(deck: DeckId, rt: Runtime): void {
  // A decode still in flight is about a deck that is leaving. Bumping its epoch is what makes
  // that completion drop itself by identity, rather than reach a voice this is about to dispose.
  rt.beginLoad(deck);
  rt.engine?.removeDeck(deck);
  removeDeck(rt.store, deck);
  rt.bus.emit({ t: "deck.removed", deck });
  const active = rt.store.getState().activeDeck;
  if (active !== null && active !== deck) rt.bus.emit({ t: "deck.activated", deck: active });
}

function play(cmd: Extract<Command, { t: "deck.play" }>, rt: Runtime): void {
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  if (deckIn(rt.store.getState().decks, cmd.deck).duration === 0) {
    rt.bus.emit({ t: "error", detail: `deck ${cmd.deck} has nothing loaded` });
    return;
  }
  // No deck.started here: the graph reports that when playback actually begins, a lookahead
  // from now, and one fact has one source (docs/plan.md §1).
  engine.play(cmd.deck);
}

function togglePlay(deck: DeckId, rt: Runtime): void {
  const engine = audio(rt, "deck.play.toggle");
  if (engine === null) return;
  if (engine.planned(deck)) {
    engine.stop(deck);
    return;
  }
  const state = deckIn(rt.store.getState().decks, deck);
  if (state.duration === 0) {
    rt.bus.emit({ t: "error", detail: `deck ${deck} has nothing loaded` });
    return;
  }
  engine.play(deck);
}

function toggleAll(rt: Runtime): void {
  const engine = audio(rt, "decks.play.toggle");
  if (engine === null) return;
  const { deckIds, decks } = rt.store.getState();
  if (deckIds.some((deck) => engine.planned(deck))) {
    for (const deck of deckIds) engine.stop(deck);
    return;
  }
  const loaded = deckIds.filter((deck) => deckIn(decks, deck).duration > 0);
  if (loaded.length === 0) {
    rt.bus.emit({ t: "error", detail: "no decks have anything loaded" });
    return;
  }
  engine.playTogether(loaded);
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

function toggleLoop(deck: DeckId, rt: Runtime): void {
  const state = deckIn(rt.store.getState().decks, deck);
  if (state.duration === 0) {
    rt.bus.emit({ t: "error", detail: `deck ${deck} has nothing loaded` });
    return;
  }
  setLoop(
    {
      t: "deck.loop",
      deck,
      in: 0,
      out: state.loop === null ? Math.min(1, state.duration) : 0,
    },
    rt,
  );
}

// The exhaustive command switch is the one dispatch table; splitting it would create another.
// oxlint-disable-next-line max-lines-per-function
export function execute(cmd: Command, rt: Runtime): void | Promise<void> {
  // Once, before dispatch, rather than at the head of every deck handler. It stays a throw — a
  // command for a deck the session does not hold is malformed wire input, not a refusal. The one
  // exception is the command whose whole purpose is to name a deck that is not there yet.
  if ("deck" in cmd && cmd.t !== "deck.add") assertDeck(rt, cmd.deck);

  switch (cmd.t) {
    case "deck.add":
      createDeck(cmd, rt);
      return;
    case "deck.remove":
      dropDeck(cmd.deck, rt);
      return;
    case "deck.activate":
      if (rt.store.getState().activeDeck === cmd.deck) return;
      activateDeck(rt.store, cmd.deck);
      rt.bus.emit({ t: "deck.activated", deck: cmd.deck });
      return;
    case "param.set":
      setParam(cmd, rt);
      return;
    case "automation.set":
      setAutomation(cmd, rt);
      return;
    case "effect.add":
      addEffect(cmd, rt);
      return;
    case "effect.bypass":
      bypassEffect(cmd, rt);
      return;
    case "effect.remove":
      removeEffect(cmd, rt);
      return;
    case "effect.reorder":
      reorderEffect(cmd, rt);
      return;
    case "deck.load":
      return load(cmd, rt);
    case "deck.play":
      play(cmd, rt);
      return;
    case "deck.play.toggle":
      togglePlay(cmd.deck, rt);
      return;
    case "deck.stop":
      // Stopping a stopped deck is silent by design: the graph reports deck.stopped only when
      // something was actually playing, so the log never carries an event for a no-op.
      audio(rt, cmd.t)?.stop(cmd.deck);
      return;
    case "deck.loop":
      setLoop(cmd, rt);
      return;
    case "deck.loop.toggle":
      toggleLoop(cmd.deck, rt);
      return;
    case "decks.play.toggle":
      toggleAll(rt);
      return;
    case "session.save":
      rt.save("manual");
      return;
    case "session.import":
      return rt.importArchive(cmd.archive);
    case "clip.capture":
      captureClip(cmd, rt);
      return;
    case "clip.rename":
      renameClip(cmd, rt);
      return;
    case "clip.delete":
      deleteClip(cmd, rt);
      return;
    case "clip.apply":
      return applyClip(cmd, rt);
    case "history.group":
      return rt.historyGroup(cmd.commands);
    case "history.undo":
      return rt.historyUndo();
    case "history.redo":
      return rt.historyRedo();
    default:
      throw new TypeError(`unknown command: ${String((cmd as { t?: unknown }).t)}`);
  }
}
