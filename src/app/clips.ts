/**
 * @role What the four clip commands do: capture a deck as a preset, rename it, delete it, and
 *   apply one back onto a deck as ordinary restoration commands (0027).
 * @instead Every other command's behaviour → src/app/execute.ts, which dispatches to these. The
 *   order an apply replays in → src/app/restore.ts. A clip's durable shape → src/state/session.ts.
 */
// Split out of execute.ts, which its own header already named as the cohabitation: these four
// carry the durable session projection and the restoration order, and nothing else there does.
// The hard 800-line cap is what made it a move rather than a note (0045, docs/map.md).
import { deckIdsOf, deckIn, fromDecks, setClips } from "@/state/store";
import {
  assertClipId,
  assertClipName,
  deckSnapshot,
  sessionSnapshot,
  type Clip,
} from "@/state/session";
import type { Command } from "./commands";
import type { Runtime } from "./execute";
import { clipRestorationCommands } from "./restore";

/**
 * The clip a command names, or an error on the log saying it is not there. Naming a clip the
 * session does not hold is unanswerable, not malformed — the same rule a stale rack macro gets,
 * and it must change nothing (0023, 0027).
 */
function clipOf(cmd: Extract<Command, { t: `clip.${string}` }>, rt: Runtime): Clip | null {
  assertClipId(cmd.id, `${cmd.t} id`);
  const clip = rt.store.getState().clips.find((candidate) => candidate.id === cmd.id);
  if (clip === undefined) {
    rt.bus.emit({ t: "error", detail: `${cmd.t}: no clip ${cmd.id}` });
    return null;
  }
  return clip;
}

export function captureClip(cmd: Extract<Command, { t: "clip.capture" }>, rt: Runtime): void {
  assertClipId(cmd.id, "clip.capture id");
  assertClipName(cmd.name, "clip.capture name");
  const state = rt.store.getState();
  if (state.clips.some((clip) => clip.id === cmd.id)) {
    rt.bus.emit({ t: "error", detail: `clip.capture: clip already exists: ${cmd.id}` });
    return;
  }
  const preset = deckSnapshot(deckIn(state.decks, cmd.deck));
  // A clip without a source is one apply could not lead with a deck.load, so it is refused at
  // the only place it can be — capture (0027).
  if (preset.source === null) {
    rt.bus.emit({ t: "error", detail: `clip.capture: deck ${cmd.deck} has nothing loaded` });
    return;
  }
  setClips(rt.store, [...state.clips, { id: cmd.id, name: cmd.name, deck: preset }]);
  rt.bus.emit({ t: "clip.captured", clip: cmd.id, name: cmd.name, deck: cmd.deck });
}

export function renameClip(cmd: Extract<Command, { t: "clip.rename" }>, rt: Runtime): void {
  assertClipName(cmd.name, "clip.rename name");
  const clip = clipOf(cmd, rt);
  if (clip === null) return;
  // Already named that: no durable change, and therefore nothing to say (deck.activate).
  if (clip.name === cmd.name) return;
  setClips(
    rt.store,
    rt.store
      .getState()
      .clips.map((candidate) =>
        candidate.id === cmd.id
          ? { id: candidate.id, name: cmd.name, deck: candidate.deck }
          : candidate,
      ),
  );
  rt.bus.emit({ t: "clip.renamed", clip: cmd.id, name: cmd.name });
}

export function deleteClip(cmd: Extract<Command, { t: "clip.delete" }>, rt: Runtime): void {
  if (clipOf(cmd, rt) === null) return;
  setClips(
    rt.store,
    rt.store.getState().clips.filter((candidate) => candidate.id !== cmd.id),
  );
  // The clip's blob is not deleted here. Nothing owns it: it goes when the next save finds
  // nothing — no deck, no clip, no live checkpoint — still naming it (0027).
  rt.bus.emit({ t: "clip.deleted", clip: cmd.id });
}

/**
 * One deck rewritten to be exactly one clip. The whole target session is proved restorable
 * first, so a missing or corrupt source refuses before the deck, the graph or the log moves;
 * what then runs is ordinary commands in the ordinary restoration order, as one grouped,
 * undoable durable edit (0027).
 */
export async function applyClip(
  cmd: Extract<Command, { t: "clip.apply" }>,
  rt: Runtime,
): Promise<void> {
  const clip = clipOf(cmd, rt);
  if (clip === null) return;
  const before = sessionSnapshot(rt.store.getState());
  await rt.verifyRestorable({
    ...before,
    decks: fromDecks(deckIdsOf(before.deckList), (deck) =>
      deck === cmd.deck ? clip.deck : deckIn(before.decks, deck),
    ),
  });
  const current = deckIn(before.decks, cmd.deck);
  await rt.historyGroup(clipRestorationCommands(cmd.deck, current, clip.deck));
  rt.bus.emit({ t: "clip.applied", clip: cmd.id, deck: cmd.deck });
}
