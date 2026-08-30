/**
 * @role The contract one deck's transport fills: everything a host may ask of a voice — load,
 *   play, loop, jump, parameter, lane, rack and per-frame read — and nothing about how any of it
 *   is done. Its own file for the reason ./deckPeek.ts is: the shape is read a tier up, in
 *   src/app/engine.ts, and the implementation beside it is one whole state machine that the
 *   contract has no business sharing a cap with (0007).
 * @instead The transport that fills it → src/audio/deck.ts. The per-frame read it writes into →
 *   src/audio/deckPeek.ts.
 */
import type { PlayerSpec } from "@/lib/player";
import type { AutomationPoint } from "@/lib/automation";
import type { GrowthBounds } from "@/lib/effectGrowth";
import type { Loop } from "@/lib/timeline";
import type { DeckPeek } from "./deckPeek";
import type { DeckPlayer } from "./player";
import type { EffectInstanceId } from "./effects/contract";
import type { EffectId } from "./effects/registry";
import type { AutomationParamId, EffectParamValues, ParamId } from "./params";

export type DeckVoice = {
  load(buffer: AudioBuffer): void;
  /** The buffer this deck is holding, or null before its first load — what a crop reads (0047). */
  loaded(): AudioBuffer | null;
  /**
   * Starts LOOKAHEAD_SECS from now, from wherever a pause left the playhead — the top of the
   * loop, or of the buffer, when nothing is held. Playing an already-playing deck restarts it.
   */
  play(): void;
  /** Stops and forgets the playhead: the next play starts at the top of the loop (0038). */
  stop(): void;
  /** Stops and holds the playhead where it is, so the next play carries on from there (0038). */
  pause(): void;
  /**
   * Move the playhead to `position` seconds into the buffer, clamped to it. Stopped, it is where
   * the next play begins; playing, the transport is rescheduled from there without stopping being
   * asked for. Returns where the playhead was actually put (0041).
   */
  seek(position: number): number;
  /** Whether a source is planned, including the lookahead before its started report. */
  planned(): boolean;
  /**
   * `out` at or below `in` clears the loop, as does anything shorter than a render quantum.
   * Returns what was actually applied, which is what the session and the log then carry.
   */
  setLoop(inSecs: number, outSecs: number): Loop | null;
  /**
   * Hold the jump pattern, or drop it with null. Switching it on or off restarts a playing deck;
   * moving its numbers re-arms the pass (0089, P67). `setSync` holds the session's clock (0097).
   */
  setPlayer(player: PlayerSpec | null): void;
  /** Hear one part of the song on its own until it is handed back with null: a transport state,
   *  never an edit (0041, 0190). A property for the reason `setSync` is one — it is handed on as
   *  the pass's own function. */
  soloPlayer: DeckPlayer["solo"];
  setSync(sync: number | null): void;
  setParam(instance: EffectInstanceId | null, param: ParamId, value: number): void;
  /** The hand let go: every rebuild a plugin declared expensive is paid for now, once (P63). */
  endGesture(): void;
  /**
   * Hold a lane against this deck, or drop it when `lane` is empty. Nothing is heard until the
   * transport arms it: the points are gesture-relative, and this voice decides where each cycle
   * of them lands on the clock (0028, 0035).
   */
  setAutomation(
    instance: EffectInstanceId | null,
    param: AutomationParamId,
    lane: readonly AutomationPoint[],
    base: number,
  ): void;
  addEffect(instance: EffectInstanceId, effect: EffectId, values: EffectParamValues): number;
  setEffectBypass(instance: EffectInstanceId, bypassed: boolean): void;
  /** The windows a hand has put on what one held instance draws (0208). */
  setEffectBounds(instance: EffectInstanceId, bounds: GrowthBounds): void;
  removeEffect(instance: EffectInstanceId): void;
  reorderEffects(order: readonly EffectInstanceId[]): void;
  /**
   * Arm every held lane, and every jump the player owes, across the horizon from wherever the
   * clock stands now — the tick's own work, done on demand. A live deck never needs this: its
   * interval is already running. An offline render does, because that interval is wall time and
   * nothing on the main thread runs while a render does, so the host arms the horizon from inside
   * the render (src/app/render.ts). It keeps the name it had when lanes were the only thing armed
   * ahead (0071, 0077); the player rides this tick because it needs the same one (0089).
   */
  armAutomation(): void;
  /** Writes the playhead and meter into `out` — silence and zero when nothing is playing. */
  peek(out: DeckPeek): void;
  /** Resolves after the reporter has received every plan and returned every prior report. */
  syncReports(): Promise<void>;
  /** Permanently disconnect this voice and cancel its pending transport/report state. */
  dispose(): void;
};
