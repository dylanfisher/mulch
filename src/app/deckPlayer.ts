/**
 * @role What the jumping module's own commands do: hold one deck's whole pattern, cue the pass to
 *   one part of the song it is arranged as, and hold the one jump clock the whole session shares
 *   (0089, 0097, 0181).
 * @instead Every other command's behaviour → src/app/execute.ts, which dispatches to these. What a
 *   pattern *is*, and the one validator a spec comes through → src/lib/player.ts. The pass a cue
 *   winds → src/audio/player.ts. Split out of execute.ts when the hard 800-line cap made the
 *   audition a move rather than a note (0045, docs/map.md).
 */
import { assertSync } from "@/lib/player";
import { assertDurableText } from "@/lib/guards";
import { songIsDrawn, songOnset } from "@/lib/playerSong";
import { deckIn, patchDeck, setSync } from "@/state/store";
import type { Command } from "./commands";
import { audio, refuseUnloaded } from "./refusals";
import type { Runtime } from "./runtime";

/**
 * The whole pattern a deck carries, held and handed to the graph. One command carrying the whole
 * spec, because a pattern half moved is a pattern nobody asked for (0089).
 */
export function setPlayer(cmd: Extract<Command, { t: "deck.player" }>, rt: Runtime): void {
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  // The same refusal the loop makes: a deck with nothing loaded has no grid to jump around, and
  // holding a pattern for one would be a durable edit nobody could hear (0089).
  if (refuseUnloaded(rt, cmd.deck)) return;
  engine.setPlayer(cmd.deck, cmd.player);
  patchDeck(rt.store, cmd.deck, { player: cmd.player });
  rt.bus.emit({ t: "deck.player.changed", deck: cmd.deck, player: cmd.player });
}

/**
 * The session's shared jump clock. Validated here rather than in `assertGroupedEdit`, because a
 * group's guard proves every command names a deck and this one names none: the clock belongs to
 * the session, so it is a durable edit of its own (0097, src/app/wire.ts).
 *
 * Written whether or not a host is attached — unlike a deck command, this changes nothing about
 * a deck and a spine with no graph still holds a session that jumps together when one arrives.
 */
export function setSyncClock(cmd: Extract<Command, { t: "session.sync" }>, rt: Runtime): void {
  const sync = assertSync(cmd.sync, "session.sync");
  rt.engine?.setSync(sync);
  setSync(rt.store, sync);
  rt.bus.emit({ t: "session.sync.changed", sync });
}

/**
 * The pass wound to one part of the song and laid down from there. A transport cue and never an
 * edit: nothing durable moves, no history entry is made, and pressing it twice hears the same
 * thing twice — the seed and the spec are the ones already held (0041, 0181).
 *
 * Four refusals, each said loudly on the log rather than passed over (principle 5). Three are
 * facts about the durable spec and are answered here, where it is held: a deck carrying no
 * pattern, a pattern drawing its own arrangement — whose run is not a list anything holds, so no
 * press can name a part of it (0158) — and a part this song does not stand in, which is one it
 * never had and one it passes over. The fourth is the transport's own and comes back as false: a
 * deck with no pass to wind.
 */
export function cuePlayer(cmd: Extract<Command, { t: "deck.playerCue" }>, rt: Runtime): void {
  // The same guard a part's own id goes through in the spec that holds it: opaque durable text,
  // and nothing about what it means. Here rather than in `assertGroupedEdit`, which proves the
  // shape of durable edits only — a cue is transport, like the seek that checks its own number
  // (src/lib/player.ts, src/app/wire.ts, 0157).
  assertDurableText(cmd.part, "deck.playerCue part");
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  const refuse = (why: string): void => {
    rt.bus.emit({ t: "error", detail: `${cmd.t}: deck ${cmd.deck} ${why}` });
  };
  const held = deckIn(rt.store.getState().decks, cmd.deck).player;
  if (held === null) {
    refuse("holds no pattern to cue");
    return;
  }
  if (songIsDrawn(held)) {
    refuse("is drawing its own arrangement");
    return;
  }
  if (songOnset(held.song, cmd.part) === null) {
    refuse(`stands in no part ${cmd.part}`);
    return;
  }
  if (!engine.cuePlayer(cmd.deck, cmd.part)) refuse("is not jumping");
}
