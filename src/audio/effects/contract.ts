/**
 * @role The contract every effect plugin implements: identity, owned parameter declarations,
 *   graph construction, parameter binding, and disposal.
 */
import { assertDurableText } from "@/lib/guards";

export type ParamSpec = {
  label: string;
  min: number;
  max: number;
  default: number;
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
  dispose(): void;
};

export type Effect<
  Id extends string = string,
  Params extends readonly ParamDeclaration[] = readonly ParamDeclaration[],
> = {
  id: Id;
  label: string;
  params: Params;
  build(
    ctx: BaseAudioContext,
    values: Readonly<Record<Params[number]["id"], number>>,
  ): EffectInstance<Params[number]["id"]>;
};

/** Preserve each plugin's literal ids while checking the complete contract. */
export function defineEffect<
  const Id extends string,
  const Params extends readonly ParamDeclaration[],
>(effect: Effect<Id, Params>): Effect<Id, Params> {
  return effect;
}
