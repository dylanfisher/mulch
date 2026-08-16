/**
 * @role The wire guards — the shape checks that turn untyped input into a Command. Pure: they
 *   read no store, bus or engine, so they are testable and importable without an instrument.
 * @instead What a command does once it is trusted → src/app/execute.ts.
 */
import { assertEffectInstanceId } from "@/audio/effects/contract";
import { isEffectId } from "@/audio/effects/registry";
import { isAutomationParam, PARAMS } from "@/audio/params";
import { normalizeAutomationLane } from "@/lib/automation";
import { assertSourceRef } from "@/lib/source";
import { isDeckId } from "@/state/store";
import type { Command, DurableEditCommand, GroupedEditCommand } from "./commands";

/** Exhaustive classification: adding a command requires deciding its history behavior here. */
const COMMAND_IS_DURABLE = {
  "deck.add": true,
  "deck.remove": true,
  "deck.activate": true,
  "deck.load": true,
  "deck.loop": true,
  "deck.loop.toggle": true,
  "param.set": true,
  "automation.set": true,
  "effect.add": true,
  "effect.bypass": true,
  "effect.remove": true,
  "effect.reorder": true,
  "session.import": true,
  "clip.capture": true,
  "clip.rename": true,
  "clip.delete": true,
  "clip.apply": true,
  "history.group": false,
  "deck.play": false,
  "deck.play.toggle": false,
  "deck.pause": false,
  "deck.stop": false,
  "deck.seek": false,
  "decks.play.toggle": false,
  "session.save": false,
  "history.undo": false,
  "history.redo": false,
} as const satisfies Record<Command["t"], boolean>;

function isDurableEditKind(value: unknown): value is DurableEditCommand["t"] {
  if (typeof value !== "string" || !Object.hasOwn(COMMAND_IS_DURABLE, value)) return false;
  // hasOwn narrowed the untyped wire string to this exhaustive registry's keys.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return COMMAND_IS_DURABLE[value as keyof typeof COMMAND_IS_DURABLE];
}

/** Whether this command enters history — the one question a typed command still has to ask. */
export const isDurableEdit = (command: Command): command is DurableEditCommand =>
  isDurableEditKind(command.t);

// One flat wire guard per groupable command: the length tracks how many commands are groupable,
// not how much logic there is, and every branch is a shape check with no state (0007).
// oxlint-disable-next-line max-lines-per-function
function assertGroupedEdit(command: unknown): asserts command is GroupedEditCommand {
  if (typeof command !== "object" || command === null || !("t" in command)) {
    throw new TypeError("history.group command is not an object with a type");
  }
  const raw = command as Record<string, unknown>;
  if (
    raw.t !== "deck.add" &&
    raw.t !== "deck.remove" &&
    raw.t !== "deck.activate" &&
    raw.t !== "deck.load" &&
    raw.t !== "deck.loop" &&
    raw.t !== "deck.loop.toggle" &&
    raw.t !== "param.set" &&
    raw.t !== "automation.set" &&
    raw.t !== "effect.add" &&
    raw.t !== "effect.bypass" &&
    raw.t !== "effect.remove" &&
    raw.t !== "effect.reorder"
  ) {
    throw new TypeError(`history.group contains a non-groupable command: ${String(raw.t)}`);
  }
  if (!isDeckId(raw.deck)) throw new TypeError(`unknown deck: ${String(raw.deck)}`);
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
      if (typeof raw.in !== "number" || !Number.isFinite(raw.in))
        throw new TypeError(`loop in is not a finite number: ${String(raw.in)}`);
      if (typeof raw.out !== "number" || !Number.isFinite(raw.out))
        throw new TypeError(`loop out is not a finite number: ${String(raw.out)}`);
      return;
    case "param.set":
      if (typeof raw.param !== "string" || !Object.hasOwn(PARAMS, raw.param))
        throw new TypeError(`unknown param: ${String(raw.param)}`);
      if (raw.instance !== undefined) assertEffectInstanceId(raw.instance, "param.set instance");
      if (typeof raw.value !== "number" || !Number.isFinite(raw.value))
        throw new TypeError(`param value is not a finite number: ${String(raw.value)}`);
      return;
    case "automation.set":
      if (!isAutomationParam(raw.param)) {
        throw new TypeError(`param does not support automation: ${String(raw.param)}`);
      }
      if (raw.instance !== undefined)
        assertEffectInstanceId(raw.instance, "automation.set instance");
      normalizeAutomationLane(raw.points, PARAMS[raw.param]);
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
      if (typeof raw.index !== "number" || !Number.isInteger(raw.index))
        throw new TypeError(`effect index is not an integer: ${String(raw.index)}`);
  }
}

/** A `history.group` payload, checked as the list of groupable commands it claims to be. */
export function assertGroupedEdits(commands: GroupedEditCommand[]): void {
  const raw: unknown = commands;
  if (!Array.isArray(raw)) throw new TypeError("history.group commands must be an array");
  for (const command of raw) assertGroupedEdit(command);
}
