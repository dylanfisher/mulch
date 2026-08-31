/**
 * @role What a jumping deck reports to the surfaces that paint it: the position it is actually
 *   reading, and the very step the clock is inside — the part standing, the numbers under it and
 *   where that landing falls in the pass (0157, 0180). Read off the step the clock is in rather
 *   than off the walk, which is armed seconds ahead of it.
 * @instead Everything else the player promises — where it may read, that it draws its seed's own
 *   sequence, that every seam is a fade and that it arms ahead of the clock → src/audio/player.ts's
 *   own suite, which is at the hard cap and is why this file exists (0045). What one landing is at
 *   the transport → src/audio/playerLanding.test.ts.
 */
import { describe, expect, it } from "vitest";

import { partVoice, PLAYER_BURST_MIN, PLAYER_MIN_SLOT_SECS, type PlayerSpec } from "@/lib/player";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { playerSequence } from "@/lib/playerWalk";
import { createDeckVoice } from "./deck";
import { destination, fakeContext } from "./deckDouble";
import { emptyDeckPeek } from "./deckPeek";
import { oneAlbum } from "@/lib/playerAlbum";

/**
 * One deck voice on a fake graph. Built here rather than shared, for the reason
 * src/audio/deckDouble.ts gives: `createDeckVoice` has one production owner and only a test file
 * may stand in for it.
 */
function deck(graph = fakeContext()) {
  const { context, gainCalls, gainLogs, now, sources } = graph;
  let listener: ((event: MessageEvent<unknown>) => void) | null = null;
  /** Every plan the transport posted, in order — `null` for a stop (src/audio/deck.ts). */
  const plans: unknown[] = [];
  const reporter = {
    port: {
      addEventListener: (_type: string, next: (event: MessageEvent<unknown>) => void) => {
        listener = next;
      },
      removeEventListener: () => {},
      start: () => {},
      postMessage: (message: unknown) => plans.push(message),
      close: () => {},
    },
    disconnect: () => {},
  };
  const report = (message: unknown): void => {
    // oxlint-disable-next-line no-unsafe-type-assertion -- the handler reads only `data`
    listener?.({ data: message } as MessageEvent<unknown>);
  };
  /** Every stop the transport reported, with what it left held (0038). */
  const stops: { reason: string; held: number | null }[] = [];
  const voice = createDeckVoice(
    context,
    destination(),
    // oxlint-disable-next-line no-unsafe-type-assertion -- only the port and disconnect are used
    reporter as unknown as AudioWorkletNode,
    {
      started: () => {},
      looped: () => {},
      stopped: (reason, held) => {
        stops.push({ reason, held });
      },
      xrun: () => {},
    },
  );
  // oxlint-disable-next-line no-unsafe-type-assertion -- the fake never reads a buffer's samples
  voice.load({ duration: 4 } as AudioBuffer);
  return { gainCalls, gainLogs, now, voice, report, plans, sources, stops };
}

/** A loop the grid divides into 0.2s slots — well clear of the shortest one that can seam. */
const SPAN = 3.2;
const SLOT = SPAN / PLAYER_SLOTS;

/**
 * A plain pattern with nothing drawn under it, so the only thing moving either case below is the
 * song it is handed. Its own literal rather than the one src/audio/player.test.ts declares, the way
 * every test file in this instrument declares the spec it is asking about (principle 2).
 */
const PLAYER: PlayerSpec = {
  bypassed: false,
  bed: 0,
  bedPer: "jump",
  beds: [],
  bedEvery: 0,
  bedDistance: 2,
  bedBias: 0,
  bedHome: 0,
  seed: 7,
  bias: 0,
  stride: 0,
  home: 0,
  phrase: 0,
  phraseKeep: 4,
  phraseChance: 0,
  phraseReturn: 0,
  arrange: 0,
  arrangeKeep: 4,
  arrangeChance: 0,
  arrangeReturn: 0,
  arrangeAmount: 1,
  arrangeGrow: 0,
  arrangeSpan: 0,
  arrangeApart: 0,
  distance: 4,
  repeats: 4,
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
  ratchet: 0,
  gate: 0,
  drop: 0,
  reverse: 0,
  spark: 0,
  sparkLevel: 0.5,
  sparkDelay: 0,
  burst: SLOT,
  vary: 0,
  varyChance: 1,
  rest: 0,
  restPulses: 0,
  restSpan: 8,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  chance: 1,
  spread: 2,
  drift: 4,
  climb: 0,
  albums: [],
  cast: PLAYER_CAST_MAX,
};

/** One deck voice on a fake graph, already jumping this fixture's loop. */
const jumping = (patch: Partial<PlayerSpec> = {}) => {
  const host = deck();
  host.voice.setLoop(0, SPAN);
  host.voice.setPlayer({ ...PLAYER, ...patch });
  host.voice.play();
  return host;
};

/** When and where one of a jumping deck's steps actually started, off the source it built. */
const startOf = (host: ReturnType<typeof deck>, step: number): [number, number] =>
  host.sources[step]?.started[0] ?? [Number.NaN, Number.NaN];

describe("what a jumping deck reports", () => {
  it("paints the slot it is reading rather than the one the plan was posted with", () => {
    const host = jumping();
    const third = host.sources[2];
    if (third === undefined) throw new Error("the pattern armed fewer than three steps");
    host.now((third.started[0]?.[0] ?? 0) + SLOT / 2);
    const out = emptyDeckPeek();
    host.voice.peek(out);
    expect(out.position).toBeCloseTo((third.started[0]?.[1] ?? 0) + SLOT / 2, 6);
  });

  /**
   * What a song is doing, read the way a position is: off the step the clock is actually inside
   * rather than off the walk, which is armed seconds ahead of it. It is the whole of what the
   * card's header, its lit row and its dials paint from, and nothing about it is durable or ever
   * reaches React (0157, plan §2).
   */
  it("reports the part it is standing in, and the voice under it, across a boundary", () => {
    /** The fields this case has no opinion about: named, played, one jump long (P134). */
    const held = { name: "P", skip: false, length: 1, steps: [] };
    const song = [
      { ...held, id: "one", voice: { ...partVoice(PLAYER), burst: PLAYER_BURST_MIN * 4 } },
      { ...held, id: "two", voice: { ...partVoice(PLAYER), burst: SLOT * 2 } },
    ] as const;
    const host = jumping({ albums: oneAlbum(song) });
    const laid = playerSequence({ ...PLAYER, albums: oneAlbum(song) }, 2);
    const out = emptyDeckPeek();

    // Inside the first step, which is the first part's one jump.
    host.now(startOf(host, 0)[0] + PLAYER_MIN_SLOT_SECS / 2);
    host.voice.peek(out);
    expect(out.player.step?.part).toBe("one");
    expect(out.player.step?.voice).toEqual(laid[0]?.voice);
    expect(out.player.at).toBe(0);

    // And past the boundary, where the part standing is the next one and its numbers are its own.
    host.now(startOf(host, 1)[0] + PLAYER_MIN_SLOT_SECS / 2);
    host.voice.peek(out);
    expect(out.player.step?.part).toBe("two");
    expect(out.player.step?.voice).toEqual(laid[1]?.voice);
    expect(out.player.step?.voice).not.toEqual(laid[0]?.voice);
    expect(out.player.at).toBe(1);

    // A deck with no pass running stands in nothing at all, rather than holding the last part it
    // was in: this read is the transport's and it stops with it.
    host.voice.stop();
    host.voice.peek(out);
    expect(out.player).toEqual({ step: null, at: null, sparkPosition: null });
  });
});
