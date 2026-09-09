/**
 * @role What Together is at the transport: a yard standing on the session's shared ground reads
 *   the offset that ground is on at the instant its step begins, so two yards on it read the same
 *   part of their sources however unalike their patterns are — and a yard that is not on it walks
 *   the ground its own seed drew, untouched (0313).
 * @instead What the shared ground *is*, as maths → src/lib/sessionGround.test.ts. A yard's own
 *   ground and the clocks its period is counted on → src/lib/playerBed.test.ts. Everything else
 *   the player promises → src/audio/player.ts's own suite (0045).
 */
import { describe, expect, it } from "vitest";

import { partVoice, PLAYER_MIN_SLOT_SECS, type PlayerSpec } from "@/lib/player";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";
import { PLAYER_SCOPE_LANDINGS } from "@/lib/playerScope";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import {
  groundBedAt,
  GROUND_EVERY_MIN_SECS,
  groundTicksBy,
  type SessionGround,
} from "@/lib/sessionGround";
import type { GroundClock } from "./playerVoice";
import { createDeckVoice } from "./deck";
import { destination, fakeContext } from "./deckDouble";
import { emptyDeckPeek } from "./deckPeek";
import { oneSong } from "@/lib/playerSongs";

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
  bedWanders: true,
  bedReach: "nudge",
  bedWay: "either",
  bedTogether: false,
  zone: null,
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
  songs: [],
  cast: PLAYER_CAST_MAX,
};

/** A shared ground that moves at every arming and travels far enough to be unmistakable. */
const GROUND: SessionGround = {
  per: "second",
  leader: null,
  every: GROUND_EVERY_MIN_SECS,
  wanders: true,
  reach: "anywhere",
  way: "on",
};

/** One deck voice on a fake graph, jumping this fixture's loop on the ground it is handed. */
/** The clock a host with nothing leading the ground hands a voice: seconds, counted from zero. */
const wallClock = (ground: SessionGround): GroundClock => ({
  ticksBy: (at) => groundTicksBy(ground, at),
  crossed: null,
});

const jumping = (
  patch: Partial<PlayerSpec>,
  ground: SessionGround = GROUND,
  clock?: GroundClock,
) => {
  const host = deck();
  host.voice.setLoop(0, SPAN);
  host.voice.setGround(ground, clock ?? wallClock(ground));
  host.voice.setPlayer({ ...PLAYER, ...patch });
  host.voice.play();
  return host;
};

/**
 * What each of the first steps of a pass began at, and the ground it read there. **A step and its
 * own instant**, because that is what the transport actually asks the shared ground: the offset it
 * was on when this step began (0313). Off the peek and not off the walk, because the walk is what
 * Together overrides (0180).
 */
const read = (host: ReturnType<typeof deck>, count = 6): { at: number; bed: number | null }[] => {
  const out = emptyDeckPeek();
  const steps: { at: number; bed: number | null }[] = [];
  for (let step = 0; step < count; step++) {
    const started = host.sources[step]?.started[0];
    if (started === undefined) break;
    const at = started[0];
    host.now(at + PLAYER_MIN_SLOT_SECS / 2);
    host.voice.peek(out);
    steps.push({ at, bed: out.player.step?.bed ?? null });
  }
  return steps;
};

describe("a yard standing on the session's ground", () => {
  /**
   * The whole claim: a yard on the shared ground reads the offset that ground is on at the instant
   * its step begins, and nothing about the yard reaches that answer. Two unlike patterns, so what
   * is being compared is the ground and never the walk — they are together because they are two
   * readers of one clock, which is exactly how two yards land on one jump clock without either
   * knowing the other exists (0097, 0313).
   *
   * To the step and not to the sample: a landing reads the ground it opened on, so two yards whose
   * steps begin at different instants are together within one landing. The session's own jump
   * clock is what makes that exact, and it is a clock of its own (0097).
   */
  it("reads the shared ground at the instant each of its steps begins", () => {
    for (const patch of [{ seed: 3 }, { seed: 91, distance: 7, repeats: 2, burst: SLOT * 2 }]) {
      const steps = read(jumping({ ...patch, bedTogether: true }));
      expect(steps.length).toBeGreaterThan(2);
      for (const { at, bed } of steps)
        expect(bed).toBe(groundBedAt(GROUND, groundTicksBy(GROUND, at)));
      // And the ground it is reading is one that moves: with `bedEvery` at nought this yard's own
      // crawl never moves at all, so a run of one bed would be this case passing for the wrong
      // reason (P87).
      expect(new Set(steps.map(({ bed }) => bed)).size).toBeGreaterThan(1);
    }
  });

  /** And a yard that is not on it is untouched: its own ground is its own walk's, which with the
   *  period at nought is the bed a hand put it on and nothing else (0184, 0313). */
  it("leaves a yard walking its own ground exactly where it was", () => {
    const alone = jumping({ bedTogether: false, seed: 3, bed: 2 });
    expect(new Set(read(alone).map(({ bed }) => bed))).toEqual(new Set([2 * PLAYER_SLOTS]));
  });

  /**
   * And the other clock: a ground counted in a leader's parts moves when that yard's music does,
   * so the leader says as it arms a boundary and the host counts. Read here as the two halves the
   * voice actually has — it reports its own boundaries, and it reads whatever count it is handed —
   * because which yard is leading is the host's answer and never a voice's (0313).
   */
  it("reports its own part boundaries while it is the yard leading the ground", () => {
    const led: number[] = [];
    const ground: SessionGround = { ...GROUND, per: "part", leader: "a", every: 1 };
    /** The fields this case has no opinion about: named, played, two jumps long. */
    const held = { name: "P", skip: false, length: 2, steps: [], voice: partVoice(PLAYER) };
    const host = jumping(
      {
        bedTogether: true,
        seed: 3,
        songs: oneSong([
          { ...held, id: "one" },
          { ...held, id: "two" },
        ]),
      },
      ground,
      // The count every yard on this ground reads: one tick per boundary the leader reported.
      { ticksBy: (at) => led.filter((when) => when <= at).length, crossed: (at) => led.push(at) },
    );
    const steps = read(host);
    expect(steps.length).toBeGreaterThan(2);
    // One boundary per part and never per jump: the parts are two jumps long, so the leader speaks
    // at every other step and the ground it reads moves with it.
    expect(led.length).toBeGreaterThan(1);
    expect(led.length).toBeLessThan(steps.length);
    for (const { at, bed } of steps) {
      expect(bed).toBe(groundBedAt(ground, led.filter((when) => when <= at).length));
    }
  });

  /**
   * And a leader with nothing arranged reports one whole row of its own walk instead: a hand that
   * pointed the shared ground at a yard asked for a clock, and the row the scope draws is the
   * boundary such a yard has — 0192's fallback said for this ground (0313, principle 5).
   */
  it("reports a whole row of its walk while it leads with nothing arranged", () => {
    const led: number[] = [];
    const host = jumping(
      // At the shortest burst the transport has and one repeat, so a whole row of the walk fits
      // inside the horizon one arming lays down — the row is twenty-four jumps whatever they cost.
      { bedTogether: true, seed: 3, repeats: 1, burst: PLAYER_MIN_SLOT_SECS },
      { ...GROUND, per: "part", leader: "a", every: 1 },
      { ticksBy: (at) => led.filter((when) => when <= at).length, crossed: (at) => led.push(at) },
    );
    const steps = read(host, PLAYER_SCOPE_LANDINGS * 2 + 1);
    expect(steps.length).toBe(PLAYER_SCOPE_LANDINGS * 2 + 1);
    // One boundary a row and none before the first row is out: a row is the sheet turning over, so
    // the first row of a pass is the pattern beginning rather than a boundary it crossed.
    expect(led.slice(0, 2)).toEqual([
      steps[PLAYER_SCOPE_LANDINGS]?.at,
      steps[PLAYER_SCOPE_LANDINGS * 2]?.at,
    ]);
  });

  /** And a yard that is *not* leading says nothing at all, however its own song is arranged: the
   *  ground is counted on one yard's boundaries, or it would be counted twice (0313). */
  it("says nothing while another yard is the one leading", () => {
    const led: number[] = [];
    jumping(
      { bedTogether: true, seed: 3 },
      { ...GROUND, per: "part", leader: "b", every: 1 },
      { ticksBy: () => 0, crossed: null },
    );
    expect(led).toEqual([]);
  });

  /**
   * Moving the shared ground is heard where it is turned, by the road a moved number takes: the
   * steps past the lookahead are dropped and laid down again on the ground being held now (0096).
   */
  it("lays the tail down again when the shared ground moves", () => {
    const host = jumping({ bedTogether: true, seed: 3 });
    const before = read(host).map(({ bed }) => bed);
    const moved = { ...GROUND, way: "back" } as const;
    host.voice.setGround(moved, wallClock(moved));
    expect(read(host).map(({ bed }) => bed)).not.toEqual(before);
  });
});
