/**
 * @role The contract every effect plugin implements: identity, owned parameter declarations,
 *   graph construction, parameter binding, and disposal.
 */
import type { Icon } from "@phosphor-icons/react";

import type { ParamBinding } from "@/audio/ramp";
import { assertDurableText } from "@/lib/guards";

export type ParamSpec = {
  label: string;
  min: number;
  max: number;
  default: number;
  /**
   * Decimal places the value is read at. Declared, never guessed: a knob paints its readout per
   * frame, and a parameter whose range is thousands wide would otherwise spend every one of them
   * repainting the float's last digits (0064).
   */
  precision: number;
  /** Discrete choices remain numbers, quantized to this interval from `min`. */
  step?: number;
  curve?: "log";
  /** Present only when this registry parameter owns a durable automation lane. */
  automation?: "linear";
};

export type ParamDeclaration<Id extends string = string> = ParamSpec & { id: Id };

/**
 * One occurrence of an effect in one rack: an opaque, caller-supplied, durable string, exactly
 * like a deck's id (0029) or a clip's (0027). It is not an index and not a label — a rack holds
 * any number of instances of the same registry entry, so the effect id cannot be the identity
 * and a value lookup is (instance, param) rather than param alone (0030).
 */
export type EffectInstanceId = string;

/** The one guard on an instance id, shared by the commands and the stored-shape validator. */
export function assertEffectInstanceId(
  value: unknown,
  at: string,
): asserts value is EffectInstanceId {
  assertDurableText(value, at);
}

export type EffectInstance<Param extends string = string> = {
  input: AudioNode;
  output: AudioNode;
  setParam(param: Param, value: number, when: number): void;
  /**
   * The bound `AudioParam` an automation lane is scheduled onto. Required exactly for the
   * parameters this plugin declared `automation`, and absent for the rest — the registry field is
   * what makes it required, so the rack throws rather than guessing (0024).
   */
  automationTarget?(param: Param): AudioParam;
  /**
   * What this effect's graph is doing right now, as one number a meter paints — the compressor's
   * gain reduction in dB is the first. Present only for the plugins that have such a number, and
   * never a parameter: it is a measurement of what the audio just did rather than a setting
   * anyone made, so it declares no `ParamSpec`, never enters the session and never reaches the
   * archive. Read per frame by whoever paints it, like a peak meter (P60).
   */
  meter?(): number;
  dispose(): void;
};

/**
 * How much of the rack one card of this effect claims: half of it, so a wide viewport lays two
 * abreast, or all of it. Declared by the plugin beside its icon, because how much room a set of
 * knobs needs is a fact about the effect and not about the rack rendering it (P48).
 */
export type EffectWidth = "half" | "full";

export type Effect<
  Id extends string = string,
  Params extends readonly ParamDeclaration[] = readonly ParamDeclaration[],
> = {
  id: Id;
  label: string;
  width: EffectWidth;
  /**
   * The picture this effect is offered by, declared here beside its identity. An effect is not
   * an action, so it never appears in the UI's `ACTION_ICONS`, and a second map from effect ids
   * to pictures is the thing this field exists to prevent (0055). The component itself comes
   * from a per-icon import in the plugin file; only the type is named here, and a type import
   * is erased, so nothing pulls the icon barrel into the bundle.
   */
  icon: Icon;
  params: Params;
  build(
    ctx: BaseAudioContext,
    values: Readonly<Record<Params[number]["id"], number>>,
  ): EffectInstance<Params[number]["id"]>;
};

/**
 * The half of an instance every plugin writes identically: build the instance at the values it
 * was handed, then route each later move and each automation lane to the binding for that
 * parameter. A plugin's `build` spreads this beside the nodes only it knows — its `input`,
 * `output` and `dispose` — so the part that is the contract lives with the contract (0016, 0030).
 *
 * The bindings are initialized here, as the call happens, rather than on first use: a plugin with
 * a source node to start does it on the line after this one, and a lazy initialize would leave
 * that node running at its own default in between.
 */
export function instanceFromBindings<Param extends string>(
  params: readonly ParamDeclaration<Param>[],
  bindings: Readonly<Record<Param, ParamBinding>>,
  values: Readonly<Record<Param, number>>,
): Pick<EffectInstance<Param>, "setParam" | "automationTarget"> {
  for (const param of params) bindings[param.id].initialize(values[param.id]);

  return {
    setParam: (param, value, when) => {
      bindings[param].set(value, when);
    },
    automationTarget: (param) => bindings[param].target,
  };
}

/** Preserve each plugin's literal ids while checking the complete contract. */
export function defineEffect<
  const Id extends string,
  const Params extends readonly ParamDeclaration[],
>(effect: Effect<Id, Params>): Effect<Id, Params> {
  return effect;
}
