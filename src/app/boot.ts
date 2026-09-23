/**
 * @role What the live host waits on before an instrument exists: every worklet registered and the
 *   session's database open, the two started together rather than one after the other.
 * @instead Getting the worklets onto a context → src/audio/worklet.ts. The database's own
 *   transactions → src/state/repository.ts. Constructing the instrument on top → src/main.tsx.
 */
import { loadWorklets } from "@/audio/worklet";
import { openIndexedDbRepository, type SessionRepository } from "@/state/repository";

/**
 * Both at once, failing the moment either does. The other is still running then and nothing is
 * left to await it, so a failure it comes to later is logged rather than dropped — and handled,
 * so it is never an unhandled rejection on top of the one start-up already reported.
 */
function together<A, B>(a: Promise<A>, b: Promise<B>): Promise<[A, B]> {
  const both = Promise.all([a, b]);
  both.catch((first: unknown) => {
    for (const each of [a, b]) {
      each.catch((reason: unknown) => {
        if (reason !== first) console.error("mulch: a second start-up step failed too", reason);
      });
    }
  });
  return both;
}

/**
 * Resolves to the session's repository once every processor is registered and its database is
 * open. The open is a round trip of its own, and it no longer waits in line behind the worklet
 * fetches: both are in flight before either is awaited.
 */
export async function openLiveHost(
  ctx: BaseAudioContext,
  factory: IDBFactory = indexedDB,
): Promise<SessionRepository> {
  const [, repository] = await together(loadWorklets(ctx), openIndexedDbRepository(factory));
  return repository;
}
