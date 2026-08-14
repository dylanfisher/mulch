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
import { createMasterBus } from "@/audio/context";
import { createDeckVoice, type DeckVoice } from "@/audio/deck";
import type { ParamId } from "@/audio/params";
import { renderSourceBuffer } from "@/audio/sources";
import { LOOP_REPORTER } from "@/audio/worklet";
import type { GenSource } from "@/lib/source";
import { DECK_IDS, type DeckId, patchDeck, type SessionStore } from "@/state/store";
import type { EventBody } from "./events";

/** How an event reaches the bus. `at` overrides the clock stamp when the audio thread knows better. */
export type Emit = (body: EventBody, at?: number) => void;

export type Engine = {
  /** Renders the source and hands it to the deck. Returns its duration in seconds. */
  load(deck: DeckId, source: GenSource): number;
  play(deck: DeckId): void;
  stop(deck: DeckId): void;
  setLoop(deck: DeckId, inSecs: number, outSecs: number): { in: number; out: number } | null;
  setParam(deck: DeckId, param: ParamId, value: number): void;
};

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
export function createAudioEngine(
  ctx: BaseAudioContext,
  store: SessionStore,
  emit: Emit,
  resume: (() => Promise<void>) | null,
): Engine {
  const master = createMasterBus(ctx);
  const voices = new Map<DeckId, DeckVoice>(
    DECK_IDS.map((deck) => [deck, makeVoice(ctx, master, deck, store, emit)]),
  );

  const voice = (deck: DeckId): DeckVoice => {
    const found = voices.get(deck);
    if (found === undefined) throw new Error(`no voice for deck ${deck}`);
    return found;
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
      voice(deck).load(buffer);
      return buffer.duration;
    },
    play: (deck) => {
      unlock();
      voice(deck).play();
    },
    stop: (deck) => {
      voice(deck).stop();
    },
    setLoop: (deck, inSecs, outSecs) => voice(deck).setLoop(inSecs, outSecs),
    setParam: (deck, param, value) => {
      voice(deck).setParam(param, value);
    },
  };
}
