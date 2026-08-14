/**
 * @role The facade — the headless instrument. send() is the only mutator, probe() the whole
 *       state as JSON, on() the event stream; UI, CLI and agents all enter here.
 * @instead What a command does → src/app/execute.ts. This file guards the wire and wires the
 *          pieces together; the guards are here because this is where untyped input arrives.
 */
// The facade is the composition root for app, audio, state, persistence, and the command bus.
// oxlint-disable import/max-dependencies
import { type DeckPeek, LOOKAHEAD_SECS } from "@/audio/deck";
import type { Peaks } from "@/lib/peaks";
import type { BlobId } from "@/lib/source";
import type { SessionRepository } from "@/state/repository";
import { migrateSession, sessionV1 } from "@/state/session";
import {
  createSessionStore,
  DECK_IDS,
  type DeckId,
  type SessionReader,
  type SessionState,
} from "@/state/store";
import { EventBus } from "./bus";
import type { Clock } from "./clock";
import type { Command, Envelope } from "./commands";
import type { Emit, Engine } from "./engine";
import type { Event } from "./events";
import { execute } from "./execute";
import { CommandQueue } from "./queue";
import { restorationCommands } from "./restore";
// oxlint-enable import/max-dependencies

export type { DeckPeek } from "@/audio/deck";

export type Probe = { at: number; decks: SessionState["decks"] };

/**
 * How late a command may be delivered before it is an xrun. A scheduled envelope waits for a
 * pump, and the live host pumps on a 10ms interval, so every one of them is a few milliseconds
 * late by construction. This has to sit above that noise floor to mean anything: at the
 * transport's whole lookahead, it fires only when the pump itself did not run.
 */
export const XRUN_LATE_SECS = LOOKAHEAD_SECS;
/** Durable changes trail by this long; transient state never starts this timer. */
export const AUTOSAVE_DELAY_MS = 500;

export type Instrument = {
  /** The only way to change anything. A bare command is an envelope meaning now. */
  send(input: Command | Envelope): void;
  /** Store unchanged imported bytes without mutating the session. */
  ingest(file: File): Promise<BlobId>;
  /** Settles after automatic startup restoration has finished. */
  ready: Promise<void>;
  /** The full state as JSON — what agents assert on for state, as the log is for behaviour. */
  probe(): Probe;
  /** Lossless event subscription; returns unsubscribe. */
  on(listener: (event: Event) => void): () => void;
  /** The ring's view of recent events — what the #/log panel renders. */
  ring(): Event[];
  /** Deliver scheduled envelopes that have come due. The host decides how often. */
  pump(): void;
  /**
   * The per-frame read — the third channel beside probe() and the log (0014): playhead and
   * meter as numbers, valid until the next peek of the same deck. It never allocates and never
   * writes; each call refills one preallocated object per deck. With no engine it reads zeros,
   * the way probe() reads a silent session.
   */
  peek(deck: DeckId): Readonly<DeckPeek>;
  /**
   * The loaded buffer reduced to drawable columns — computed once per load, handed out by
   * reference, null before anything is loaded. Numbers only: no AudioBuffer crosses here.
   */
  peaks(deck: DeckId): Peaks | null;
  /**
   * The session, for subscribers. Read-only by type: `src/ui` renders from this so a per-frame
   * subscription skips a round trip through probe(), and every write still goes through send().
   */
  state: SessionReader;
};

/**
 * `makeEngine` is a factory rather than an engine because the engine emits: it needs the bus
 * this function is about to build. Omit it and the spine runs with no audio at all — which is
 * what the pure Vitest tests use, and what makes them milliseconds long.
 */
// Over the line cap by design: this closure owns the store, bus, queue, engine and peek
// scratch, and every facade member is a few lines of delegation into them. Splitting it means
// threading that shared state through helpers with one caller each. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function createInstrument(
  clock: Clock,
  makeEngine?: (store: ReturnType<typeof createSessionStore>, emit: Emit) => Engine,
  repository: SessionRepository | null = null,
): Instrument {
  const store = createSessionStore();
  const bus = new EventBus(clock);
  const emit: Emit = (body, at) => {
    bus.emit(body, at);
  };
  const engine = makeEngine?.(store, emit) ?? null;
  let hydrating = true;
  let durable = JSON.stringify(sessionV1(store.getState()));
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  let saveTail = Promise.resolve();
  const pendingLoads = new Set<Promise<void>>();
  const loadEpoch = new Map<DeckId, number>(DECK_IDS.map((deck) => [deck, 0]));

  const beginLoad = (deck: DeckId): number => {
    const token = (loadEpoch.get(deck) ?? 0) + 1;
    loadEpoch.set(deck, token);
    return token;
  };
  const isCurrentLoad = (deck: DeckId, token: number): boolean => loadEpoch.get(deck) === token;

  const waitForLoads = async (): Promise<void> => {
    while (pendingLoads.size > 0) {
      const loads = [...pendingLoads];
      // A completion listener may synchronously start another load; loop until the set is quiet.
      // oxlint-disable-next-line no-await-in-loop
      await Promise.all(loads.map((load) => load.catch(() => {})));
    }
  };

  const cancelAutosave = (): void => {
    if (autosaveTimer === null) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  };

  const save = (reason: "manual" | "autosave"): void => {
    if (reason === "manual") cancelAutosave();
    if (repository === null) {
      bus.emit({ t: "error", detail: "no persistence: session.save is unavailable" });
      return;
    }
    // A save ordered after a blob load waits for that load to either commit or fail. Otherwise
    // GC could delete its temporarily unreferenced bytes while decodeAudioData still owns a copy.
    const operation = saveTail.then(async () => {
      // Sample when this serialized write actually begins, not when it was queued behind an
      // earlier write: loads started during that wait must also settle before this GC runs.
      await waitForLoads();
      return repository.save(sessionV1(store.getState()));
    });
    // One failed write reports its own failure but does not poison every later save.
    saveTail = operation.catch(() => {});
    void operation.then(
      () => bus.emit({ t: "session.saved", reason }),
      (error: unknown) => bus.emit({ t: "error", detail: `session.save: ${String(error)}` }),
    );
  };

  store.subscribe(() => {
    const next = JSON.stringify(sessionV1(store.getState()));
    if (next === durable) return;
    durable = next;
    if (hydrating || repository === null) return;
    cancelAutosave();
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null;
      save("autosave");
    }, AUTOSAVE_DELAY_MS);
  });
  // The peek scratch: one object per deck, refilled in place on every read, so sixty reads a
  // second cost sixty writes and no garbage (docs/plan.md §4).
  const scratch = new Map<DeckId, DeckPeek>(
    DECK_IDS.map((deck) => [deck, { position: 0, meter: 0 }]),
  );
  // The one envelope the innermost send() call is delivering, as the ticket its enqueue was
  // handed. It decides where an execute throw goes: the synchronous caller gets its own
  // command's throw back as the refusal it is, but any other envelope has no caller by the
  // time it runs — enqueue drains everything due, so a stale scheduled command can come due
  // inside an innocent send(), and its throw must not land on that bystander. With no caller
  // to throw to, the throw becomes what every other unanswerable command already is: an error
  // event (principle 5). A ticket per envelope, not the command's identity: a caller may reuse
  // one command object for a scheduled and a later immediate send, and identity would blame
  // the second caller for the first envelope's throw. Not a boolean either: a flag would be
  // cleared by a re-entrant send() and blamed on the wrong command.
  let syncTicket: unknown = null;
  const runtime = { store, bus, engine, repository, save, beginLoad, isCurrentLoad };
  const queue = new CommandQueue(clock, (cmd, dueAt, ticket) => {
    // The one deadline the instrument actually has: an envelope said when it wanted to run,
    // and this is when it did. Everything downstream is schedule-ahead — the transport starts
    // a source at an explicit future time, so a blocked main thread makes the sound later, not
    // late — but nothing can recover a command that was handed over after its moment passed.
    // Never swallowed: an xrun is a line on the log by definition (docs/plan.md §1).
    const late = clock.now() - dueAt;
    if (late > XRUN_LATE_SECS) {
      bus.emit({ t: "xrun", detail: `${cmd.t} delivered ${(late * 1000).toFixed(1)}ms late` });
    }
    try {
      const completion = execute(cmd, runtime);
      if (completion !== undefined) {
        pendingLoads.add(completion);
        void completion.then(
          () => pendingLoads.delete(completion),
          (error: unknown) => {
            pendingLoads.delete(completion);
            bus.emit({ t: "error", detail: `${cmd.t}: ${String(error)}` });
          },
        );
      }
    } catch (error) {
      if (ticket === syncTicket) throw error;
      bus.emit({ t: "error", detail: `${cmd.t}: ${String(error)}` });
    }
  });

  const ready = (async (): Promise<void> => {
    if (repository === null) {
      hydrating = false;
      return;
    }
    const stored = await repository.load();
    if (stored !== undefined) {
      const session = migrateSession(stored);
      for (const cmd of restorationCommands(session)) {
        // Hydration is deliberately serial: effects depend on parameters and loops on sources.
        // oxlint-disable-next-line no-await-in-loop
        await execute(cmd, runtime);
      }
      durable = JSON.stringify(sessionV1(store.getState()));
      bus.emit({ t: "session.restored", version: session.version });
    }
    hydrating = false;
  })();

  return {
    ready,
    ingest: (file) => {
      if (repository === null)
        return Promise.reject(new Error("no persistence: ingest is unavailable"));
      return repository.ingest(file);
    },
    send: (input) => {
      // The wire can hand us null or a bare string; the `in` operator would throw its
      // own opaque TypeError, so say what actually went wrong.
      const raw: unknown = input;
      if (typeof raw !== "object" || raw === null) {
        throw new TypeError(`not a command or envelope: ${String(raw)}`);
      }
      const envelope: Envelope = "cmd" in input ? input : { cmd: input };
      // Checked here, at the door, while there is still a caller to throw to — a null cmd
      // scheduled for later would otherwise blow up inside a pump() with no error event.
      const cmd: unknown = envelope.cmd;
      if (typeof cmd !== "object" || cmd === null) {
        throw new TypeError(`envelope.cmd is not a command: ${String(cmd)}`);
      }
      // A fresh object per send: the sentinel enqueue hands back so this envelope's run — and
      // only this envelope's — throws here rather than onto the log.
      const ticket = {};
      const outer = syncTicket;
      syncTicket = ticket;
      try {
        queue.enqueue(envelope, ticket);
      } finally {
        syncTicket = outer;
      }
    },
    probe: () => ({ at: clock.now(), decks: store.getState().decks }),
    on: (listener) => bus.on(listener),
    ring: () => bus.ring(),
    pump: () => {
      queue.pump();
    },
    peek: (deck) => {
      const out = scratch.get(deck);
      if (out === undefined) throw new Error(`no deck ${deck}`);
      if (engine === null) {
        out.position = 0;
        out.meter = 0;
      } else {
        engine.peek(deck, out);
      }
      return out;
    },
    peaks: (deck) => engine?.peaks(deck) ?? null,
    state: { getState: store.getState, subscribe: store.subscribe },
  };
}
