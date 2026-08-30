/**
 * @role What each command actually does. Every command arrives here, from a click, a JSONL line
 *   or a test, and this is the only code that changes the session.
 * @instead Guarding the shape of what arrived from the wire → src/app/facade.ts. Talking to the
 *   graph → src/app/engine.ts. This file is the middle: it decides, it does not build nodes.
 */
// The two generic parameter edits keep their wire validation beside the one exhaustive dispatch —
// every command's behaviour has exactly one home, which is what makes the switch below
// exhaustive. The four clip commands are the one set that left, to src/app/clips.ts, when the
// hard cap made the cohabitation a move. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines, import/max-dependencies
import {
  instanceHalf,
  isAutomationParam,
  paramIn,
  paramReachable,
  PARAMS,
  type DeckParamId,
  type EffectParamId,
  type ParamId,
} from "@/audio/params";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { toneOf } from "@/lib/source";
import { TONE_SECS } from "@/lib/waveform";
import { assertDurableText, finite } from "@/lib/guards";
import { clamp, snapToStep } from "@/lib/range";
import { normalizeAutomationLane, stretchLane } from "@/lib/automation";
import {
  activateDeck,
  addDeck,
  assertDeckId,
  deckIn,
  holdsDeck,
  laneIn,
  type DeckId,
  type DeckState,
  patchDeck,
  removeDeck,
  reorderDeck,
} from "@/state/store";
import { deckSnapshot, type SessionEffect } from "@/state/session";
import type { Command } from "./commands";
import { assertGroupedEdit, assertListIndex, isGroupableEdit } from "./wire";
import { deckRestorationCommands, duplicatedDeckPreset } from "./restore";
import { applyClip, captureClip, deleteClip, renameClip } from "./clips";
import { setPlayer, setSyncClock, soloPlayer } from "./deckPlayer";
import {
  addEffect,
  boundEffect,
  dismissGrown,
  patchInstance,
  bypassEffect,
  duplicateEffect,
  removeEffect,
  reorderEffect,
} from "./effects";
import { audio, refuseUnloaded } from "./refusals";
import { flattenDeck } from "./flatten";
// Re-exported rather than moved twice: every caller that already imports the reducer's port
// from here keeps doing so, and the type itself lives beside the rest of it (0045).
export type { RenderHost, Runtime } from "./runtime";
import type { Runtime } from "./runtime";
// oxlint-enable import/max-dependencies

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
  if (!holdsDeck(rt.store.getState().deckList, deck)) {
    throw new TypeError(`unknown deck: ${deck}`);
  }
}

/**
 * The value a command names, resolved: the deck itself, or one instance of one effect in its
 * rack. `paramReachable` is the single rule, and an unreachable pair is a refusal that changes
 * nothing — the same answer a stale rack macro gets (0023, 0030).
 */
type ParamTarget = { deck: DeckState } & (
  | { instance: null; entry: null; param: DeckParamId }
  | { instance: EffectInstanceId; entry: SessionEffect; param: EffectParamId }
);

function targetOf(
  cmd: { t: string; deck: DeckId; instance?: EffectInstanceId; param: ParamId },
  rt: Runtime,
): ParamTarget | null {
  const instance = cmd.instance ?? null;
  const deck = deckIn(rt.store.getState().decks, cmd.deck);
  if (!paramReachable(deck.effects, instance, cmd.param)) {
    rt.bus.emit({
      t: "error",
      detail: `deck ${cmd.deck}: ${cmd.param} is not on ${instance ?? "the deck"}`,
    });
    return null;
  }
  // paramReachable is the proof: reachable without an instance means the deck declares the
  // parameter, and reachable with one means that instance's plugin does. A boolean rule cannot
  // narrow the union it just proved, so this is the one place that says so.
  // oxlint-disable no-unsafe-type-assertion
  if (instance === null) {
    return { deck, instance, entry: null, param: cmd.param as DeckParamId };
  }
  const entry = deck.effects.find((candidate) => candidate.id === instance);
  if (entry === undefined) throw new Error(`rack lost instance ${instance} while resolving`);
  return { deck, instance, entry, param: cmd.param as EffectParamId };
  // oxlint-enable no-unsafe-type-assertion
}

function setParam(cmd: Extract<Command, { t: "param.set" }>, rt: Runtime): void {
  const target = targetOf(cmd, rt);
  if (target === null) return;

  const spec = PARAMS[target.param];
  // Out of range clamps rather than rejects, the way a plugin host treats an automation value —
  // and the event carries the value actually applied.
  const value =
    spec.step === undefined
      ? clamp(cmd.value, spec.min, spec.max)
      : snapToStep(cmd.value, spec.min, spec.max, spec.step);

  const { deck, instance } = target;
  if (instance === null) {
    patchDeck(rt.store, cmd.deck, { params: { ...deck.params, [target.param]: value } });
  } else {
    patchDeck(rt.store, cmd.deck, {
      effects: patchInstance(deck, instance, (entry) => ({
        ...entry,
        params: { ...entry.params, [target.param]: value },
      })),
    });
  }
  // The graph is optional; the session is not. A param set with no audio host still lands, so a
  // command file can set up a mix under Node and a later render reads it back.
  rt.engine?.setParam(cmd.deck, instance, target.param, value);
  // A lane on this value keeps its shape and re-bases onto the value the knob was just left at.
  if (isAutomationParam(target.param)) {
    const lane = laneIn(deck, instance, target.param);
    if (lane !== undefined) rt.engine?.setAutomation(cmd.deck, instance, target.param, lane, value);
  }
  rt.bus.emit({
    t: "param.changed",
    deck: cmd.deck,
    ...(instance === null ? {} : { instance }),
    param: target.param,
    value,
  });
}

function setAutomation(cmd: Extract<Command, { t: "automation.set" }>, rt: Runtime): void {
  const lane = normalizeAutomationLane(cmd.points, PARAMS[cmd.param]);
  const target = targetOf(cmd, rt);
  if (target === null) return;
  if (!isAutomationParam(target.param)) {
    throw new TypeError(`param does not support automation: ${target.param}`);
  }

  const { deck, instance } = target;
  // A lane is held where its value is: beside the deck's own parameters, or on the one instance
  // that declares it. Clearing removes the key either way, so one rack state has one JSON (0030).
  if (target.instance === null) {
    const automation = { ...deck.automation };
    if (lane.length === 0) delete automation[target.param];
    else automation[target.param] = lane;
    patchDeck(rt.store, cmd.deck, { automation });
    rt.engine?.setAutomation(cmd.deck, null, target.param, lane, deck.params[target.param]);
  } else {
    const held = target.instance;
    const param = target.param;
    patchDeck(rt.store, cmd.deck, {
      effects: patchInstance(deck, held, (current) => {
        const automation = { ...current.automation };
        if (lane.length === 0) delete automation[param];
        else automation[param] = lane;
        return { ...current, automation };
      }),
    });
    rt.engine?.setAutomation(cmd.deck, held, param, lane, paramIn(target.entry.params, param));
  }
  rt.bus.emit({
    t: "automation.changed",
    deck: cmd.deck,
    ...(instance === null ? {} : { instance }),
    param: target.param,
    points: lane.map((point) => ({ at: point.at, value: point.value })),
  });
}

function load(cmd: Extract<Command, { t: "deck.load" }>, rt: Runtime): void | Promise<void> {
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
      // The bytes are fetched by the engine, and only if its decode cache does not already hold
      // this blob: a load of a source something else has already decoded reads no storage at all.
      const read = async (): Promise<Blob> => {
        const blob = await rt.repository?.blob(blobSource.blobId);
        if (blob === null || blob === undefined)
          throw new Error(`missing blob: ${blobSource.blobId}`);
        return blob;
      };
      let duration: number | null;
      try {
        duration = await engine.loadBlob(cmd.deck, blobSource.blobId, read, () =>
          rt.isCurrentLoad(cmd.deck, token),
        );
      } catch (error) {
        if (!rt.isCurrentLoad(cmd.deck, token)) return;
        throw error;
      }
      if (duration === null) return;
      patchDeck(rt.store, cmd.deck, { source: blobSource, duration, loop: null, player: null });
      rt.bus.emit({ t: "deck.loaded", deck: cmd.deck, duration });
    })();
  }
  const engine = audio(rt, cmd.t);
  if (engine === null) return;

  // renderSourceBuffer validates the generator and throws by design: an unknown gen is malformed
  // wire input, not an unanswerable command. Its length is not wire input at all — it is the
  // kind's own (`genSecs`, P127).
  const duration = engine.load(cmd.deck, cmd.source);
  // A tone loads looped over the whole of it, because a wave with no beginning has no end either:
  // one second of the reference played once would simply stop (0110). Every other source loads
  // with no loop, the way a decoded one does.
  const loop = toneOf(cmd.source) === null ? null : engine.setLoop(cmd.deck, 0, TONE_SECS);
  patchDeck(rt.store, cmd.deck, { source: cmd.source, duration, loop, player: null });
  rt.bus.emit({ t: "deck.loaded", deck: cmd.deck, duration });
}

/**
 * The loop, become the source. The one edit that writes audio nobody imported: the loop's frames
 * are stored as wav under the id the command minted, and the deck then picks them up through the
 * ordinary `deck.load`, so the peaks, the analysis and the cleared loop all derive exactly the
 * way they do for an import (0025, 0047). No blob is deleted here — the one the deck was playing
 * becomes collectable when nothing, no deck and no live checkpoint, still names it (0027).
 *
 * Writing the bytes is slow, so the epoch is taken before the write rather than by the load
 * afterwards: an undo, a removal or a newer load arriving during the store is later intent, and
 * the crop has to lose to it. What it leaves behind is an unreferenced blob, which is what the
 * reachability walk is for (docs/plan.md §2).
 */
function cropToLoop(cmd: Extract<Command, { t: "deck.crop" }>, rt: Runtime): void | Promise<void> {
  const loop = deckIn(rt.store.getState().decks, cmd.deck).loop;
  if (loop === null) {
    rt.bus.emit({ t: "error", detail: `deck ${cmd.deck} has no loop to crop to` });
    return;
  }
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  const repository = rt.repository;
  if (repository === null) {
    rt.bus.emit({ t: "error", detail: "no persistence: deck.crop cannot store what it cuts" });
    return;
  }
  // The samples are taken before anything is stored or loaded: a crop that cannot be cut leaves
  // the blob store, the deck and the log exactly as they were.
  const bytes = engine.cropped(cmd.deck, loop.in, loop.out);
  const token = rt.beginLoad(cmd.deck);
  return (async () => {
    await repository.ingest(new Blob([bytes]), cmd.id);
    if (!rt.isCurrentLoad(cmd.deck, token)) return;
    await load({ t: "deck.load", deck: cmd.deck, source: { blobId: cmd.id } }, rt);
    // The load takes its own epoch and can be superseded in turn, and a crop nobody is holding is
    // not a crop that happened. The deck's own source is the one thing that can say so.
    const held = rt.store.getState().decks[cmd.deck]?.source ?? null;
    if (held === null || !("blobId" in held) || held.blobId !== cmd.id) return;
    rt.bus.emit({ t: "deck.cropped", deck: cmd.deck, blob: cmd.id, in: loop.in, out: loop.out });
  })();
}

/**
 * A deck arriving. The id is the caller's, opaque and durable, and capturing one the session
 * already holds is refused rather than silently merged — the rule `clip.capture` follows (0029).
 * The first deck of an empty session also becomes the active one, so the keyboard has a target.
 */
function createDeck(cmd: Extract<Command, { t: "deck.add" }>, rt: Runtime): void {
  if (holdsDeck(rt.store.getState().deckList, cmd.deck)) {
    rt.bus.emit({ t: "error", detail: `deck.add: deck already exists: ${cmd.deck}` });
    return;
  }
  // The graph first: a voice that will not build leaves the session and the log untouched.
  rt.engine?.addDeck(cmd.deck);
  addDeck(rt.store, cmd.deck, cmd.emoji, cmd.name);
  rt.bus.emit({ t: "deck.added", deck: cmd.deck });
  if (rt.store.getState().activeDeck === cmd.deck) {
    rt.bus.emit({ t: "deck.activated", deck: cmd.deck });
  }
}

/**
 * One yard again. The copy arrives the way every restored yard does — `deck.add`, then the one
 * registered stage list: source, parameters, rack instances, their values, bypass, lanes, loop —
 * as one grouped, undoable durable edit, so this is not a second way to build a deck (0027, 0078).
 *
 * The copy inherits nothing of the original's transport: `deck.add` makes a stopped deck and no
 * stage plays one. What it does not share with the original is exactly the identity: its own id,
 * its own emoji and name, and a fresh id on each rack instance it copies (0029, 0076).
 * Where it lands is `index`, reached through the `deck.reorder` the group holds (0111).
 */
async function duplicateDeck(
  cmd: Extract<Command, { t: "deck.duplicate" }>,
  rt: Runtime,
): Promise<void> {
  assertDeckId(cmd.to, "deck.duplicate to");
  assertListIndex(cmd.index, "deck");
  assertDurableText(cmd.emoji, "deck.duplicate emoji");
  assertDurableText(cmd.name, "deck.duplicate name");
  const state = rt.store.getState();
  // Refused here rather than left to the `deck.add` inside the group: that one would report the
  // clash and the stages behind it would then rewrite the deck already sitting under that id.
  if (holdsDeck(state.deckList, cmd.to)) {
    rt.bus.emit({ t: "error", detail: `deck.duplicate: deck already exists: ${cmd.to}` });
    return;
  }
  const preset = duplicatedDeckPreset(deckSnapshot(deckIn(state.decks, cmd.deck)), cmd.to);
  await rt.historyGroup([
    { t: "deck.add", deck: cmd.to, emoji: cmd.emoji, name: cmd.name },
    // Straight after the add, which appends: the copy is moved into place inside the group.
    { t: "deck.reorder", deck: cmd.to, index: cmd.index },
    ...deckRestorationCommands(cmd.to, preset),
  ]);
  rt.bus.emit({ t: "deck.duplicated", deck: cmd.deck, to: cmd.to });
}

/**
 * A deck leaving, including the last one: a session may hold none, and the screen then shows the
 * same affordance that added the first (0029). The voice is disposed and the measurement in
 * flight forgotten before the row goes, and the blob it referenced becomes collectable by the
 * ordinary reachability walk — nothing here deletes bytes (0027).
 */
function dropDeck(cmd: Extract<Command, { t: "deck.remove" }>, rt: Runtime): void {
  const deck = cmd.deck;
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
  if (refuseUnloaded(rt, cmd.deck)) return;
  // No deck.started here: the graph reports that when playback actually begins, a lookahead
  // from now, and one fact has one source (docs/plan.md §1).
  engine.play(cmd.deck);
}

function togglePlay(cmd: Extract<Command, { t: "deck.play.toggle" }>, rt: Runtime): void {
  const deck = cmd.deck;
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  // The toggle pauses rather than stops: it is the performer's one gesture, and a gesture you
  // press twice has to leave the deck where it found it. Rewinding is `deck.stop` (0038).
  if (engine.planned(deck)) {
    engine.pause(deck);
    return;
  }
  if (refuseUnloaded(rt, deck)) return;
  engine.play(deck);
}

/**
 * The playhead moved by hand. Identical stopped and playing, because that is the whole gesture:
 * a stopped deck records where its next play begins, and a playing one is rescheduled from there
 * at whatever rate it is already running (0031, 0041). The graph clamps to what is loaded.
 */
function seek(cmd: Extract<Command, { t: "deck.seek" }>, rt: Runtime): void {
  finite(cmd.position, "seek position");
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  if (refuseUnloaded(rt, cmd.deck)) return;
  engine.seek(cmd.deck, cmd.position);
}

function setLoop(cmd: Extract<Command, { t: "deck.loop" }>, rt: Runtime): void {
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  // The same refusal deck.loop.toggle already makes: a deck with nothing loaded has no range to
  // clamp a loop into, and the voice below throws rather than pretend it is zero seconds long.
  if (refuseUnloaded(rt, cmd.deck)) return;
  // Clamped to what is loaded, and cleared when `out` is not past `in` — the graph decides,
  // and both the session and the log carry what it decided rather than what was asked for.
  const loop = engine.setLoop(cmd.deck, cmd.in, cmd.out);
  // Except on a tone, which is always looped because one second of a wave with no beginning
  // would otherwise simply stop (0110). Stated here rather than at the controls, so the rule
  // holds for a hand-sent command too — and the loop the graph just cleared is put back.
  if (loop === null && toneOf(deckIn(rt.store.getState().decks, cmd.deck).source) !== null) {
    const restored = engine.setLoop(cmd.deck, 0, TONE_SECS);
    rt.bus.emit({ t: "error", detail: `deck ${cmd.deck} holds a tone, which is always looped` });
    patchDeck(rt.store, cmd.deck, { loop: restored });
    return;
  }
  patchDeck(rt.store, cmd.deck, { loop });
  rt.bus.emit({ t: "deck.loop.changed", deck: cmd.deck, loop });
}

function toggleLoop(cmd: Extract<Command, { t: "deck.loop.toggle" }>, rt: Runtime): void {
  const deck = cmd.deck;
  if (refuseUnloaded(rt, deck)) return;
  const state = deckIn(rt.store.getState().decks, deck);
  setLoop(
    {
      t: "deck.loop",
      deck,
      // Turning a loop on loops the clip, end to end: the whole of what is loaded is the one
      // span the press can mean, and narrowing it is what the handles above the peaks are for.
      // Any shorter default is a region nobody chose, arriving on the first press.
      in: 0,
      out: state.loop === null ? state.duration : 0,
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
  // The wire shape of a groupable command is checked in exactly one place, and this is the other
  // door to it: what history.group would refuse arriving in a group is refused arriving alone.
  if (isGroupableEdit(cmd)) assertGroupedEdit(cmd);
  if ("deck" in cmd && cmd.t !== "deck.add") assertDeck(rt, cmd.deck);

  switch (cmd.t) {
    case "deck.add":
      createDeck(cmd, rt);
      return;
    case "deck.remove":
      dropDeck(cmd, rt);
      return;
    case "deck.duplicate":
      return duplicateDeck(cmd, rt);
    // One yard moved to the slot it landed on, and nothing said when it already held that one.
    // The engine is never told: two yards are not in series, so the order they are shown in is
    // not a fact about the graph at all (0111).
    case "deck.reorder": {
      // Out of range clamps rather than rejects, the way param.set clamps into a registry range.
      const to = clamp(cmd.index, 0, rt.store.getState().deckList.length - 1);
      const from = reorderDeck(rt.store, cmd.deck, to);
      if (from !== null) rt.bus.emit({ t: "deck.reordered", deck: cmd.deck, from, to });
      return;
    }
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
    // The lane already held, scaled onto the length one gesture asked for, through the one
    // command that writes a lane (0079).
    case "automation.span": {
      const held = deckIn(rt.store.getState().decks, cmd.deck);
      const points = stretchLane(laneIn(held, cmd.instance ?? null, cmd.param) ?? [], cmd.span);
      const owner = instanceHalf(cmd.instance);
      setAutomation(
        { t: "automation.set", deck: cmd.deck, ...owner, param: cmd.param, points },
        rt,
      );
      return;
    }
    case "effect.add":
      addEffect(cmd, rt);
      return;
    case "effect.duplicate":
      return duplicateEffect(cmd, rt);
    case "effect.bounds":
      boundEffect(cmd, rt);
      return;
    case "effect.bypass":
      bypassEffect(cmd, rt);
      return;
    case "effect.remove":
      removeEffect(cmd, rt);
      return;
    // Transport for the reason a seek is: a run is never stored, so nothing durable moves and
    // nothing enters history (0204, 0205).
    case "effect.dismiss":
      dismissGrown(cmd, rt);
      return;
    case "effect.reorder":
      reorderEffect(cmd, rt);
      return;
    case "deck.load":
      return load(cmd, rt);
    case "deck.crop":
      return cropToLoop(cmd, rt);
    case "deck.flatten":
      return flattenDeck(cmd, rt);
    case "deck.play":
      play(cmd, rt);
      return;
    case "deck.play.toggle":
      togglePlay(cmd, rt);
      return;
    case "deck.pause":
      // Pausing a deck that is not playing is a no-op, and pausing one that is already held
      // leaves it exactly where it is: a pause never moves a playhead, it only stops one.
      audio(rt, cmd.t)?.pause(cmd.deck);
      return;
    case "deck.stop":
      // Stopping a stopped deck is silent by design: the graph reports deck.stopped only when
      // something was actually playing, so the log never carries an event for a no-op. It still
      // rewinds a held deck to the top of its loop, which probe() shows and the log does not.
      audio(rt, cmd.t)?.stop(cmd.deck);
      return;
    case "deck.seek":
      seek(cmd, rt);
      return;
    case "deck.loop":
      setLoop(cmd, rt);
      return;
    case "deck.player":
      setPlayer(cmd, rt);
      return;
    case "deck.playerSolo":
      soloPlayer(cmd, rt);
      return;
    case "deck.loop.toggle":
      toggleLoop(cmd, rt);
      return;
    case "session.sync":
      setSyncClock(cmd, rt);
      return;
    case "session.save":
      rt.save("manual");
      return;
    case "gesture.end":
      rt.historyEndGesture();
      // And the graph's side of the same ending: a plugin that declared a parameter a `rebuild`
      // has been holding this drag's moves, and pays for the last of them now (P63). Optional
      // like every other graph effect here — the session already carries the value.
      rt.engine?.endGesture();
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
