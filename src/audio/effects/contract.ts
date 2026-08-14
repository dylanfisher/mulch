/**
 * @role The contract every effect plugin implements: identity, owned parameter declarations,
 *   graph construction, parameter binding, and disposal.
 */

export type ParamSpec = {
  label: string;
  min: number;
  max: number;
  default: number;
  /** Discrete choices remain numbers, quantized to this interval from `min`. */
  step?: number;
  curve?: "log";
};

export type ParamDeclaration<Id extends string = string> = ParamSpec & { id: Id };

export type EffectInstance<Param extends string = string> = {
  input: AudioNode;
  output: AudioNode;
  setParam(param: Param, value: number, when: number): void;
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
