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
// oxlint-disable import/max-dependencies
import { createMasterBus } from "@/audio/context";
import { createDeckVoice, type DeckPeek, type DeckVoice, LOOKAHEAD_SECS } from "@/audio/deck";
import type { EffectId } from "@/audio/effects/registry";
import { PARAM_IDS, type ParamId } from "@/audio/params";
import { renderSourceBuffer } from "@/audio/sources";
import { LOOP_REPORTER } from "@/audio/worklet";
import { peaks, type Peaks } from "@/lib/peaks";
import type { BlobId, GenSource } from "@/lib/source";
import type { SessionV2 } from "@/state/session";
import { DECK_IDS, type DeckId, fromDecks, patchDeck, type SessionStore } from "@/state/store";
import type { EventBody } from "./events";

/** How an event reaches the bus. `at` overrides the clock stamp when the audio thread knows better. */
export type Emit = (body: EventBody, at?: number) => void;

/**
 * The resolution peaks are computed at — fixed, and deliberately decoupled from any canvas
 * width, so "once per load" stays literally true: a resize resamples these columns, it never
 * recomputes them (docs/plan.md §4).
 */
export const PEAK_COLUMNS = 2048;

export type Engine = {
  /** Renders the source and hands it to the deck. Returns its duration in seconds. */
  load(deck: DeckId, source: GenSource): number;
  /** Decodes unchanged imported bytes through this engine's owning context. */
  loadBlob(deck: DeckId, blob: Blob, current: () => boolean): Promise<number | null>;
  play(deck: DeckId): void;
  /** Starts every named deck at one sampled audio-clock time. */
  playTogether(decks: readonly DeckId[]): void;
  stop(deck: DeckId): void;
  /** Includes a source still waiting inside the transport lookahead. */
  planned(deck: DeckId): boolean;
  setLoop(deck: DeckId, inSecs: number, outSecs: number): { in: number; out: number } | null;
  setParam(deck: DeckId, param: ParamId, value: number): void;
  addEffect(deck: DeckId, effect: EffectId, values: Readonly<Record<ParamId, number>>): number;
  /** The per-frame read: writes the deck's playhead and meter into `out`. Never allocates. */
  peek(deck: DeckId, out: DeckPeek): void;
  /** The peaks computed at the deck's last load, or null before the first one. */
  peaks(deck: DeckId): Peaks | null;
  /** Build and validate a complete replacement graph without touching the live one. */
  prepareRestore(
    session: SessionV2,
    blobs: ReadonlyMap<BlobId, Uint8Array<ArrayBuffer>>,
  ): Promise<PreparedRestore>;
};

export type PreparedRestore = {
  durations: Record<DeckId, number>;
  /** Swap the already prepared graph in; construction and decoding happened before this point. */
  commit(): void;
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
): AudioEngine {
  const master = createMasterBus(ctx);
  let voices = new Map<DeckId, DeckVoice>(
    DECK_IDS.map((deck) => [deck, makeVoice(ctx, master, deck, store, emit)]),
  );
  // Overwritten wholesale on each load — the overwrite is the invalidation, so an entry can
  // never describe anything but the buffer the deck is holding. Never on the store: it is not
  // JSON, and a waveform redraw is not a session change (docs/plan.md §4).
  let loadedPeaks = new Map<DeckId, Peaks>();

  const voice = (deck: DeckId): DeckVoice => {
    const found = voices.get(deck);
    if (found === undefined) throw new Error(`no voice for deck ${deck}`);
    return found;
  };

  const acceptBuffer = (deck: DeckId, buffer: AudioBuffer): number => {
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) =>
      buffer.getChannelData(channel),
    );
    // Peaks first, voice second: nothing can throw between the cache write and the buffer
    // swap, so the waveform can never describe a buffer the deck is not holding.
    loadedPeaks.set(deck, peaks(channels, PEAK_COLUMNS));
    voice(deck).load(buffer);
    return buffer.duration;
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
    load: (deck, source) => {
      const buffer = renderSourceBuffer(ctx, source);
      return acceptBuffer(deck, buffer);
    },
    loadBlob: async (deck, blob, current) => {
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      // A newer load may have arrived while decodeAudioData was off-thread. It owns the deck;
      // never let this stale buffer reach either the voice or its peaks cache.
      if (!current()) return null;
      return acceptBuffer(deck, buffer);
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
    setParam: (deck, param, value) => {
      voice(deck).setParam(param, value);
    },
    addEffect: (deck, effect, values) => voice(deck).addEffect(effect, values),
    peek: (deck, out) => {
      voice(deck).peek(out);
    },
    peaks: (deck) => loadedPeaks.get(deck) ?? null,
    // Preparation is one transaction-like state machine: every constructed voice is either
    // committed together or released together. See 0007 and 0020.
    // oxlint-disable-next-line max-lines-per-function
    prepareRestore: async (session, blobs) => {
      const nextVoices = new Map<DeckId, DeckVoice>();
      const nextPeaks = new Map<DeckId, Peaks>();
      const durations = fromDecks(DECK_IDS, () => 0);
      let settled = false;
      const release = (): void => {
        for (const prepared of nextVoices.values()) prepared.dispose();
        nextVoices.clear();
        nextPeaks.clear();
      };
      try {
        for (const deck of DECK_IDS)
          nextVoices.set(deck, makeVoice(ctx, master, deck, store, emit));
        for (const deck of DECK_IDS) {
          const source = session.decks[deck].source;
          if (source === null) continue;
          let buffer: AudioBuffer;
          if ("gen" in source) buffer = renderSourceBuffer(ctx, source);
          else {
            const bytes = blobs.get(source.blobId);
            if (bytes === undefined) throw new Error(`missing blob: ${source.blobId}`);
            // Decoding is deliberately serial: it limits peak memory while both the live and
            // prepared graphs hold their audio. No live state is exposed during preparation.
            // oxlint-disable-next-line no-await-in-loop
            buffer = await ctx.decodeAudioData(bytes.slice().buffer);
          }
          const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) =>
            buffer.getChannelData(channel),
          );
          nextPeaks.set(deck, peaks(channels, PEAK_COLUMNS));
          const prepared = nextVoices.get(deck);
          if (prepared === undefined) throw new Error(`no prepared voice for deck ${deck}`);
          prepared.load(buffer);
          durations[deck] = buffer.duration;
        }
        for (const deck of DECK_IDS) {
          const prepared = nextVoices.get(deck);
          if (prepared === undefined) throw new Error(`no prepared voice for deck ${deck}`);
          for (const param of PARAM_IDS)
            prepared.setParam(param, session.decks[deck].params[param]);
        }
        for (const deck of DECK_IDS) {
          const prepared = nextVoices.get(deck);
          if (prepared === undefined) throw new Error(`no prepared voice for deck ${deck}`);
          for (const effect of session.decks[deck].effects) {
            prepared.addEffect(effect, session.decks[deck].params);
          }
        }
        for (const deck of DECK_IDS) {
          const loop = session.decks[deck].loop;
          if (loop === null) continue;
          const prepared = nextVoices.get(deck);
          if (prepared === undefined) throw new Error(`no prepared voice for deck ${deck}`);
          const applied = prepared.setLoop(loop.in, loop.out);
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
          for (const current of voices.values()) current.dispose();
          voices = nextVoices;
          loadedPeaks = nextPeaks;
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
