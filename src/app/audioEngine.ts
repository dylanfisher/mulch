/**
 * @role The contract the audio host fills: everything the command tier may ask of a graph — decks,
 *   transport, values, lanes, racks, per-frame reads and the prepared replacement a rollback swaps
 *   in — and nothing about how any of it is done. Its own file for the reason
 *   src/audio/deckVoice.ts is: the shape is read a tier up and the implementation beside it is one
 *   whole state machine that the contract has no business sharing a cap with (0007).
 * @instead The host that fills it → src/app/engine.ts. The double the tests fill it with →
 *   src/app/engineDouble.ts.
 */
// One import per durable shape the contract names, which is what a contract is: the count tracks
// how many kinds of thing a host is asked about (0007).
// oxlint-disable import/max-dependencies
import type { PlayerSpec } from "@/lib/player";
import type { SongPartId } from "@/lib/playerSong";
import type { SessionGround } from "@/lib/sessionGround";
import type { MasterPeek } from "@/audio/context";
import type { DeckPeek } from "@/audio/deck";
import type { EffectInstanceId } from "@/audio/effects/contract";
import type { GrowthBounds } from "@/lib/effectGrowth";
import type { EffectId } from "@/audio/effects/registry";
import type { AutomationParamId, EffectParamValues, ParamId } from "@/audio/params";
import type { Peaks } from "@/lib/peaks";
import type { AutomationPoint } from "@/lib/automation";
import type { BlobId, GenSource, SourceRef } from "@/lib/source";
import type { Session } from "@/state/session";
import type { DeckId, RackId } from "@/state/store";
import type { EventBody } from "./events";
import type { Loop } from "@/lib/timeline";
// oxlint-enable import/max-dependencies

/** How an event reaches the bus. `at` overrides the clock stamp when the audio thread knows better. */
export type Emit = (body: EventBody, at?: number) => void;

/**
 * The resolution peaks are computed at — fixed, and deliberately decoupled from any canvas
 * width, so "once per load" stays literally true: a resize resamples these columns, it never
 * recomputes them (docs/plan.md §4).
 */
export const PEAK_COLUMNS = 2048;

/**
 * A source decoded once: the buffer a voice plays and the columns a surface draws from, held
 * together because every caller of the decode cache wants both and neither is worth computing
 * twice for one blob.
 */
export type DecodedSource = { buffer: AudioBuffer; peaks: Peaks };

/**
 * What a surface needs to draw a source it does not own: the columns, and how long the decoded
 * audio actually is — the duration a clip's stored loop is drawn against, since a clip records a
 * loop and a source reference but never a length.
 */
export type SourceShape = { peaks: Peaks; duration: number };

export type Engine = {
  /** Give this host a voice for a deck the session has just added. */
  addDeck(deck: DeckId): void;
  /** Dispose the voice, its peaks and any measurement still in flight for a departing deck. */
  removeDeck(deck: DeckId): void;
  /** Renders the source and hands it to the deck. Returns its duration in seconds. */
  load(deck: DeckId, source: GenSource): number;
  /**
   * Decodes unchanged imported bytes through this engine's owning context — once per blob id,
   * so a source another deck, a restore preparation or a clip thumbnail already decoded is
   * simply handed over. `blob` is only read on a miss.
   */
  loadBlob(
    deck: DeckId,
    blobId: BlobId,
    blob: () => Promise<Blob>,
    current: () => boolean,
  ): Promise<number | null>;
  /**
   * The drawable shape of any source the session names, whether or not a deck is holding it —
   * what a clip's thumbnail is drawn from. A stored source goes through the same decode cache a
   * load does, so a thumbnail costs nothing that a load has already paid for.
   */
  sourcePeaks(source: SourceRef, blob: () => Promise<Blob>): Promise<SourceShape>;
  /**
   * Starts one deck a lookahead from now. Decks played inside one drain land together without
   * being told to: `currentTime` does not advance inside a synchronous task, so each of them
   * samples the same clock — which is what makes the header's one press start every yard on the
   * same frame (P66), and what `scripts/smoke.d/keyboard.js` checks by comparing their starts.
   */
  play(deck: DeckId): void;
  /** Stops and rewinds to the top of the loop — the deck's next play starts there (0038). */
  stop(deck: DeckId): void;
  /** Stops and holds the playhead, so the deck's next play carries on from there (0038). */
  pause(deck: DeckId): void;
  /** Moves the playhead: where the next play begins, or where a playing deck carries on (0041). */
  seek(deck: DeckId, position: number): void;
  /** Includes a source still waiting inside the transport lookahead. */
  planned(deck: DeckId): boolean;
  setLoop(deck: DeckId, inSecs: number, outSecs: number): Loop | null;
  /** Hold this deck's jump pattern, or drop it when `player` is null (0089). */
  setPlayer(deck: DeckId, player: PlayerSpec | null): void;
  /**
   * Hear one part of this deck's song on its own, over and over, or hand the whole song back with
   * null — answering whether it did. A transport state and not an edit, the way a seek is not
   * (0041, 0190) — false is a deck with no pass to wind, which the caller says on the log.
   */
  soloPlayer(deck: DeckId, part: SongPartId | null): boolean;
  /**
   * Queue one part of this deck's song to play next, landing at the next part boundary, or let
   * it go with null — answering whether it did. Transport on the solo's terms: false is a deck
   * with no pass to queue over, or one soloing a part, which the caller says on the log.
   */
  armPlayer(deck: DeckId, part: SongPartId | null): boolean;
  /**
   * Hold the session's shared jump clock, or drop it when `sync` is null. It reaches every voice
   * this host holds and every one it builds afterwards, because the clock is the session's and
   * not any deck's (0097).
   */
  setSync(sync: number | null): void;
  /**
   * Hold the session's shared ground, whole. It reaches every voice for the reason the clock does
   * — it is the session's and not any deck's — and a voice reads it only while its own pattern
   * has Together on (0313).
   */
  setGround(ground: SessionGround): void;
  // Every rack call takes a rack address rather than a yard's id: null is the master's, which is
  // built inside the master bus and reached the way a voice is (0320, 0321).
  setParam(deck: RackId, instance: EffectInstanceId | null, param: ParamId, value: number): void;
  setAutomation(
    deck: RackId,
    instance: EffectInstanceId | null,
    param: AutomationParamId,
    lane: readonly AutomationPoint[],
    base: number,
  ): void;
  addEffect(
    deck: RackId,
    instance: EffectInstanceId,
    effect: EffectId,
    values: EffectParamValues,
  ): number;
  /** Rewire a held instance out of, or back into, the rack's signal path (0023). */
  setEffectBypass(deck: RackId, instance: EffectInstanceId, bypassed: boolean): void;
  /** The windows a hand has put on what one instance's run may draw (0208). */
  setEffectBounds(deck: RackId, instance: EffectInstanceId, bounds: GrowthBounds): void;
  /**
   * One place of what an instance is growing, let go of by hand rather than by its own clock.
   * Answers whether that place was still standing (src/audio/effects/contract.ts).
   */
  dismissGrown(deck: RackId, instance: EffectInstanceId, place: EffectInstanceId): boolean;
  removeEffect(deck: RackId, instance: EffectInstanceId): void;
  /** Rewire the rack into the given order, which must be its own instances rearranged. */
  reorderEffects(deck: RackId, order: readonly EffectInstanceId[]): void;
  /**
   * The per-frame read: writes the rack's playhead and meter into `out`. Never allocates. Null is
   * the rack that is no yard's, whose read is its instances' and no transport's (0320).
   */
  peek(deck: RackId, out: DeckPeek): void;
  /**
   * The other per-frame read: the whole output's stereo peak, written into `out`. Beside the
   * per-deck one rather than derived from it — a sum of deck meters is not what the bus carries
   * (docs/plan.md §3).
   */
  masterPeek(out: MasterPeek): void;
  /**
   * The deck's own samples between two times, as `.wav` bytes ready to be stored and loaded back
   * — the one place the instrument mints audio nobody imported (0047). Written in the format
   * everything decodes rather than re-encoded to whatever the source arrived as (0043).
   */
  cropped(deck: DeckId, inSecs: number, outSecs: number): Uint8Array<ArrayBuffer>;
  /** The peaks computed at the deck's last load, or null before the first one. */
  peaks(deck: DeckId): Peaks | null;
  /** The owned context's clock: suspended until a gesture starts it, closed once it is gone. */
  contextState(): AudioContextState;
  /** Buffers handed to the analyzer that have not been answered yet; 0 for a host with none. */
  analyzing(): number;
  /**
   * The audio thread's average load over the last update interval, 0..1, or null when nothing is
   * measuring and when the browser cannot answer — a host without `renderCapacity` reports null
   * forever rather than a zero nobody measured (principle 5).
   */
  renderLoad(): number | null;
  /**
   * Start or stop measuring `renderLoad`, the way `measureFrameCost` gates the frame loop's own
   * number: nothing is measured while nothing is watching, and stopping clears the number rather
   * than leaving a stale one behind.
   */
  measureRenderLoad(enabled: boolean): void;
  /**
   * What the decode cache's held buffers weigh, in bytes. This is the number that matters:
   * AudioBuffers live outside the JS heap, so a heap counter reads flat while
   * `DECODE_CACHE_LIMIT` holds hundreds of megabytes of samples.
   */
  bufferBytes(): number;
  /**
   * The hand let go of a knob. Every move a plugin held back because it declared the parameter a
   * `rebuild` is applied now, at its last value and once — see src/audio/effects/rack.ts.
   */
  endGesture(): void;
  /** Build and validate a complete replacement graph without touching the live one. */
  prepareRestore(
    session: Session,
    blobs: ReadonlyMap<BlobId, Uint8Array<ArrayBuffer>>,
  ): Promise<PreparedRestore>;
};

export type PreparedRestore = {
  durations: Record<DeckId, number>;
  /**
   * Swap the already prepared graph in; construction and decoding happened before this point.
   * `restarting` names the decks the caller is about to play again on the far side of the swap:
   * tearing their voice down is the stop half of a restart, and a restart is reported to nobody
   * (0052). Every other voice stops for real and says so.
   */
  commit(restarting?: ReadonlySet<DeckId>): void;
  /**
   * Measure what the committed decks hold. Separate from `commit` because it writes the store,
   * and the decks it writes to exist only once the caller has replaced the session — a restore
   * may add decks the live one never held (0029).
   */
  measure(): void;
  /** Release a prepared graph when the repository transaction did not commit. */
  discard(): void;
};

/**
 * The browser engine's two levers for deterministic offline orchestration: the report barrier,
 * and the automation arming a live deck's wall-clock tick does for itself (src/audio/deck.ts).
 */
export type AudioEngine = Engine & {
  syncReports(): Promise<void>;
  armAutomation(): void;
};
