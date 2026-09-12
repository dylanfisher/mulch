/**
 * @role One deck voice on the fake context, with its reporter's port in the test's hand: what
 *   every transport case is driven against. A module rather than an export of deck.test.ts, so a
 *   second file of cases can borrow it without running the first file's cases again.
 * @instead The fake context itself → ./deckDouble.ts. The cases → ./deck.test.ts, ./deckRest.test.ts.
 */
import { createDeckVoice } from "./deck";
import { destination, fakeContext } from "./deckDouble";

export function deck() {
  const { compressors, context, gainCalls, gainLogs, now, sources } = fakeContext();
  let listener: ((event: MessageEvent<unknown>) => void) | null = null;
  /** Every plan the transport posted, in order — `null` for a stop (src/audio/deck.ts). */
  const plans: unknown[] = [];
  const reporter = {
    port: {
      addEventListener: (_type: string, next: (event: MessageEvent<unknown>) => void) => {
        listener = next;
      },
      removeEventListener: () => {},
      start: () => {},
      postMessage: (message: unknown) => plans.push(message),
      close: () => {},
    },
    disconnect: () => {},
  };
  const report = (message: unknown): void => {
    // oxlint-disable-next-line no-unsafe-type-assertion -- the handler reads only `data`
    listener?.({ data: message } as MessageEvent<unknown>);
  };
  /** Every stop the transport reported, with what it left held (0038). */
  const stops: { reason: string; held: number | null }[] = [];
  const voice = createDeckVoice(
    context,
    destination(),
    // oxlint-disable-next-line no-unsafe-type-assertion -- only the port and disconnect are used
    reporter as unknown as AudioWorkletNode,
    {
      started: () => {},
      looped: () => {},
      stopped: (reason, held) => {
        stops.push({ reason, held });
      },
      xrun: () => {},
    },
  );
  // oxlint-disable-next-line no-unsafe-type-assertion -- the fake never reads a buffer's samples
  voice.load({ duration: 4 } as AudioBuffer);
  return { compressors, gainCalls, gainLogs, now, voice, report, plans, sources, stops };
}
