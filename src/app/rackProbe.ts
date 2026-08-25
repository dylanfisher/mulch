/**
 * @role One instance of deck a's rack as a probe holds it, or a loud miss — the (instance, param)
 *   half of every rack lookup the seam tests make (0030). Its own module because three of those
 *   files ask for it, and a test file is not somewhere another test file may import from.
 * @instead The graph double those same tests drive → src/app/engineDouble.ts. The rack as ordered
 *   pairs, which each file that wants it still reads for itself → src/app/effects.test.ts.
 */
import type { EffectInstanceId } from "@/audio/effects/contract";
import type { SessionEffect } from "@/state/session";
import type { Instrument } from "./facade";

export const instanceIn = (instrument: Instrument, instance: EffectInstanceId): SessionEffect => {
  const entry = instrument.probe().decks.a!.effects.find((current) => current.id === instance);
  if (entry === undefined) throw new Error(`deck a holds no instance ${instance}`);
  return entry;
};
