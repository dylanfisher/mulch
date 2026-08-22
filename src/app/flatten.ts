/**
 * @role What `deck.flatten` does: one yard, as it stands, played once through the one render
 *   harness and kept as the blob the command names — then the yard rewritten onto those bytes
 *   with nothing left to play them through (0112).
 * @instead The render itself → src/app/render.ts, which owns the offline context and the pump;
 *   nothing here builds a graph. The order the rewrite replays in → src/app/restore.ts, the same
 *   one a clip is applied through. Every other command's behaviour → src/app/execute.ts.
 */
// Beside src/app/clips.ts and for its reason: this is one command carrying a render, a mint and a
// restoration, and execute.ts is on the soft cap already (0045, docs/map.md).
import { DECK_PARAM_DEFAULTS, deckRate } from "@/audio/params";
import { LOOKAHEAD_SECS } from "@/audio/transport";
import { loopPeriodSecs } from "@/lib/moire";
import { assertBlobId, type BlobId } from "@/lib/source";
import {
  deckSnapshot,
  sessionBlobIds,
  sessionSnapshot,
  type Session,
  type SessionDeck,
} from "@/state/session";
import { deckIn, type DeckId } from "@/state/store";
import type { Command } from "./commands";
import type { SessionRepository } from "@/state/repository";
import type { RenderHost, Runtime } from "./runtime";
import { clipRestorationCommands, restorationCommands } from "./restore";

/**
 * How long one pass of a deck's loop takes to play: the loop's own period at the rate the deck
 * reads at, which is the same pair of readings the drift's loop row is drawn from (0035, 0110).
 * A deck with no loop has no pass, and is refused before this is asked.
 */
function flattenSecs(preset: SessionDeck): number {
  const secs = loopPeriodSecs(preset.loop, deckRate(preset.params));
  // Loud rather than a render of nothing: the reducer clamps both the loop and the rate, and the
  // caller has already refused a yard with no loop, so a pass that is not a length means one of
  // those three stopped being true (principle 5).
  if (!Number.isFinite(secs) || secs <= 0) {
    throw new RangeError(`a flatten's length is not positive: ${secs}`);
  }
  return secs;
}

/**
 * The session a flatten renders: this yard and nothing else. The whole session's restoration
 * order is the one an export already replays (0068, 0077), narrowed to one deck — every other
 * yard would be in the file, and a flatten is one yard's own sound.
 *
 * The clips go with them. A clip borrows a blob and plays nothing (0027), so keeping them would
 * only make the render ask for bytes no deck in it names.
 *
 * The jumps go too, and they are the reason this is a function rather than the session itself: a
 * flatten renders one pass of the loop, and a pattern is not a pass of one — its steps rest, drift
 * and repeat, so a player left in would have the render stop somewhere in the middle of it
 * (`windowOf`, src/audio/player.ts). A pattern is a way of reading a loop, the flattened yard
 * still has that loop, and so it keeps its jumps rather than having a truncated one baked in.
 */
function flattenSession(session: Session, deck: DeckId): Session {
  return {
    ...session,
    activeDeck: deck,
    deckList: session.deckList.filter((entry) => entry.id === deck),
    decks: { [deck]: { ...deckIn(session.decks, deck), player: null } },
    clips: [],
  };
}

/** That session, as the commands a render replays to become it — then the one play (0077). */
function flattenEnvelopes(session: Session, deck: DeckId): Command[] {
  return [...restorationCommands(session), { t: "deck.play", deck }];
}

/** What the yard is left holding: the bytes, at rest, looping the whole of what was rendered. */
function flattened(blobId: BlobId, secs: number, player: SessionDeck["player"]): SessionDeck {
  return {
    // Every one of them at its declared default, and that is the point: the gain, the pan and the
    // read rate are all in the samples now, and leaving any of them where it was would apply it
    // to the sound a second time.
    params: { ...DECK_PARAM_DEFAULTS },
    automation: {},
    effects: [],
    source: { blobId },
    loop: { in: 0, out: secs },
    // Kept, alone among them, because it is the one that was not rendered: the pattern jumps
    // around the loop's own grid, and the loop is still there (0089, and `flattenSession`).
    player,
  };
}

/**
 * The yard, played once through the one render harness, as an encoded file — or null, having said
 * on the log why not. The harness is handed a spec and nothing else: one deck's pass is not a
 * second renderer, and this file builds no graph (0068, 0112).
 */
async function onePass(
  deck: DeckId,
  secs: number,
  rt: Runtime,
  render: RenderHost,
  repository: SessionRepository,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const session = flattenSession(sessionSnapshot(rt.store.getState()), deck);
  const blobs = await repository.blobs(sessionBlobIds(session));
  const result = await render({
    // Two passes rendered and the second one kept. The head that is dropped is the lookahead the
    // transport starts every play at plus a whole pass, and it is a whole pass because the master
    // bus delays what it is handed by a few hundred frames: dropping the lookahead alone would
    // open the clip with that much silence and end it that much short of its own loop, where
    // dropping a pass with it lands the kept window inside sound that is already running. The
    // first pass is also what a delay or a reverb needs to have something to have been fed
    // (0112).
    secs: LOOKAHEAD_SECS + 2 * secs,
    fromSecs: LOOKAHEAD_SECS + secs,
    envelopes: flattenEnvelopes(session, deck),
    // Only when there are any, the way an export hands them over: a render given storage runs the
    // facade's autosave path, and a generated source has nothing for that host to hold.
    ...(blobs.size === 0 ? {} : { blobs }),
    wav: true,
  });
  // The render's own log, read back for the same reason an export reads it: a command it refused
  // is an error event nobody is watching, and the bytes would be stored anyway (principle 5).
  const failed = result.events.find((event) => event.t === "error");
  if (failed !== undefined) {
    rt.bus.emit({
      t: "error",
      detail: `deck.flatten: the render refused a command: ${failed.detail}`,
    });
    return null;
  }
  // The harness only encodes when asked, and it was asked four lines above; a missing file is the
  // harness having changed under this caller, not a case to fall back from (principle 5).
  if (result.wav === undefined) throw new Error("deck.flatten rendered no wav");
  return result.wav;
}

/**
 * One yard flattened. The render happens before anything is stored or rewritten, exactly as a
 * crop takes its samples first (0047): a flatten that cannot be rendered leaves the blob store,
 * the deck and the log as they were.
 *
 * The yard is snapshotted either side of the render and refused if it moved. A render is the one
 * command in this instrument long enough for a hand to change what is being rendered underneath
 * it, and bytes of a performance nobody is holding any more are not what was asked for.
 */
export async function flattenDeck(
  cmd: Extract<Command, { t: "deck.flatten" }>,
  rt: Runtime,
): Promise<void> {
  assertBlobId(cmd.id, "deck.flatten id");
  const before = deckSnapshot(deckIn(rt.store.getState().decks, cmd.deck));
  if (before.loop === null) {
    rt.bus.emit({ t: "error", detail: `deck ${cmd.deck} has no loop to flatten` });
    return;
  }
  const render = rt.render;
  if (render === null) {
    rt.bus.emit({ t: "error", detail: "no render host: deck.flatten cannot render what it keeps" });
    return;
  }
  const repository = rt.repository;
  if (repository === null) {
    rt.bus.emit({ t: "error", detail: "no persistence: deck.flatten cannot store what it plays" });
    return;
  }
  const secs = flattenSecs(before);
  const wav = await onePass(cmd.deck, secs, rt, render, repository);
  if (wav === null) return;
  const current = deckSnapshot(deckIn(rt.store.getState().decks, cmd.deck));
  if (JSON.stringify(current) !== JSON.stringify(before)) {
    rt.bus.emit({ t: "error", detail: `deck ${cmd.deck} changed while it was being flattened` });
    return;
  }
  await repository.ingest(new Blob([wav]), cmd.id);
  // The ordinary restoration order, as one grouped, undoable durable edit — the same rewrite a
  // clip lands through, so a flatten is not a second way to put a preset on a deck (0027).
  await rt.historyGroup(
    clipRestorationCommands(cmd.deck, current, flattened(cmd.id, secs, before.player)),
  );
  rt.bus.emit({ t: "deck.flattened", deck: cmd.deck, blob: cmd.id, secs });
}
