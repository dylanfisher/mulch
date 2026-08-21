/**
 * @role The audio host wired to the log: it owns the context, the master bus and one voice per
 *   deck, and turns the graph's own reports into events. `audio` may not import `app`, so this
 *   is the inversion that lets `deck.looped` travel up from the worklet (docs/plan.md §1).
 * @instead What a command does to the session → src/app/execute.ts. This file is the graph's
 *   side of the seam and writes only the one field the graph knows: whether a deck is playing.
 *
 * `playing` is written in this file and nowhere else, because only the graph knows when it
 * changes: playback begins a lookahead after the command, and a one-shot source ends without
 * anyone asking it to. A probe taken in between honestly says the deck has not started yet.
 * Becoming true is the graph's report; becoming false is either that report or the command that
 * halted the voice, because a halt is finished the moment it returns (0052).
 */
// The engine composes the graph's existing owners plus the session schema needed to prepare an
// atomic replacement; no imported tier is duplicated here. See 0007 and 0020.
// oxlint-disable import/max-dependencies, max-lines
import type { PlayerSpec } from "@/lib/player";
import { createMasterBus, type MasterPeek } from "@/audio/context";
import { createDecodeCache } from "@/audio/decodeCache";
import { createDeckVoice, type DeckPeek, type DeckVoice, LOOKAHEAD_SECS } from "@/audio/deck";
import type { EffectInstanceId } from "@/audio/effects/contract";
import type { EffectId } from "@/audio/effects/registry";
import {
  DECK_AUTOMATION_PARAM_IDS,
  DECK_PARAM_IDS,
  effectAutomationParamIds,
  paramIn,
  type AutomationParamId,
  type EffectParamValues,
  type ParamId,
} from "@/audio/params";
import { renderSourceBuffer } from "@/audio/sources";
import { LOOP_REPORTER } from "@/audio/worklet";
import { cropChannels } from "@/lib/channels";
import { peaks, type Peaks } from "@/lib/peaks";
import { encodeWav } from "@/lib/wav";
import type { AutomationPoint } from "@/lib/automation";
import { isGenSource, type BlobId, type GenSource, type SourceRef } from "@/lib/source";
import type { Session, SessionEffect } from "@/state/session";
import {
  deckIdsOf,
  deckIn,
  type DeckId,
  fromDecks,
  patchDeck,
  type SessionStore,
} from "@/state/store";
import type { Analyzer } from "./analysis";
import type { EventBody } from "./events";
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
  play(deck: DeckId): void;
  /** Starts every named deck at one sampled audio-clock time. */
  playTogether(decks: readonly DeckId[]): void;
  /** Stops and rewinds to the top of the loop — the deck's next play starts there (0038). */
  stop(deck: DeckId): void;
  /** Stops and holds the playhead, so the deck's next play carries on from there (0038). */
  pause(deck: DeckId): void;
  /** Moves the playhead: where the next play begins, or where a playing deck carries on (0041). */
  seek(deck: DeckId, position: number): void;
  /** Includes a source still waiting inside the transport lookahead. */
  planned(deck: DeckId): boolean;
  setLoop(deck: DeckId, inSecs: number, outSecs: number): { in: number; out: number } | null;
  /** Hold this deck's jump pattern, or drop it when `player` is null (0089). */
  setPlayer(deck: DeckId, player: PlayerSpec | null): void;
  setParam(deck: DeckId, instance: EffectInstanceId | null, param: ParamId, value: number): void;
  setAutomation(
    deck: DeckId,
    instance: EffectInstanceId | null,
    param: AutomationParamId,
    lane: readonly AutomationPoint[],
    base: number,
  ): void;
  addEffect(
    deck: DeckId,
    instance: EffectInstanceId,
    effect: EffectId,
    values: EffectParamValues,
  ): number;
  /** Rewire a held instance out of, or back into, the deck's signal path (0023). */
  setEffectBypass(deck: DeckId, instance: EffectInstanceId, bypassed: boolean): void;
  removeEffect(deck: DeckId, instance: EffectInstanceId): void;
  /** Rewire the rack into the given order, which must be its own instances rearranged. */
  reorderEffects(deck: DeckId, order: readonly EffectInstanceId[]): void;
  /** The per-frame read: writes the deck's playhead and meter into `out`. Never allocates. */
  peek(deck: DeckId, out: DeckPeek): void;
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

/** The commit default: a restore nobody is carrying a transport across restarts no deck. */
const EMPTY_RESTARTING: ReadonlySet<DeckId> = new Set();

/**
 * The browser engine's two levers for deterministic offline orchestration: the report barrier,
 * and the automation arming a live deck's wall-clock tick does for itself (src/audio/deck.ts).
 */
export type AudioEngine = Engine & {
  syncReports(): Promise<void>;
  armAutomation(): void;
};

export const channelsOf = (buffer: AudioBuffer): Float32Array[] =>
  Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));

const reduce = (buffer: AudioBuffer): DecodedSource => {
  // Audio with no frames is not audio. Accepting it writes flat peaks, hands a voice a buffer of
  // nothing and answers with a duration of zero — a deck half-loaded with silence and no error
  // anywhere. Refused here, where every decoded source is made, so a deck load, a restore's
  // prepared graph and a clip's thumbnail all fail loudly instead of half-landing (0072).
  if (buffer.length === 0) throw new RangeError("decoded audio has no frames");
  return { buffer, peaks: peaks(channelsOf(buffer), PEAK_COLUMNS) };
};

/** One deck's voice, with its reports named as the events they are. The only mapping there is. */
function makeVoice(
  ctx: BaseAudioContext,
  master: AudioNode,
  deck: DeckId,
  store: SessionStore,
  emit: Emit,
  /**
   * Whether this deck's transport is being rescheduled from a new position right now. A restart
   * tears the old source down and builds another, and the stop half of that pair is not a stop:
   * nothing was asked to end and the deck was never not playing (0052).
   */
  rescheduling: () => boolean,
): DeckVoice {
  const reporter = new AudioWorkletNode(ctx, LOOP_REPORTER);
  // It outputs silence; the connection exists only so the audio thread keeps pulling it.
  reporter.connect(ctx.destination);

  return createDeckVoice(ctx, master, reporter, {
    started: (at, offset) => {
      // Playing is the end of being held, whatever put it there: the position has been consumed.
      patchDeck(store, deck, { playing: true, paused: null });
      emit({ t: "deck.started", deck, offset }, at);
    },
    looped: (at, cycle) => {
      emit({ t: "deck.looped", deck, cycle }, at);
    },
    stopped: (reason, held) => {
      // Silent through a restart, on the store and on the log alike: the caller that asked for
      // the reschedule is the one that knows a start is already planned behind this stop, and
      // reporting it would make every surface debounce a `playing` that never really dipped.
      if (rescheduling()) return;
      patchDeck(store, deck, { playing: false, paused: held });
      emit({ t: "deck.stopped", deck, reason });
    },
    xrun: (detail) => {
      emit({ t: "xrun", detail: `deck ${deck}: ${detail}` });
    },
  });
}

/**
 * Every lane one prepared instance holds, armed against its own binding and its own manual value.
 * An instance's lanes are held beside its values and go with it, so there is nothing here that
 * could name a binding the rack does not have (0030).
 */
function armInstanceLanes(voice: DeckVoice, entry: SessionEffect): void {
  for (const param of effectAutomationParamIds(entry.effect)) {
    const lane = entry.automation[param];
    if (lane !== undefined)
      voice.setAutomation(entry.id, param, lane, paramIn(entry.params, param));
  }
}

/**
 * `AudioContext.renderCapacity` is in the Web Audio spec but not in lib.dom, and it is read in
 * exactly one place, so the narrowest shape that read needs is declared here rather than as a
 * global `.d.ts` claiming the whole API exists. A guard rather than an assertion: only the
 * `in` check decides, so no cast can outlive a browser that stops answering.
 */
type RenderCapacity = {
  addEventListener(type: "update", listener: (event: { averageLoad: number }) => void): void;
  start(options: { updateInterval: number }): void;
  stop(): void;
};

const hasRenderCapacity = (
  context: BaseAudioContext,
): context is BaseAudioContext & { renderCapacity: RenderCapacity } => "renderCapacity" in context;

/** How often the audio thread reports its load, in seconds. Twice a second is a debug readout. */
const RENDER_CAPACITY_INTERVAL_SECS = 0.5;

/**
 * `resume` is how this host starts its clock, or `null` for one that has none to start. The
 * unlock gate below is the same either way; what differs is who owns the context's suspension.
 * Live, a gesture does — so it is `ctx.resume`. Offline, the render driver suspends and resumes
 * on its own schedule to pump the queue (src/app/render.ts), and a second resumer would fight it.
 */
// Over the line cap by design: the host's whole surface is here, each member a few lines of
// delegation into the voice and peaks maps this one closure owns. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function createAudioEngine(
  ctx: BaseAudioContext,
  store: SessionStore,
  emit: Emit,
  resume: (() => Promise<void>) | null,
  /**
   * Where a committed buffer goes to be measured, or null for a host with no worker — the
   * offline render, and every pure test. Analysis never gates a load and never touches the
   * deck it describes; it is handed samples and produces data (0025).
   */
  analyzer: Analyzer | null = null,
): AudioEngine {
  const master = createMasterBus(ctx);
  /**
   * The deck whose transport is being rescheduled from a new position, for the length of the one
   * synchronous call that does it — never more than one at a time, because a restart's stop and
   * start both land inside that call (0052).
   */
  let rescheduling: DeckId | null = null;
  const newVoice = (deck: DeckId): DeckVoice =>
    makeVoice(ctx, master.input, deck, store, emit, () => rescheduling === deck);
  // One voice per deck the store already holds — a fresh session's single deck, or every deck a
  // caller staged before building the host. The deck commands keep this map in step (0029).
  let voices = new Map<DeckId, DeckVoice>(
    store.getState().deckList.map(({ id: deck }) => [deck, newVoice(deck)]),
  );
  // Overwritten wholesale on each load — the overwrite is the invalidation, so an entry can
  // never describe anything but the buffer the deck is holding. Never on the store: it is not
  // JSON, and a waveform redraw is not a session change (docs/plan.md §4).
  let loadedPeaks = new Map<DeckId, Peaks>();
  // The one decode cache this host has, keyed by blob id: a deck load, the replacement graph a
  // grouped edit or a clip pre-flight prepares, and a clip's thumbnail all draw from one entry,
  // so applying a clip decodes its source once rather than three times (0027, 0032).
  const decodes = createDecodeCache(
    (bytes: ArrayBuffer) => ctx.decodeAudioData(bytes).then(reduce),
    // 32-bit float per sample per channel, which is what an AudioBuffer holds.
    ({ buffer }) => buffer.length * buffer.numberOfChannels * 4,
  );
  /**
   * The audio thread's average load, measured only while the console is watching — the same rule
   * the frame loop's cost follows (src/ui/frame.ts). Null while nothing is measuring, and null
   * forever in a browser without `renderCapacity`. No disposal hook: this host has no teardown
   * and its context lives as long as the page does.
   */
  let renderLoad: number | null = null;
  let measuring = false;
  const capacity = hasRenderCapacity(ctx) ? ctx.renderCapacity : null;
  // Registered once rather than on each enable: the capacity only fires between start and stop,
  // and a listener added per enable would stack a handler per toggle of the console.
  capacity?.addEventListener("update", (event) => {
    // An update queued before `stop()` may still land after it; taking it would leave a number
    // behind that the next open shows as current for half a second.
    if (measuring) renderLoad = event.averageLoad;
  });

  const voice = (deck: DeckId): DeckVoice => {
    const found = voices.get(deck);
    if (found === undefined) throw new Error(`no voice for deck ${deck}`);
    return found;
  };

  /**
   * What a command that halts a voice knows the moment it returns. Only a *start* takes a
   * lookahead to become true, so a stop needs no report to be honest — and it cannot wait for
   * one: a transport still inside its lookahead has nothing to report, which is the window a
   * seek's restart leaves the deck reading as playing (0052).
   */
  const halted = (deck: DeckId): void => {
    patchDeck(store, deck, { playing: false });
  };

  const acceptBuffer = (deck: DeckId, decoded: DecodedSource): number => {
    // Audio with no frames is not audio. Accepting it would write flat peaks, hand the voice a
    // buffer of nothing and answer with a duration of zero — a deck half-loaded with silence and
    // no error anywhere. Refused before anything is written, so the deck keeps what it had (0072).
    if (decoded.buffer.length === 0) {
      throw new RangeError(`deck ${deck}: decoded audio has no frames`);
    }
    // Peaks first, voice second: nothing can throw between the cache write and the buffer
    // swap, so the waveform can never describe a buffer the deck is not holding.
    loadedPeaks.set(deck, decoded.peaks);
    voice(deck).load(decoded.buffer);
    // A load halts the voice, and a held position belonged to the buffer that is gone — the voice
    // forgets both, and this is the store's side of that one fact.
    patchDeck(store, deck, { playing: false, paused: null });
    // After the voice already has it: the measurement is about this buffer, and nothing waits
    // for the answer. Superseding a request for this deck is the analyzer's own business.
    analyzer?.request(deck, channelsOf(decoded.buffer), decoded.buffer.sampleRate);
    return decoded.buffer.duration;
  };

  /**
   * The unlock gate. A context built before the browser saw a gesture starts suspended, and its
   * clock — the clock every envelope is scheduled against — does not advance until it resumes.
   * Play is the gesture that matters, so it is the one place this is done: a separate "unlock"
   * command would be a second way to do something the transport already reaches (plan §5).
   */
  const unlock = (): void => {
    if (resume === null || ctx.state === "running") return;
    void resume().catch((error: unknown) => {
      emit({ t: "error", detail: `audio could not start: ${String(error)}` });
    });
  };

  return {
    addDeck: (deck) => {
      if (voices.has(deck)) throw new Error(`deck ${deck} already has a voice`);
      voices.set(deck, newVoice(deck));
    },
    removeDeck: (deck) => {
      // Dispose halts the transport, which reports the stop through the same callbacks — so this
      // runs while the store still holds the deck, and the executor drops the row afterwards.
      voice(deck).dispose();
      voices.delete(deck);
      loadedPeaks.delete(deck);
      // The measurement in flight is about a buffer nothing holds any more. Forgetting the
      // request id is what stops a late reply from being applied by identity (0025, 0029).
      analyzer?.forget(deck);
    },
    load: (deck, source) => acceptBuffer(deck, reduce(renderSourceBuffer(ctx, source))),
    loadBlob: async (deck, blobId, blob, current) => {
      const decoded = await decodes.get(blobId, async () => (await blob()).arrayBuffer());
      // A newer load may have arrived while the decode was off-thread. It owns the deck; never
      // let this stale buffer reach either the voice or its peaks cache.
      if (!current()) return null;
      return acceptBuffer(deck, decoded);
    },
    sourcePeaks: async (source, blob) => {
      const decoded = isGenSource(source)
        ? reduce(renderSourceBuffer(ctx, source))
        : await decodes.get(source.blobId, async () => (await blob()).arrayBuffer());
      return { peaks: decoded.peaks, duration: decoded.buffer.duration };
    },
    play: (deck) => {
      unlock();
      voice(deck).play();
    },
    playTogether: (decks) => {
      unlock();
      const at = ctx.currentTime + LOOKAHEAD_SECS;
      for (const deck of decks) voice(deck).play(at);
    },
    stop: (deck) => {
      voice(deck).stop();
      // The rewind is written here rather than reported: a voice that was already stopped sends
      // nothing back, and a deck held at a position has still just been sent to the top of its
      // loop. Same side of the seam — the graph is what knows the playhead has been forgotten.
      patchDeck(store, deck, { paused: null });
      halted(deck);
    },
    pause: (deck) => {
      voice(deck).pause();
      halted(deck);
    },
    seek: (deck, position) => {
      const voiced = voice(deck);
      // A playing deck restarts, and its own stop and start reports are what move `paused` —
      // the same silence `setLoop` keeps, and for the same reason: writing a held position over
      // a restart would read as a pause for the whole lookahead. A halted deck has no report to
      // make, so its moved playhead is written here, the way `stop`'s rewind is (0041).
      const restarting = voiced.planned();
      if (!restarting) {
        patchDeck(store, deck, { paused: voiced.seek(position) });
        return;
      }
      // The same knowledge held one line longer: the restart's own stop report is not a stop, so
      // it says nothing and `playing` never dips for the frame or two before the new source's
      // start report lands. Cleared in `finally` — a throw out of the voice must not leave this
      // deck's real stops silent forever (0052).
      rescheduling = deck;
      try {
        voiced.seek(position);
      } finally {
        rescheduling = null;
      }
    },
    planned: (deck) => voice(deck).planned(),
    setLoop: (deck, inSecs, outSecs) => voice(deck).setLoop(inSecs, outSecs),
    setPlayer: (deck, player) => {
      voice(deck).setPlayer(player);
    },
    setParam: (deck, instance, param, value) => {
      voice(deck).setParam(instance, param, value);
    },
    setAutomation: (deck, instance, param, lane, base) => {
      voice(deck).setAutomation(instance, param, lane, base);
    },
    addEffect: (deck, instance, effect, values) => voice(deck).addEffect(instance, effect, values),
    setEffectBypass: (deck, instance, bypassed) => {
      voice(deck).setEffectBypass(instance, bypassed);
    },
    removeEffect: (deck, instance) => {
      voice(deck).removeEffect(instance);
    },
    reorderEffects: (deck, order) => {
      voice(deck).reorderEffects(order);
    },
    peek: (deck, out) => {
      voice(deck).peek(out);
    },
    masterPeek: (out) => {
      master.peek(out);
    },
    cropped: (deck, inSecs, outSecs) => {
      const buffer = voice(deck).loaded();
      // The command checks the deck has a loop, and a loop is only ever set against a buffer.
      if (buffer === null) throw new Error(`deck ${deck} has nothing to crop`);
      const rate = buffer.sampleRate;
      return encodeWav(cropChannels(channelsOf(buffer), rate, inSecs, outSecs), rate);
    },
    peaks: (deck) => loadedPeaks.get(deck) ?? null,
    contextState: () => ctx.state,
    analyzing: () => analyzer?.inFlight() ?? 0,
    renderLoad: () => renderLoad,
    measureRenderLoad: (enabled) => {
      // Idempotent both ways: a second stop with nothing collecting, or a second start with a
      // collection already running, is a browser-level error nobody asked for.
      if (capacity === null || enabled === measuring) return;
      measuring = enabled;
      if (enabled) {
        capacity.start({ updateInterval: RENDER_CAPACITY_INTERVAL_SECS });
        return;
      }
      capacity.stop();
      // Cleared rather than left to go stale, the way measureFrameCost clears its own number.
      renderLoad = null;
    },
    bufferBytes: () => decodes.bytesHeld(),
    // Preparation is one transaction-like state machine: every constructed voice is either
    // committed together or released together. See 0007 and 0020.
    // oxlint-disable-next-line max-lines-per-function
    prepareRestore: async (session, blobs) => {
      const nextVoices = new Map<DeckId, DeckVoice>();
      const nextPeaks = new Map<DeckId, Peaks>();
      /** What the committed decks will be measured from — analysis is re-derived, never stored. */
      const nextChannels = new Map<DeckId, { channels: Float32Array[]; sampleRate: number }>();
      const durations = fromDecks(deckIdsOf(session.deckList), () => 0);
      let settled = false;
      /** Every pass below reads the voice it just built; a gap here is a bug, not a state. */
      const preparedIn = (deck: DeckId): DeckVoice => {
        const prepared = nextVoices.get(deck);
        if (prepared === undefined) throw new Error(`no prepared voice for deck ${deck}`);
        return prepared;
      };
      const release = (): void => {
        for (const prepared of nextVoices.values()) prepared.dispose();
        nextVoices.clear();
        nextPeaks.clear();
        nextChannels.clear();
      };
      try {
        for (const { id: deck } of session.deckList) nextVoices.set(deck, newVoice(deck));
        for (const { id: deck } of session.deckList) {
          const source = deckIn(session.decks, deck).source;
          if (source === null) continue;
          let decoded: DecodedSource;
          if (isGenSource(source)) decoded = reduce(renderSourceBuffer(ctx, source));
          else {
            const blobId = source.blobId;
            const bytes = blobs.get(blobId);
            if (bytes === undefined) throw new Error(`missing blob: ${blobId}`);
            // Through the cache, so a rebuild of a session whose sources are already decoded —
            // every grouped edit's rollback, and every clip pre-flight — pays for none of them
            // again. Decoding is serial inside the cache too, which is what limits peak memory
            // while both the live and prepared graphs hold their audio.
            // oxlint-disable-next-line no-await-in-loop
            decoded = await decodes.get(blobId, () => Promise.resolve(bytes.slice().buffer));
          }
          const buffer = decoded.buffer;
          const channels = channelsOf(buffer);
          nextPeaks.set(deck, decoded.peaks);
          nextChannels.set(deck, { channels, sampleRate: buffer.sampleRate });
          const prepared = preparedIn(deck);
          prepared.load(buffer);
          durations[deck] = buffer.duration;
        }
        for (const { id: deck } of session.deckList) {
          const prepared = preparedIn(deck);
          for (const param of DECK_PARAM_IDS)
            prepared.setParam(null, param, deckIn(session.decks, deck).params[param]);
        }
        for (const { id: deck } of session.deckList) {
          const prepared = preparedIn(deck);
          const stored = deckIn(session.decks, deck);
          for (const entry of stored.effects) {
            // Each instance carries its own values, so a rack of two delays builds two different
            // delays rather than one value shared by both (0030).
            prepared.addEffect(entry.id, entry.effect, entry.params);
          }
          // After addition, for the same reason restoration orders its commands that way: a
          // bypass names an instance the rack has to be holding already (0023).
          for (const entry of stored.effects) {
            if (entry.bypassed) prepared.setEffectBypass(entry.id, true);
          }
        }
        for (const { id: deck } of session.deckList) {
          const prepared = preparedIn(deck);
          const stored = deckIn(session.decks, deck);
          for (const param of DECK_AUTOMATION_PARAM_IDS) {
            const lane = stored.automation[param];
            if (lane !== undefined) prepared.setAutomation(null, param, lane, stored.params[param]);
          }
          for (const entry of stored.effects) armInstanceLanes(prepared, entry);
        }
        for (const { id: deck } of session.deckList) {
          const loop = deckIn(session.decks, deck).loop;
          if (loop === null) continue;
          const applied = preparedIn(deck).setLoop(loop.in, loop.out);
          if (applied === null || applied.in !== loop.in || applied.out !== loop.out) {
            throw new RangeError(`session deck ${deck} loop is outside its decoded source`);
          }
        }
        // After the loop, the same way the command-side stage list orders them: the grid a
        // pattern jumps around is the loop's, so a player set before one has nothing to run on
        // (0089, src/app/restore.ts).
        for (const { id: deck } of session.deckList) {
          const player = deckIn(session.decks, deck).player;
          if (player !== null) preparedIn(deck).setPlayer(player);
        }
      } catch (error) {
        release();
        throw error;
      }
      return {
        durations,
        commit: (restarting = EMPTY_RESTARTING) => {
          if (settled) throw new Error("prepared session is already settled");
          settled = true;
          // Every voice this host had is gone, so every request it was waiting on describes a
          // buffer nothing holds. Forgetting them here writes nothing to the store (0025).
          for (const deck of voices.keys()) analyzer?.forget(deck);
          try {
            for (const [deck, current] of voices) {
              // The same marker a seek's restart sets, for the same reason and over the same one
              // synchronous call: a voice torn down under a deck the caller is about to play
              // again reports neither `playing: false` nor a `deck.stopped` (0052).
              rescheduling = restarting.has(deck) ? deck : null;
              current.dispose();
            }
          } finally {
            // Cleared however the loop ends — a throw out of one dispose must not leave that
            // deck's real stops silent for the life of the host, the way `seek` guards its own.
            rescheduling = null;
          }
          voices = nextVoices;
          loadedPeaks = nextPeaks;
        },
        measure: () => {
          // A restored deck is a freshly decoded buffer like any other, so it is measured like
          // any other; a deck restored to nothing was already forgotten by the commit (0025).
          for (const { id: deck } of session.deckList) {
            const measured = nextChannels.get(deck);
            if (measured !== undefined)
              analyzer?.request(deck, measured.channels, measured.sampleRate);
          }
          nextChannels.clear();
        },
        discard: () => {
          if (settled) return;
          settled = true;
          release();
        },
      };
    },
    syncReports: async () => {
      await Promise.all([...voices.values()].map((deck) => deck.syncReports()));
    },
    endGesture: () => {
      for (const deck of voices.values()) deck.endGesture();
    },
    armAutomation: () => {
      for (const deck of voices.values()) deck.armAutomation();
    },
  };
}
