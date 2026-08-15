/**
 * @role The audio host wired to the log: it owns the context, the master bus and one voice per
 *   deck, and turns the graph's own reports into events. `audio` may not import `app`, so this
 *   is the inversion that lets `deck.looped` travel up from the worklet (docs/plan.md §1).
 * @instead What a command does to the session → src/app/execute.ts. This file is the graph's
 *   side of the seam and writes only the one field the graph knows: whether a deck is playing.
 *
 * `playing` is written here and nowhere else, because only the graph knows when it changes:
 * playback begins a lookahead after the command, and a one-shot source ends without anyone
 * asking it to. A probe taken in between honestly says the deck has not started yet.
 */
// The engine composes the graph's existing owners plus the session schema needed to prepare an
// atomic replacement; no imported tier is duplicated here. See 0007 and 0020.
// oxlint-disable import/max-dependencies, max-lines
import { createMasterBus } from "@/audio/context";
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
import { peaks, type Peaks } from "@/lib/peaks";
import type { BlobId, GenSource, SourceRef } from "@/lib/source";
import type { Session, SessionEffect } from "@/state/session";
import type { AutomationPoint } from "@/lib/automation";
import { deckIn, type DeckId, fromDecks, patchDeck, type SessionStore } from "@/state/store";
import type { Analyzer } from "./analysis";
import type { EventBody } from "./events";

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

const channelsOf = (buffer: AudioBuffer): Float32Array[] =>
  Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));

/**
 * What a surface needs to draw a source it does not own: the columns, and how long the decoded
 * audio actually is — the duration a clip's stored loop is drawn against, since a clip records a
 * loop and a source reference but never a length.
 */
export type SourceShape = { peaks: Peaks; duration: number };

const reduce = (buffer: AudioBuffer): DecodedSource => ({
  buffer,
  peaks: peaks(channelsOf(buffer), PEAK_COLUMNS),
});

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
  stop(deck: DeckId): void;
  /** Includes a source still waiting inside the transport lookahead. */
  planned(deck: DeckId): boolean;
  setLoop(deck: DeckId, inSecs: number, outSecs: number): { in: number; out: number } | null;
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
  /** The peaks computed at the deck's last load, or null before the first one. */
  peaks(deck: DeckId): Peaks | null;
  /** The owned context's clock: suspended until a gesture starts it, closed once it is gone. */
  contextState(): AudioContextState;
  /** Buffers handed to the analyzer that have not been answered yet; 0 for a host with none. */
  analyzing(): number;
  /** Build and validate a complete replacement graph without touching the live one. */
  prepareRestore(
    session: Session,
    blobs: ReadonlyMap<BlobId, Uint8Array<ArrayBuffer>>,
  ): Promise<PreparedRestore>;
};

export type PreparedRestore = {
  durations: Record<DeckId, number>;
  /** Swap the already prepared graph in; construction and decoding happened before this point. */
  commit(): void;
  /**
   * Measure what the committed decks hold. Separate from `commit` because it writes the store,
   * and the decks it writes to exist only once the caller has replaced the session — a restore
   * may add decks the live one never held (0029).
   */
  measure(): void;
  /** Release a prepared graph when the repository transaction did not commit. */
  discard(): void;
};

/** The browser engine's report barrier, used only by deterministic offline orchestration. */
export type AudioEngine = Engine & { syncReports(): Promise<void> };

/** One deck's voice, with its reports named as the events they are. The only mapping there is. */
function makeVoice(
  ctx: BaseAudioContext,
  master: AudioNode,
  deck: DeckId,
  store: SessionStore,
  emit: Emit,
): DeckVoice {
  const reporter = new AudioWorkletNode(ctx, LOOP_REPORTER);
  // It outputs silence; the connection exists only so the audio thread keeps pulling it.
  reporter.connect(ctx.destination);

  return createDeckVoice(ctx, master, reporter, {
    started: (at, offset) => {
      patchDeck(store, deck, { playing: true });
      emit({ t: "deck.started", deck, offset }, at);
    },
    looped: (at, cycle) => {
      emit({ t: "deck.looped", deck, cycle }, at);
    },
    stopped: (reason) => {
      patchDeck(store, deck, { playing: false });
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
  // One voice per deck the store already holds — a fresh session's single deck, or every deck a
  // caller staged before building the host. The deck commands keep this map in step (0029).
  let voices = new Map<DeckId, DeckVoice>(
    store.getState().deckIds.map((deck) => [deck, makeVoice(ctx, master, deck, store, emit)]),
  );
  // Overwritten wholesale on each load — the overwrite is the invalidation, so an entry can
  // never describe anything but the buffer the deck is holding. Never on the store: it is not
  // JSON, and a waveform redraw is not a session change (docs/plan.md §4).
  let loadedPeaks = new Map<DeckId, Peaks>();
  // The one decode cache this host has, keyed by blob id: a deck load, the replacement graph a
  // grouped edit or a clip pre-flight prepares, and a clip's thumbnail all draw from one entry,
  // so applying a clip decodes its source once rather than three times (0027, 0032).
  const decodes = createDecodeCache((bytes: ArrayBuffer) =>
    ctx.decodeAudioData(bytes).then(reduce),
  );

  const voice = (deck: DeckId): DeckVoice => {
    const found = voices.get(deck);
    if (found === undefined) throw new Error(`no voice for deck ${deck}`);
    return found;
  };

  const acceptBuffer = (deck: DeckId, decoded: DecodedSource): number => {
    // Peaks first, voice second: nothing can throw between the cache write and the buffer
    // swap, so the waveform can never describe a buffer the deck is not holding.
    loadedPeaks.set(deck, decoded.peaks);
    voice(deck).load(decoded.buffer);
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
      voices.set(deck, makeVoice(ctx, master, deck, store, emit));
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
      const decoded =
        "gen" in source
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
    },
    planned: (deck) => voice(deck).planned(),
    setLoop: (deck, inSecs, outSecs) => voice(deck).setLoop(inSecs, outSecs),
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
    peaks: (deck) => loadedPeaks.get(deck) ?? null,
    contextState: () => ctx.state,
    analyzing: () => analyzer?.inFlight() ?? 0,
    // Preparation is one transaction-like state machine: every constructed voice is either
    // committed together or released together. See 0007 and 0020.
    // oxlint-disable-next-line max-lines-per-function
    prepareRestore: async (session, blobs) => {
      const nextVoices = new Map<DeckId, DeckVoice>();
      const nextPeaks = new Map<DeckId, Peaks>();
      /** What the committed decks will be measured from — analysis is re-derived, never stored. */
      const nextChannels = new Map<DeckId, { channels: Float32Array[]; sampleRate: number }>();
      const durations = fromDecks(session.deckIds, () => 0);
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
        for (const deck of session.deckIds)
          nextVoices.set(deck, makeVoice(ctx, master, deck, store, emit));
        for (const deck of session.deckIds) {
          const source = deckIn(session.decks, deck).source;
          if (source === null) continue;
          let decoded: DecodedSource;
          if ("gen" in source) decoded = reduce(renderSourceBuffer(ctx, source));
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
        for (const deck of session.deckIds) {
          const prepared = preparedIn(deck);
          for (const param of DECK_PARAM_IDS)
            prepared.setParam(null, param, deckIn(session.decks, deck).params[param]);
        }
        for (const deck of session.deckIds) {
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
        for (const deck of session.deckIds) {
          const prepared = preparedIn(deck);
          const stored = deckIn(session.decks, deck);
          for (const param of DECK_AUTOMATION_PARAM_IDS) {
            const lane = stored.automation[param];
            if (lane !== undefined) prepared.setAutomation(null, param, lane, stored.params[param]);
          }
          for (const entry of stored.effects) armInstanceLanes(prepared, entry);
        }
        for (const deck of session.deckIds) {
          const loop = deckIn(session.decks, deck).loop;
          if (loop === null) continue;
          const applied = preparedIn(deck).setLoop(loop.in, loop.out);
          if (applied === null || applied.in !== loop.in || applied.out !== loop.out) {
            throw new RangeError(`session deck ${deck} loop is outside its decoded source`);
          }
        }
      } catch (error) {
        release();
        throw error;
      }
      return {
        durations,
        commit: () => {
          if (settled) throw new Error("prepared session is already settled");
          settled = true;
          // Every voice this host had is gone, so every request it was waiting on describes a
          // buffer nothing holds. Forgetting them here writes nothing to the store (0025).
          for (const deck of voices.keys()) analyzer?.forget(deck);
          for (const current of voices.values()) current.dispose();
          voices = nextVoices;
          loadedPeaks = nextPeaks;
        },
        measure: () => {
          // A restored deck is a freshly decoded buffer like any other, so it is measured like
          // any other; a deck restored to nothing was already forgotten by the commit (0025).
          for (const deck of session.deckIds) {
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
  };
}
