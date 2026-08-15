/**
 * @role The facade — the headless instrument. send() is the only mutator, probe() the whole
 *       state as JSON, on() the event stream; UI, CLI and agents all enter here.
 * @instead What a command does → src/app/execute.ts. This file guards the wire and wires the
 *          pieces together; the guards are here because this is where untyped input arrives.
 */
// The facade is the composition root for app, audio, state, persistence, archive staging, and the
// command bus. Its members remain small delegations except the three reviewed atomic coordinators.
// See 0007, 0020 and 0021.
// oxlint-disable import/max-dependencies, max-lines
import { type DeckPeek, LOOKAHEAD_SECS } from "@/audio/deck";
import { isEffectId } from "@/audio/effects/registry";
import { isAutomationParam, PARAMS } from "@/audio/params";
import { normalizeAutomationLane } from "@/lib/automation";
import type { Peaks } from "@/lib/peaks";
import {
  createSessionArchive,
  parseSessionArchive,
  SESSION_ARCHIVE_FILE,
} from "@/lib/sessionArchive";
import type { BlobId } from "@/lib/source";
import { assertSourceRef } from "@/lib/source";
import type { SessionRepository } from "@/state/repository";
import { validateSession, sessionBlobIds, sessionSnapshot, type Session } from "@/state/session";
import {
  createSessionStore,
  type DeckId,
  fromDecks,
  isDeckId,
  replaceSession,
  type SessionReader,
  type SessionState,
} from "@/state/store";
import { EventBus } from "./bus";
import type { Clock } from "./clock";
import type {
  Command,
  DurableEditCommand,
  Envelope,
  GroupedEditCommand,
  SessionArchiveHandle,
} from "./commands";
import type { Emit, Engine } from "./engine";
import type { Event, EventBody } from "./events";
import { execute } from "./execute";
import { SessionHistory, type HistoryState } from "./history";
import { CommandQueue } from "./queue";
import { restorationCommands, restoredSessionState } from "./restore";
// oxlint-enable import/max-dependencies

export type { DeckPeek } from "@/audio/deck";

export type Probe = { at: number } & SessionState;

/**
 * Whether the instrument is keeping up, as numbers: the counters the debug console shows. Each
 * one is read from the single owner that already has it — the bus, the queue, the pending loads,
 * the analyzer and the context — so nothing here is a second tally kept in parallel.
 */
export type Stats = {
  /** The clock every envelope is scheduled against. */
  at: number;
  /** Events ever stamped, and how many of them the ring no longer holds. */
  events: number;
  dropped: number;
  /** Envelopes waiting for a pump. */
  queued: number;
  /** Loads still decoding, and buffers the analysis worker has not answered. */
  decoding: number;
  analyzing: number;
  /** The audio clock's state, or "none" for a spine running with no graph at all. */
  context: AudioContextState | "none";
};

/**
 * How late a command may be delivered before it is an xrun. A scheduled envelope waits for a
 * pump, and the live host pumps on a 10ms interval, so every one of them is a few milliseconds
 * late by construction. This has to sit above that noise floor to mean anything: at the
 * transport's whole lookahead, it fires only when the pump itself did not run.
 */
export const XRUN_LATE_SECS = LOOKAHEAD_SECS;
/** Durable changes trail by this long; transient state never starts this timer. */
export const AUTOSAVE_DELAY_MS = 500;

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
  "deck.stop": false,
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
      if (typeof raw.value !== "number" || !Number.isFinite(raw.value))
        throw new TypeError(`param value is not a finite number: ${String(raw.value)}`);
      return;
    case "automation.set":
      if (!isAutomationParam(raw.param)) {
        throw new TypeError(`param does not support automation: ${String(raw.param)}`);
      }
      normalizeAutomationLane(raw.points, PARAMS[raw.param]);
      return;
    case "effect.add":
    case "effect.remove":
      if (!isEffectId(raw.effect)) throw new TypeError(`unknown effect: ${String(raw.effect)}`);
      return;
    case "effect.bypass":
      if (!isEffectId(raw.effect)) throw new TypeError(`unknown effect: ${String(raw.effect)}`);
      if (typeof raw.bypassed !== "boolean")
        throw new TypeError(`effect bypass is not a boolean: ${String(raw.bypassed)}`);
      return;
    case "effect.reorder":
      if (!isEffectId(raw.effect)) throw new TypeError(`unknown effect: ${String(raw.effect)}`);
      if (typeof raw.index !== "number" || !Number.isInteger(raw.index))
        throw new TypeError(`effect index is not an integer: ${String(raw.index)}`);
  }
}

export type Instrument = {
  /** The only way to change anything. A bare command is an envelope meaning now. */
  send(input: Command | Envelope): void;
  /** Store unchanged imported bytes without mutating the session. */
  ingest(file: File): Promise<BlobId>;
  /** Project the current durable session and exactly its reachable bytes into one file. */
  exportSession(): Promise<File>;
  /** Parse and validate a selected archive without mutating session state or persistence. */
  ingestSession(file: File): Promise<SessionArchiveHandle>;
  /** Settles after automatic startup restoration has finished. */
  ready: Promise<void>;
  /** The full state as JSON — what agents assert on for state, as the log is for behaviour. */
  probe(): Probe;
  /**
   * The counters, for a reader that runs every frame: one preallocated object refilled in place,
   * never allocated and never accumulated — the same contract peek() has.
   */
  stats(): Readonly<Stats>;
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
  /** Availability of the in-memory undo and redo command targets. */
  history: {
    getState: () => HistoryState;
    subscribe: (listener: () => void) => () => void;
  };
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
  const history = new SessionHistory(sessionSnapshot(store.getState()));
  let historyIntent = 0;
  let hydrating = true;
  let durable = JSON.stringify(sessionSnapshot(store.getState()));
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  let grouping = false;
  let saveTail = Promise.resolve();
  let ready = Promise.resolve();
  const pendingLoads = new Set<Promise<void>>();
  const stagedArchives = new Map<
    string,
    { session: Session; blobs: ReadonlyMap<BlobId, Uint8Array<ArrayBuffer>> }
  >();
  // Keyed lazily rather than seeded from a registry: a deck's first load is its first entry, and
  // a removed deck's stale token simply stops being asked about (0029).
  const loadEpoch = new Map<DeckId, number>();

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
      return repository.save(sessionSnapshot(store.getState()), history.blobIds());
    });
    // One failed write reports its own failure but does not poison every later save.
    saveTail = operation.catch(() => {});
    void operation.then(
      () => bus.emit({ t: "session.saved", reason }),
      (error: unknown) => bus.emit({ t: "error", detail: `session.save: ${String(error)}` }),
    );
  };

  const scheduleAutosave = (): void => {
    if (repository === null || hydrating) return;
    cancelAutosave();
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null;
      save("autosave");
    }, AUTOSAVE_DELAY_MS);
  };

  const observeDurable = (): void => {
    const next = JSON.stringify(sessionSnapshot(store.getState()));
    if (next === durable) return;
    if (grouping) return;
    durable = next;
    scheduleAutosave();
  };
  store.subscribe(observeDurable);
  // The peek scratch: one object per deck, refilled in place on every read, so sixty reads a
  // second cost sixty writes and no garbage (docs/plan.md §4). One allocation per deck ever, on
  // its first read — a deck the session added is a deck a surface may peek (0029).
  const scratch = new Map<DeckId, DeckPeek>();
  // The counters' scratch, for the same reason: stats() is read once a frame while the console
  // is open, and a fresh object per read would be garbage sixty times a second.
  const statsScratch: Stats = {
    at: 0,
    events: 0,
    dropped: 0,
    queued: 0,
    decoding: 0,
    analyzing: 0,
    context: "none",
  };
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
  const invalidateLoads = (): number => {
    const token = ++historyIntent;
    for (const deck of store.getState().deckIds) beginLoad(deck);
    return token;
  };
  // The archive prepare/commit sequence is intentionally visible in one closure: splitting it
  // would pass its staged handle, save tail, pending loads and durable sentinel through one caller.
  // oxlint-disable-next-line max-lines-per-function
  const importArchive = (handle: SessionArchiveHandle): Promise<void> => {
    const raw: unknown = handle;
    if (
      typeof raw !== "object" ||
      raw === null ||
      !("archiveId" in raw) ||
      typeof raw.archiveId !== "string" ||
      raw.archiveId.length === 0 ||
      Object.keys(raw).length !== 1
    ) {
      return Promise.reject(new TypeError("session.import archive is not a valid handle"));
    }
    const archiveId = raw.archiveId;
    const staged = stagedArchives.get(archiveId);
    if (staged === undefined)
      return Promise.reject(new Error(`unknown archive handle: ${raw.archiveId}`));
    if (repository === null)
      return Promise.reject(new Error("no persistence: session.import is unavailable"));
    if (engine === null)
      return Promise.reject(new Error("no audio host: session.import needs an AudioContext"));
    const token = invalidateLoads();
    const earlierLoads = [...pendingLoads];
    // The callback commits by side effect and resolves void; every rejection stays on the tail.
    // oxlint-disable-next-line promise/always-return
    const operation = saveTail.then(async () => {
      // A selected file may arrive while IndexedDB startup hydration is still in flight. The
      // imported session is later intent, so hydration must finish before it can prepare/commit.
      await ready;
      await Promise.all(earlierLoads.map((load) => load.catch(() => {})));
      if (token !== historyIntent) return;
      const prepared = await engine.prepareRestore(staged.session, staged.blobs);
      try {
        if (token !== historyIntent) {
          prepared.discard();
          return;
        }
        await repository.replace(staged.session, staged.blobs, undefined, () => {
          return token === historyIntent;
        });
      } catch (error) {
        prepared.discard();
        if (token !== historyIntent) return;
        throw error;
      }
      cancelAutosave();
      prepared.commit();
      durable = JSON.stringify(staged.session);
      replaceSession(store, restoredSessionState(staged.session, prepared.durations));
      // After the store holds the restored decks: measurement writes to them (0029).
      prepared.measure();
      history.reset(sessionSnapshot(store.getState()));
      stagedArchives.delete(archiveId);
      bus.emit({ t: "session.imported" });
    });
    saveTail = operation.catch(() => {});
    return operation;
  };
  const isDurableEdit = (command: Command): command is DurableEditCommand =>
    isDurableEditKind(command.t);
  const assertGroupedEdits = (commands: GroupedEditCommand[]): void => {
    const raw: unknown = commands;
    if (!Array.isArray(raw)) throw new TypeError("history.group commands must be an array");
    for (const command of raw) assertGroupedEdit(command);
  };
  const restoreCheckpoint = (target: Session): Promise<boolean> => {
    const token = invalidateLoads();
    const earlier = saveTail;
    const operation = earlier.then(async () => {
      await ready;
      const blobs =
        repository === null
          ? new Map<BlobId, Uint8Array<ArrayBuffer>>()
          : await repository.blobs(sessionBlobIds(target));
      if (engine === null) {
        if (token !== historyIntent) return false;
        replaceSession(
          store,
          restoredSessionState(
            target,
            fromDecks(target.deckIds, () => 0),
          ),
        );
        return true;
      }
      const prepared = await engine.prepareRestore(target, blobs);
      if (token !== historyIntent) {
        prepared.discard();
        return false;
      }
      prepared.commit();
      replaceSession(store, restoredSessionState(target, prepared.durations));
      prepared.measure();
      return true;
    });
    saveTail = operation.then(
      // Settling the serialized tail is the side effect; its value is deliberately void.
      // oxlint-disable-next-line promise/always-return
      () => {},
      // oxlint-disable-next-line promise/always-return
      () => {},
    );
    return operation;
  };
  const historyUndo = async (): Promise<void> => {
    const target = history.undoTarget();
    if (target === null) {
      bus.emit({ t: "error", detail: "history.undo: undo history is empty" });
      return;
    }
    const current = sessionSnapshot(store.getState());
    if (!(await restoreCheckpoint(target))) return;
    history.commitUndo(current);
    bus.emit({ t: "history.undone" });
  };
  const historyRedo = async (): Promise<void> => {
    const target = history.redoTarget();
    if (target === null) {
      bus.emit({ t: "error", detail: "history.redo: redo history is empty" });
      return;
    }
    const current = sessionSnapshot(store.getState());
    if (!(await restoreCheckpoint(target))) return;
    history.commitRedo(current);
    bus.emit({ t: "history.redone" });
  };
  const runtime = {
    store,
    bus,
    engine,
    repository,
    save,
    beginLoad,
    isCurrentLoad,
    importArchive,
    // The prepare/run/rollback transaction stays visible in one owner.
    // oxlint-disable-next-line max-lines-per-function
    historyGroup: async (commands: GroupedEditCommand[]) => {
      assertGroupedEdits(commands);
      const before = sessionSnapshot(store.getState());
      const token = invalidateLoads();
      const rollbackBlobs =
        repository === null
          ? new Map<BlobId, Uint8Array<ArrayBuffer>>()
          : await repository.blobs(sessionBlobIds(before));
      if (token !== historyIntent) return;
      const rollback = engine === null ? null : await engine.prepareRestore(before, rollbackBlobs);
      if (token !== historyIntent) {
        rollback?.discard();
        return;
      }
      const buffered: Array<{ body: EventBody; at: number }> = [];
      const groupBus = {
        emit: (body: EventBody, at: number = clock.now()) => {
          if (body.t === "error") throw new Error(body.detail);
          buffered.push({ body, at });
        },
      };
      const groupRuntime = { ...runtime, bus: groupBus };
      const hadAutosave = autosaveTimer !== null;
      cancelAutosave();
      grouping = true;
      try {
        for (const command of commands) {
          const completion = execute(command, groupRuntime);
          // Group order is command order even when a blob decode makes one edit asynchronous.
          // oxlint-disable-next-line no-await-in-loop
          if (completion !== undefined) await completion;
        }
      } catch (error) {
        invalidateLoads();
        try {
          if (rollback === null) {
            replaceSession(
              store,
              restoredSessionState(
                before,
                fromDecks(before.deckIds, () => 0),
              ),
            );
          } else {
            rollback.commit();
            replaceSession(store, restoredSessionState(before, rollback.durations));
            rollback.measure();
          }
        } catch (rollbackError) {
          grouping = false;
          throw new Error(`history.group rollback failed after ${String(error)}`, {
            cause: rollbackError,
          });
        }
        grouping = false;
        if (hadAutosave) scheduleAutosave();
        throw error;
      }
      grouping = false;
      rollback?.discard();
      history.record(sessionSnapshot(store.getState()));
      observeDurable();
      for (const event of buffered) bus.emit(event.body, event.at);
    },
    verifyRestorable: async (target: Session) => {
      const blobs =
        repository === null
          ? new Map<BlobId, Uint8Array<ArrayBuffer>>()
          : await repository.blobs(sessionBlobIds(target));
      if (engine === null) return;
      // Built and released in one breath: this proves the graph could exist, and the live one
      // never learns it happened. A missing blob failed in the read above; a corrupt one, a
      // rack that will not build, or a loop outside its decoded source fails here (0027).
      const prepared = await engine.prepareRestore(target, blobs);
      prepared.discard();
    },
    historyUndo,
    historyRedo,
  };
  let groupTail: Promise<void> | null = null;
  const run = (cmd: Command): void | Promise<void> => {
    if (groupTail !== null) {
      return groupTail.then(
        () => run(cmd),
        () => run(cmd),
      );
    }
    // clip.apply is a group under another name: it expands into ordinary commands and finishes
    // through historyGroup, so it takes the same tail and records its own history entry (0027).
    if (cmd.t === "history.group" || cmd.t === "clip.apply") {
      const operation = execute(cmd, runtime);
      if (operation === undefined) throw new Error(`${cmd.t} did not return a completion`);
      const settled = operation.finally(() => {
        if (groupTail === settled) groupTail = null;
      });
      groupTail = settled;
      return settled;
    }
    if (cmd.t === "session.import") return execute(cmd, runtime);
    if (!isDurableEdit(cmd)) return execute(cmd, runtime);
    historyIntent++;
    const completion = execute(cmd, runtime);
    if (completion === undefined) {
      history.record(sessionSnapshot(store.getState()));
      return;
    }
    // The callback commits by side effect and resolves void.
    // oxlint-disable-next-line promise/always-return
    return completion.then(() => {
      history.record(sessionSnapshot(store.getState()));
    });
  };
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
      const completion = run(cmd);
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

  ready = (async (): Promise<void> => {
    if (repository === null) {
      hydrating = false;
      return;
    }
    const stored = await repository.load();
    if (stored !== undefined) {
      // Pre-release: stored data either is this build's shape or it is not a session. There is no
      // migration to reach for, so it is dropped loudly and the instrument boots fresh (0026).
      let session: Session | null = null;
      try {
        session = validateSession(stored);
      } catch (error) {
        bus.emit({ t: "session.discarded", detail: String(error) });
        await repository.save(sessionSnapshot(store.getState()), new Set());
      }
      if (session !== null) {
        for (const cmd of restorationCommands(session)) {
          // Hydration is deliberately serial: effects depend on parameters and loops on sources.
          // oxlint-disable-next-line no-await-in-loop
          await execute(cmd, runtime);
        }
        durable = JSON.stringify(sessionSnapshot(store.getState()));
        bus.emit({ t: "session.restored" });
      }
    }
    history.reset(sessionSnapshot(store.getState()));
    hydrating = false;
  })();

  return {
    ready,
    ingest: (file) => {
      if (repository === null)
        return Promise.reject(new Error("no persistence: ingest is unavailable"));
      return repository.ingest(file);
    },
    exportSession: async () => {
      if (repository === null) throw new Error("no persistence: session export is unavailable");
      await ready;
      await waitForLoads();
      const session = sessionSnapshot(store.getState());
      const blobs = await repository.blobs(sessionBlobIds(session));
      return new File([createSessionArchive(session, blobs)], SESSION_ARCHIVE_FILE.name, {
        type: SESSION_ARCHIVE_FILE.mediaType,
      });
    },
    ingestSession: async (file) => {
      const parsed = parseSessionArchive(new Uint8Array(await file.arrayBuffer()));
      const session = validateSession(parsed.manifest);
      const expected = sessionBlobIds(session);
      if (
        expected.size !== parsed.blobs.size ||
        [...expected].some((id) => !parsed.blobs.has(id))
      ) {
        throw new TypeError("archive blobs do not match its validated manifest");
      }
      const archiveId = crypto.randomUUID();
      stagedArchives.set(archiveId, { session, blobs: parsed.blobs });
      return { archiveId };
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
    probe: () => ({ at: clock.now(), ...store.getState() }),
    stats: () => {
      statsScratch.at = clock.now();
      statsScratch.events = bus.emitted();
      statsScratch.dropped = bus.dropped();
      statsScratch.queued = queue.depth();
      statsScratch.decoding = pendingLoads.size;
      statsScratch.analyzing = engine?.analyzing() ?? 0;
      statsScratch.context = engine?.contextState() ?? "none";
      return statsScratch;
    },
    on: (listener) => bus.on(listener),
    ring: () => bus.ring(),
    pump: () => {
      queue.pump();
    },
    peek: (deck) => {
      let out = scratch.get(deck);
      if (out === undefined) {
        if (!store.getState().deckIds.includes(deck)) throw new Error(`no deck ${deck}`);
        out = { position: 0, meter: 0 };
        scratch.set(deck, out);
      }
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
    history: { getState: history.getState, subscribe: history.subscribe },
  };
}
