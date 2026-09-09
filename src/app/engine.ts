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
import { playerSounding } from "@/lib/player";
import { groundIsLed, groundTicksBy, type SessionGround } from "@/lib/sessionGround";
import type { GroundClock } from "@/audio/playerVoice";
import { createMasterBus } from "@/audio/context";
import { createDecodeCache } from "@/audio/decodeCache";
import { createDeckVoice, type DeckVoice } from "@/audio/deck";
import type { EffectInstanceId } from "@/audio/effects/contract";
import {
  DECK_AUTOMATION_PARAM_IDS,
  DECK_PARAM_IDS,
  effectAutomationParamIds,
  paramIn,
} from "@/audio/params";
import { renderSourceBuffer } from "@/audio/sources";
import { LOOP_REPORTER } from "@/audio/worklet";
import { cropChannels } from "@/lib/channels";
import { peaks, type Peaks } from "@/lib/peaks";
import { encodeWav } from "@/lib/wav";
import { isGenSource } from "@/lib/source";
import { effectSnapshot, type SessionEffect } from "@/state/session";
import {
  deckIdsOf,
  deckIn,
  type DeckId,
  fromDecks,
  MASTER_HOLDS_NO_PARAMS,
  patchDeck,
  type RackId,
  type SessionStore,
} from "@/state/store";
import type { MasterEffects } from "@/audio/masterEffects";
import { PEAK_COLUMNS, type AudioEngine, type DecodedSource, type Emit } from "./audioEngine";
import type { Analyzer } from "./analysis";
// oxlint-enable import/max-dependencies

// Re-exported because this file used to declare them and every caller reaches them through it:
// the contract moved out for the hard cap's sake, and its home is src/app/audioEngine.ts.
export type { AudioEngine, DecodedSource, Emit, Engine, SourceShape } from "./audioEngine";
export { PEAK_COLUMNS } from "./audioEngine";

/** The commit default: a restore nobody is carrying a transport across restarts no deck. */
const EMPTY_RESTARTING: ReadonlySet<DeckId> = new Set();

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
 * Whether two racks are the same rack, through the one durable projection: a rack state has
 * exactly one JSON, which is what history's own comparison rests on (0021).
 */
const sameRack = (held: readonly SessionEffect[], wanted: readonly SessionEffect[]): boolean =>
  JSON.stringify(held.map((entry) => effectSnapshot(entry))) ===
  JSON.stringify(wanted.map((entry) => effectSnapshot(entry)));

/**
 * The master rack emptied and rebuilt to be exactly what a restored session holds, in the order
 * restoration already uses: the instances, their windows, their bypass, then their lanes — each
 * naming an instance the rack must already hold (0023, 0027, 0030, 0208).
 *
 * **Nothing happens where the rack is already that rack**, which is most restores: a checkpoint is
 * the whole session, so an undo of a knob on one yard would otherwise tear down and rebuild every
 * master instance's nodes — cutting a master reverb's tail on an edit that was nothing to do with
 * it. A voice does not have this problem because it is prepared beside the live one and crossfaded;
 * there is one master bus, so the comparison is what stands in for that (0321).
 */
// Exported because the one caller is inside `prepareRestore`'s commit, which needs a real
// AudioContext to reach — and what is worth pinning is the comparison above, not the context.
export function restoreMaster(
  master: MasterEffects,
  held: readonly SessionEffect[],
  effects: readonly SessionEffect[],
): void {
  if (sameRack(held, effects)) return;
  for (const instance of master.held()) master.removeEffect(instance);
  for (const entry of effects) {
    master.addEffect(entry.id, entry.effect, entry.params);
    master.setEffectBounds(entry.id, entry.bounds);
  }
  for (const entry of effects) if (entry.bypassed) master.setEffectBypass(entry.id, true);
  for (const entry of effects) armInstanceLanes(master, entry);
}

/**
 * The instance a call on the master names. The master rack holds no parameter of its own, so a
 * value or a lane arriving there without one is a caller that skipped the reducer's guard — loud
 * rather than silently written onto nothing (principle 5, 0321).
 */
function onMaster(instance: EffectInstanceId | null, at: string): EffectInstanceId {
  if (instance === null) throw new TypeError(`${at}: ${MASTER_HOLDS_NO_PARAMS}`);
  return instance;
}

/**
 * The rewires a rack takes wherever it stands: exactly what a yard's voice and the master rack
 * both answer, so one address resolves to one of them and nothing below has to ask which (0320).
 */
type RackHost = Pick<
  DeckVoice,
  "setEffectBypass" | "setEffectBounds" | "dismissGrown" | "removeEffect" | "reorderEffects"
>;

/**
 * Every lane one prepared instance holds, armed against its own binding and its own manual value.
 * An instance's lanes are held beside its values and go with it, so there is nothing here that
 * could name a binding the rack does not have (0030).
 */
function armInstanceLanes(voice: Pick<DeckVoice, "setAutomation">, entry: SessionEffect): void {
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
  /**
   * The session's shared jump clock, held here because it belongs to more than one deck and a
   * voice reaches nothing above itself: this host hands the same number to every voice it has and
   * to every voice it builds after it, which is the whole of what makes it one clock (0097).
   */
  let sync: number | null = null;
  /** And the shared ground beside it, held and handed on for exactly the same reason (0313). */
  let ground: SessionGround = store.getState().ground;
  /**
   * The instants a **led** ground has actually moved at, in the order they fell, and how many of
   * the leader's boundaries have gone by since the last of them. Live and not durable, and the
   * host's rather than any voice's: it is counted off one yard's arming and read by every yard
   * standing on the ground, which is precisely the fact no voice can hold (0089, 0313).
   *
   * Emptied whenever the ground itself changes, because the period, the clock and the yard leading
   * it are all inside the count: a ground moved to a new leader is a new count and never that
   * leader's boundaries laid over the last one's.
   */
  let ticks: number[] = [];
  let crossed = 0;
  /** How many times a led ground had moved by `at` — the ticks at or before it, which is a walk
   *  from the end because a follower asks about the instant it is arming and that is the newest. */
  const ledTicksBy = (at: number): number => {
    let count = ticks.length;
    while (count > 0 && (ticks[count - 1] ?? 0) > at) count--;
    return count;
  };
  /**
   * What one voice is handed about the shared ground: the count at an instant, and the way to say
   * a boundary was armed — the second of which is null for every yard but the one leading it, so a
   * voice never has to know its own name (0313).
   */
  const groundClock = (deck: DeckId): GroundClock => ({
    ticksBy: (at) => (groundIsLed(ground) ? ledTicksBy(at) : groundTicksBy(ground, at)),
    crossed:
      groundIsLed(ground) && ground.leader === deck
        ? (at) => {
            crossed++;
            if (crossed < ground.every) return;
            crossed = 0;
            ticks.push(at);
          }
        : null,
  });
  const newVoice = (deck: DeckId): DeckVoice => {
    const voice = makeVoice(ctx, master.input, deck, store, emit, () => rescheduling === deck);
    voice.setSync(sync);
    voice.setGround(ground, groundClock(deck));
    return voice;
  };
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
   * The rack one address names: a yard's voice, or the master's own — the one narrowing every
   * rack call goes through, so no reader below has to ask which it is holding (0320).
   */
  const rackAt = (deck: RackId): RackHost => (deck === null ? master.effects : voice(deck));

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
    soloPlayer: (deck, part) => voice(deck).soloPlayer(part),
    armPlayer: (deck, part) => voice(deck).armPlayer(part),
    setSync: (next) => {
      sync = next;
      for (const held of voices.values()) held.setSync(next);
      // And the rack that is no yard's, for the reason a voice gets it: the clock is the
      // session's, and an instance in the master rack paces itself by it like any other (0097).
      master.effects.setSync(next);
    },
    setGround: (next) => {
      ground = next;
      // The count starts again with the ground: its period, its clock and the yard leading it are
      // all inside it, so a changed ground is a new count rather than the old one carried on.
      ticks = [];
      crossed = 0;
      for (const [deck, held] of voices) held.setGround(next, groundClock(deck));
    },
    setParam: (deck, instance, param, value) => {
      if (deck === null) {
        master.effects.setParam(onMaster(instance, "setParam"), param, value);
        return;
      }
      voice(deck).setParam(instance, param, value);
    },
    setAutomation: (deck, instance, param, lane, base) => {
      if (deck === null) {
        master.effects.setAutomation(onMaster(instance, "setAutomation"), param, lane, base);
        return;
      }
      voice(deck).setAutomation(instance, param, lane, base);
    },
    addEffect: (deck, instance, effect, values) =>
      deck === null
        ? master.effects.addEffect(instance, effect, values)
        : voice(deck).addEffect(instance, effect, values),
    setEffectBypass: (deck, instance, bypassed) => {
      rackAt(deck).setEffectBypass(instance, bypassed);
    },
    setEffectBounds: (deck, instance, bounds) => {
      rackAt(deck).setEffectBounds(instance, bounds);
    },
    dismissGrown: (deck, instance, place) => rackAt(deck).dismissGrown(instance, place),
    removeEffect: (deck, instance) => {
      rackAt(deck).removeEffect(instance);
    },
    reorderEffects: (deck, order) => {
      rackAt(deck).reorderEffects(order);
    },
    peek: (deck, out) => {
      if (deck === null) master.effects.peek(out);
      else voice(deck).peek(out);
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
            // Beside the values, and for the same reason: what an instance's run may draw is that
            // instance's own durable state (0208).
            prepared.setEffectBounds(entry.id, entry.bounds);
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
          // Through the one reader of the switch, the way the command that sets a pattern is: a
          // yard stored with its module off holds its whole spec and must come back silent, not
          // jumping (P164, src/lib/player.ts).
          const player = playerSounding(deckIn(session.decks, deck).player);
          if (player !== null) preparedIn(deck).setPlayer(player);
        }
        // The clock the whole session jumps on, handed to every prepared voice: it is one fact
        // above the decks rather than one of theirs, and a graph rebuilt without it would leave
        // an undone or imported session's yards free-running (0097).
        for (const { id: deck } of session.deckList) preparedIn(deck).setSync(session.sync);
        // And the ground beside it, for the reason above: a graph rebuilt without it would leave
        // an undone or imported session's yards standing on the ground this host last held (0313).
        for (const { id: deck } of session.deckList)
          preparedIn(deck).setGround(session.ground, groundClock(deck));
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
          // And the rack that is no yard's, rebuilt in place. There is one master bus and
          // therefore one master rack, so it cannot be prepared beside the live one the way a
          // voice is — the chain boundary allows exactly one signal path (docs/boundaries.md).
          restoreMaster(master.effects, store.getState().master.effects, session.master.effects);
          master.effects.setSync(session.sync);
          // The restored session's clock is this host's from here: a voice added after the swap
          // reads it, and nothing else remembers what the replaced session was jumping on.
          sync = session.sync;
          ground = session.ground;
          ticks = [];
          crossed = 0;
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
      master.effects.endGesture();
    },
    armAutomation: () => {
      for (const deck of voices.values()) deck.armAutomation();
      // And the rack that is no yard's, on the same tick: its lanes and its runs are laid across
      // the same horizon, which is what makes an offline render the performance the live path
      // would have given (0071, 0321).
      master.effects.armAutomation();
    },
  };
}
