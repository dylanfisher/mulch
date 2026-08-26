/**
 * @role The wire guards — the shape checks that turn untyped input into a Command. Pure: they
 *   read no store, bus or engine, so they are testable and importable without an instrument.
 * @instead What a command does once it is trusted → src/app/execute.ts.
 */
import { assertPlayer } from "@/lib/player";
import { assertEffectInstanceId } from "@/audio/effects/contract";
import { isEffectId } from "@/audio/effects/registry";
import { isAutomationParam, PARAMS } from "@/audio/params";
import { normalizeAutomationLane } from "@/lib/automation";
import { assertDurableText, finite, isRecord } from "@/lib/guards";
import { assertBlobId, assertSourceRef } from "@/lib/source";
import { assertDeckId } from "@/state/store";
import type { Command, DurableEditCommand, GroupedEditCommand } from "./commands";

/**
 * Where a command stands with history. `group` is a durable edit a `history.group` may also
 * hold; `alone` is durable but only on its own, because import re-roots history and a clip
 * command is either a list edit no group needs or — for apply — a group of its own; `none`
 * never enters history at all.
 */
type HistoryClass<T extends Command["t"]> = T extends GroupedEditCommand["t"]
  ? "group"
  : T extends DurableEditCommand["t"]
    ? "alone"
    : "none";

/**
 * The one declaration of which commands are durable and which of those are groupable. Adding a
 * command requires an answer here, and the compiler checks each answer against the command union
 * itself rather than taking it on trust — which is what a hand-written chain of `!==` could not
 * do, and how a groupable command came to be refused at runtime by a guard nobody updated.
 */
const COMMAND_HISTORY = {
  "deck.add": "group",
  "deck.remove": "group",
  "deck.reorder": "group",
  "deck.activate": "group",
  "deck.load": "group",
  "deck.loop": "group",
  "deck.crop": "group",
  "deck.loop.toggle": "group",
  "deck.player": "group",
  "param.set": "group",
  "automation.set": "group",
  "automation.span": "group",
  "effect.add": "group",
  "effect.bypass": "group",
  "effect.remove": "group",
  "effect.reorder": "group",
  "session.import": "alone",
  "session.sync": "alone",
  "deck.duplicate": "alone",
  "deck.flatten": "alone",
  "effect.duplicate": "alone",
  "clip.capture": "alone",
  "clip.rename": "alone",
  "clip.delete": "alone",
  "clip.apply": "alone",
  "history.group": "none",
  "deck.play": "none",
  "deck.play.toggle": "none",
  "deck.pause": "none",
  "deck.stop": "none",
  "deck.seek": "none",
  "deck.playerCue": "none",
  "session.save": "none",
  "gesture.end": "none",
  "history.undo": "none",
  "history.redo": "none",
} as const satisfies { [T in Command["t"]]: HistoryClass<T> };

/** The class of an untyped wire `t`, or `none` for a string that names no command at all. */
function historyClassOf(value: unknown): "group" | "alone" | "none" {
  if (typeof value !== "string" || !Object.hasOwn(COMMAND_HISTORY, value)) return "none";
  // hasOwn narrowed the untyped wire string to this exhaustive registry's keys.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return COMMAND_HISTORY[value as keyof typeof COMMAND_HISTORY];
}

/** Whether this command enters history — the one question a typed command still has to ask. */
export const isDurableEdit = (command: Command): command is DurableEditCommand =>
  COMMAND_HISTORY[command.t] !== "none";

/** The groupable set as a wire question: is this untyped `t` one a group may hold? */
const isGroupableKind = (value: unknown): value is GroupedEditCommand["t"] =>
  historyClassOf(value) === "group";

/**
 * The commands that are a group under another name: each expands into ordinary commands and
 * finishes through `historyGroup`, so the facade gives every one of them the same tail and each
 * records its own history entry (0027, 0078, 0092). `session.import` is not one — it re-roots
 * history rather than recording an entry.
 */
export const expandsIntoGroup = (command: Command): boolean =>
  command.t === "history.group" ||
  command.t === "clip.apply" ||
  command.t === "deck.duplicate" ||
  command.t === "deck.flatten" ||
  command.t === "effect.duplicate";

/** The same set, asked of a command that is already typed — which path it arrived by. */
export const isGroupableEdit = (command: Command): command is GroupedEditCommand =>
  isGroupableKind(command.t);

/**
 * The one wire validation of a groupable command, for both paths one can arrive by: inside a
 * `history.group`, where the whole group is proved before any of it runs, and alone through
 * `execute()`. Declared once, because declared twice it is a command refused in a group and
 * accepted by itself.
 */
// One flat branch per groupable command: the length tracks how many commands are groupable,
// not how much logic there is, and every branch is a shape check with no state (0007).
// oxlint-disable-next-line max-lines-per-function
export function assertGroupedEdit(command: unknown): asserts command is GroupedEditCommand {
  if (!isRecord(command) || !("t" in command)) {
    throw new TypeError("history.group command is not an object with a type");
  }
  const raw = command;
  if (!isGroupableKind(raw.t)) {
    throw new TypeError(`history.group contains a non-groupable command: ${String(raw.t)}`);
  }
  assertDeckId(raw.deck, `${raw.t} deck`);
  // The two fields beyond the deck that `deck.add` carries: the emoji and name drawn for it
  // (0057).
  if (raw.t === "deck.add") {
    assertDurableText(raw.emoji, "deck.add emoji");
    assertDurableText(raw.name, "deck.add name");
  }
  switch (raw.t) {
    case "deck.add":
    case "deck.remove":
    case "deck.activate":
    case "deck.loop.toggle":
      return;
    case "deck.load":
      assertSourceRef(raw.source, "deck.load source");
      return;
    case "deck.loop":
      finite(raw.in, "loop in");
      finite(raw.out, "loop out");
      return;
    case "deck.crop":
      assertBlobId(raw.id, "deck.crop id");
      return;
    case "deck.player":
      // The one validator the stored session also comes through, so a spec off a JSONL line and
      // one out of storage are allowed exactly the same shapes (src/lib/player.ts).
      assertPlayer(raw.player, "deck.player");
      return;
    case "param.set":
      if (typeof raw.param !== "string" || !Object.hasOwn(PARAMS, raw.param))
        throw new TypeError(`unknown param: ${String(raw.param)}`);
      if (raw.instance !== undefined) assertEffectInstanceId(raw.instance, "param.set instance");
      // clamp() downstream is pure Math.min/max and would pass NaN straight through to the store
      // and the log — where it serialises to null. Refuse anything but a finite number.
      finite(raw.value, "param value");
      return;
    case "automation.set":
      if (!isAutomationParam(raw.param)) {
        throw new TypeError(`param does not support automation: ${String(raw.param)}`);
      }
      if (raw.instance !== undefined)
        assertEffectInstanceId(raw.instance, "automation.set instance");
      normalizeAutomationLane(raw.points, PARAMS[raw.param]);
      return;
    case "automation.span":
      if (!isAutomationParam(raw.param)) {
        throw new TypeError(`param does not support automation: ${String(raw.param)}`);
      }
      if (raw.instance !== undefined)
        assertEffectInstanceId(raw.instance, "automation.span instance");
      // Clamped downstream the way a parameter is, but zero and below are not a short lane: a
      // span of nothing is a lane with no length at all, which is not a thing to stretch to.
      if (finite(raw.span, "automation span") <= 0)
        throw new RangeError(`automation span is not positive: ${String(raw.span)}`);
      return;
    case "effect.add":
      if (!isEffectId(raw.effect)) throw new TypeError(`unknown effect: ${String(raw.effect)}`);
      assertEffectInstanceId(raw.id, "effect.add id");
      return;
    case "effect.remove":
      assertEffectInstanceId(raw.instance, "effect.remove instance");
      return;
    case "effect.bypass":
      assertEffectInstanceId(raw.instance, "effect.bypass instance");
      if (typeof raw.bypassed !== "boolean")
        throw new TypeError(`effect bypass is not a boolean: ${String(raw.bypassed)}`);
      return;
    case "effect.reorder":
      assertEffectInstanceId(raw.instance, "effect.reorder instance");
      assertListIndex(raw.index, "effect");
      return;
    // Last case, so no `return` — oxlint's no-useless-return rejects one here. Its siblings
    // above carry theirs only because a case follows them.
    case "deck.reorder":
      assertListIndex(raw.index, "deck");
  }
}

/**
 * The landing index of a reorder, for the two lists that have one — a rack of instances and the
 * session's yards — and for the `deck.duplicate` that names where its copy goes. A place in a
 * list is a whole number of slots; how far off the end it may be is the reducer's to clamp, the
 * way a parameter is clamped into its registry range.
 */
export function assertListIndex(value: unknown, what: string): void {
  if (typeof value !== "number" || !Number.isInteger(value))
    throw new TypeError(`${what} index is not an integer: ${String(value)}`);
}

/** A `history.group` payload, checked as the list of groupable commands it claims to be. */
export function assertGroupedEdits(commands: GroupedEditCommand[]): void {
  const raw: unknown = commands;
  if (!Array.isArray(raw)) throw new TypeError("history.group commands must be an array");
  for (const command of raw) assertGroupedEdit(command);
}
