/**
 * @role What the jumping module's own commands do: hold one deck's whole pattern, hear one part of
 *   the song it is arranged as on its own, queue one part to play next, and hold the one jump
 *   clock the whole session shares (0089, 0097, 0190).
 * @instead Every other command's behaviour → src/app/execute.ts, which dispatches to these. What a
 *   pattern *is*, and the one validator a spec comes through → src/lib/player.ts. The pass a solo
 *   is held over, and what a soloed song is → src/audio/player.ts and src/lib/playerSong.ts. Split out of execute.ts when the hard 800-line cap made the
 *   audition a move rather than a note (0045, docs/map.md).
 */
import { playerSounding } from "@/lib/player";
import { assertGround, assertSync } from "@/lib/playerWire";
import { assertDurableText } from "@/lib/guards";
import { songsOnset } from "@/lib/playerSongs";
import { songIsDrawn } from "@/lib/playerSong";
import { deckIn, patchDeck, setGround, setSync } from "@/state/store";
import type { Command } from "./commands";
import { audio, refuseUnloaded } from "./refusals";
import type { Runtime } from "./runtime";

/**
 * The whole pattern a deck carries, held and handed to the graph. One command carrying the whole
 * spec, because a pattern half moved is a pattern nobody asked for (0089).
 *
 * The deck holds the spec whatever the switch on the card says, and only the graph is told: the
 * store, the event, history and storage all carry it entire, and `playerSounding` is what turns a
 * bypassed one into the null a voice hears (P164, src/lib/player.ts). So turning the module off
 * keeps the pattern, its song and every dial the hand turned, and turning it back on plays them.
 */
export function setPlayer(cmd: Extract<Command, { t: "deck.player" }>, rt: Runtime): void {
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  // The same refusal the loop makes: a deck with nothing loaded has no grid to jump around, and
  // holding a pattern for one would be a durable edit nobody could hear (0089).
  if (refuseUnloaded(rt, cmd.deck)) return;
  engine.setPlayer(cmd.deck, playerSounding(cmd.player));
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
 * The session's shared ground, read exactly as the clock above it is and for the same reason: it
 * names no deck, so it is a durable edit of its own, and it is written whether or not a host is
 * attached (0313). Whole rather than a word at a time — a ground half moved is not a place a loop
 * could be, and the yards standing on it would disagree about where they are for one frame.
 */
export function setSharedGround(cmd: Extract<Command, { t: "session.ground" }>, rt: Runtime): void {
  const ground = assertGround(cmd.ground, "session.ground");
  rt.engine?.setGround(ground);
  setGround(rt.store, ground);
  rt.bus.emit({ t: "session.ground.changed", ground });
}

/**
 * What a press naming a part is refused on at the durable spec, said loudly on the log rather
 * than passed over (principle 5): a deck carrying no pattern, a pattern drawing its own
 * arrangement — whose run is not a list anything holds, so no press can name a part of it (0158)
 * — and a part this song does not stand in, which is one it never had and one it passes over.
 * Answers whether the press was refused. Shared by the solo and the arm, which are one gesture
 * shape at this tier: transport naming a part of the held list.
 */
function refusedPart(
  cmd: Extract<Command, { t: "deck.playerSolo" | "deck.playerArm" }>,
  rt: Runtime,
  verb: string,
): boolean {
  const refuse = (why: string): void => {
    rt.bus.emit({ t: "error", detail: `${cmd.t}: deck ${cmd.deck} ${why}` });
  };
  if (cmd.part === null) return false;
  const held = deckIn(rt.store.getState().decks, cmd.deck).player;
  if (held === null) {
    refuse(`holds no pattern to ${verb}`);
    return true;
  }
  if (songIsDrawn(held)) {
    refuse("is drawing its own arrangement");
    return true;
  }
  if (songsOnset(held.songs, cmd.part) === null) {
    refuse(`stands in no part ${cmd.part}`);
    return true;
  }
  return false;
}

/**
 * One part of the song heard on its own, over and over, until the solo is handed back with null.
 * The pass builds its walk from the song that one part is, and a song of one part comes round
 * (`soloSongs`, src/lib/playerSongs.ts) — so this is a cue that keeps holding rather than a second
 * kind of pattern (0181, 0190).
 *
 * A transport state and never an edit, on the terms a seek is one: nothing durable moves, no
 * history entry is made, and the song that comes back is the song that was held all along. It ends
 * when the pass does (0041, 0190).
 *
 * Four refusals. Three are facts about the durable spec and are answered where it is held
 * (`refusedPart`); the fourth is the pass's own and comes back as false: a deck with no pass to
 * hold a solo over. All three of the first are asked only when a part is being asked for: dropping
 * a solo names no part, so a deck holding no pattern is a deck with no solo to drop, which is the
 * state it is already in.
 */
export function soloPlayer(cmd: Extract<Command, { t: "deck.playerSolo" }>, rt: Runtime): void {
  // The same guard a part's own id goes through in the spec that holds it: opaque durable text, and
  // nothing about what it means. Here rather than in `assertGroupedEdit`, which proves the shape of
  // durable edits only — a solo is transport, like the seek that checks its own number
  // (src/lib/player.ts, src/app/wire.ts, 0157).
  if (cmd.part !== null) assertDurableText(cmd.part, "deck.playerSolo part");
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  if (refusedPart(cmd, rt, "solo")) return;
  if (!engine.soloPlayer(cmd.deck, cmd.part)) {
    rt.bus.emit({ t: "error", detail: `${cmd.t}: deck ${cmd.deck} is not jumping` });
  }
}

/**
 * One part of the song queued to play next: at the next part boundary the pass winds the walk to
 * it and the run carries on from there, which is what a launch grid's press is. Null lets go of a
 * part queued and not yet drawn. Transport on exactly the solo's terms — nothing durable moves, no
 * history entry, the run that plays is the run that was held (0041).
 *
 * The solo's three refusals at the spec, and the pass's own as false: no pass to queue over, or a
 * solo held, whose run of one part has no boundary a queued jump could land on.
 */
export function armPlayer(cmd: Extract<Command, { t: "deck.playerArm" }>, rt: Runtime): void {
  if (cmd.part !== null) assertDurableText(cmd.part, "deck.playerArm part");
  const engine = audio(rt, cmd.t);
  if (engine === null) return;
  if (refusedPart(cmd, rt, "arm")) return;
  if (!engine.armPlayer(cmd.deck, cmd.part)) {
    rt.bus.emit({ t: "error", detail: `${cmd.t}: deck ${cmd.deck} is not jumping` });
  }
}
