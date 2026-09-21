/**
 * @role What a lull asks for, proved to be a function of its seed and its horizon and nothing
 *   else — the claim an offline render of the same rests rests on (0204, 0371).
 */
import { describe, expect, it } from "vitest";
import {
  beatLength,
  createLull,
  LULL_LENGTH_MAX,
  LULL_LENGTH_MIN,
  type HoldEdge,
  type LullSpec,
} from "./lull.ts";
import { mulberry32 } from "./random.ts";

/** A term from a number or a reader: a number is the same at every instant. */
const term = (value: number | ((at: number) => number)): ((at: number) => number) =>
  typeof value === "number" ? () => value : value;

/** A spec from numbers or from readers. */
const spec = (over: Partial<{ [K in keyof LullSpec]: number | LullSpec[K] }> = {}): LullSpec => ({
  chance: term(over.chance ?? 1),
  rest: term(over.rest ?? 2),
  check: term(over.check ?? 2),
  loose: term(over.loose ?? 0),
});

/** Every edge up to `until`, pumped at `step` seconds a time, as one list. */
function pumped(cursor: ReturnType<typeof createLull>, until: number, step: number): HoldEdge[] {
  const all: HoldEdge[] = [];
  const out: HoldEdge[] = [];
  for (let horizon = step; horizon <= until + 1e-9; horizon += step) {
    const n = cursor.edges(horizon, out);
    all.push(...out.slice(0, n));
  }
  return all;
}

/** The next edge's instant, from a cursor that has one. */
function nextOf(cursor: ReturnType<typeof createLull>): number {
  const next = cursor.nextAt();
  if (next === null) throw new Error("the cursor lays nothing");
  return next;
}

/** An edge's instant: a cursor lays holds and releases and never a clear, which is the plugin's. */
const instantOf = (edge: HoldEdge): number => {
  if (edge.t === "clear") throw new Error("a cursor never clears");
  return edge.at;
};

// The cursor's whole contract in one block: the same list at two cadences, the roll, the check, the
// reset — each case is a few lines and the block is their count. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("a lull's edges", () => {
  it("are the same list whether the horizon comes in eights or in halves", () => {
    const even = spec({ chance: () => 0.5 });
    const coarse = pumped(createLull(even, mulberry32(7), 0, null), 120, 8);
    const fine = pumped(createLull(even, mulberry32(7), 0, null), 120, 0.5);
    expect(coarse.length).toBeGreaterThan(10);
    expect(fine).toEqual(coarse);
  });

  it("rest every other check at every chance, each exactly one rest long", () => {
    const edges = pumped(createLull(spec(), mulberry32(3), 0, null), 40, 4);
    expect(edges).toHaveLength(20);
    for (const [i, edge] of edges.entries()) {
      expect(edge.t).toBe(i % 2 === 0 ? "hold" : "release");
      expect(instantOf(edge)).toBe(2 * (i + 1));
    }
  });

  it("rest for one rest where the roll hit, and play on to the next check where it missed", () => {
    const edges = pumped(createLull(spec({ chance: () => 0.5 }), mulberry32(3), 0, null), 400, 4);
    const holds = edges.filter((edge) => edge.t === "hold").length;
    // A hit about half the time, and a check of play after every rest: roughly a third resting.
    expect(holds).toBeGreaterThan(40);
    expect(holds).toBeLessThan(100);
    let resting = false;
    let last = 0;
    for (const edge of edges) {
      expect(edge.t).toBe(resting ? "release" : "hold");
      const length = instantOf(edge) - last;
      if (resting) expect(length).toBe(2);
      else expect(length % 2).toBe(0);
      resting = edge.t === "hold";
      last = instantOf(edge);
    }
  });

  it("lay nothing at a chance of nought, and spend the draws all the same", () => {
    const random = mulberry32(11);
    let spent = 0;
    const counting = () => {
      spent++;
      return random();
    };
    const cursor = createLull(spec({ chance: () => 0 }), counting, 0, null);
    expect(pumped(cursor, 100, 4)).toEqual([]);
    // Two draws a check — the length it is counted over and the roll at its end — plus the one
    // the birth spends on the first length, at a check every two seconds: fifty checks.
    expect(spent).toBe(101);
  });

  it("read the chance at each roll rather than once", () => {
    let chance = 0;
    const cursor = createLull(spec({ chance: () => chance }), mulberry32(2), 0, null);
    expect(pumped(cursor, 40, 4)).toEqual([]);
    chance = 1;
    const out: HoldEdge[] = [];
    expect(cursor.edges(80, out)).toBeGreaterThan(0);
    expect(out[0]).toEqual({ t: "hold", at: 42 });
  });

  it("count the checks again from a reset, on the draws that follow", () => {
    const cursor = createLull(spec(), mulberry32(9), 0, null);
    const out: HoldEdge[] = [];
    expect(nextOf(cursor)).toBe(2);
    expect(cursor.edges(2, out)).toBe(1);
    expect(cursor.resting()).toBe(true);
    cursor.reset(50);
    expect(cursor.resting()).toBe(false);
    expect(nextOf(cursor)).toBe(52);
    expect(cursor.edges(51, out)).toBe(0);
  });

  it("check every so many seconds of playing, rest a whole rest on a hit, and count again", () => {
    const cursor = createLull(spec({ check: 0.5 }), mulberry32(3), 0, null);
    expect(nextOf(cursor)).toBe(0.5);
    // A hit at the first check, a rest of two seconds, and the next check half a second after it
    // — the rest's end, and not a lattice laid from the birth, is what the checks count from.
    expect(pumped(cursor, 6, 1)).toEqual([
      { t: "hold", at: 0.5 },
      { t: "release", at: 2.5 },
      { t: "hold", at: 3 },
      { t: "release", at: 5 },
      { t: "hold", at: 5.5 },
    ]);
    // A check shorter than a rest against one longer: a rest a check long is a square wave, and
    // a check of ten seconds rests the deck a hair every ten.
    const long = pumped(createLull(spec({ rest: 0.25, check: 10 }), mulberry32(3), 0, null), 30, 5);
    expect(long).toEqual([
      { t: "hold", at: 10 },
      { t: "release", at: 10.25 },
      { t: "hold", at: 20.25 },
      { t: "release", at: 20.5 },
    ]);
  });

  it("ask every term at the instant it is spent, and never at the pump", () => {
    const asked: [string, number][] = [];
    const cursor = createLull(
      spec({
        chance: (at) => {
          asked.push(["chance", at]);
          return at < 5 ? 0 : 1;
        },
        rest: (at) => {
          asked.push(["rest", at]);
          return at < 8 ? 1 : 3;
        },
        check: (at) => {
          asked.push(["check", at]);
          return at < 3 ? 1 : 2;
        },
      }),
      mulberry32(1),
      0,
      null,
    );
    // Checks at 1, 2, 3 (the check read as one at 0, 1, 2), then 5, 7 (two from 3 on); the chance
    // hits from 5: a rest of one at 5, let go at 6, the next check at 8 and a rest of three.
    expect(pumped(cursor, 12, 12)).toEqual([
      { t: "hold", at: 5 },
      { t: "release", at: 6 },
      { t: "hold", at: 8 },
      { t: "release", at: 11 },
    ]);
    expect(asked.filter(([name]) => name === "rest")).toEqual([
      ["rest", 5],
      ["rest", 8],
    ]);
    expect(asked.filter(([name]) => name === "chance").map(([, at]) => at)).toEqual([
      1, 2, 3, 5, 8,
    ]);
  });

  it("refuse a rest or a check that is no length, and a birth off the clock", () => {
    const out: HoldEdge[] = [];
    expect(() => createLull(spec({ rest: 0 }), mulberry32(1), 0, null).edges(10, out)).toThrow(
      RangeError,
    );
    expect(() => createLull(spec({ check: 0 }), mulberry32(1), 0, null).nextAt()).toThrow(
      RangeError,
    );
    expect(() => createLull(spec(), mulberry32(1), Number.NaN, null)).toThrow(RangeError);
  });
});

describe("a lull on the beat", () => {
  it("rounds a length onto whole beats above one and a division below", () => {
    expect(beatLength(10, 120)).toBe(10);
    expect(beatLength(5.2, 120)).toBe(5);
    expect(beatLength(0.3, 120)).toBe(0.25);
    expect(beatLength(0.4, 120)).toBe(0.5);
    expect(beatLength(0.02, 120)).toBeCloseTo(0.5 / 32);
    expect(() => beatLength(1, 0)).toThrow(RangeError);
  });

  it("lays every edge on a tick of the session clock, both lengths rounded onto the beat", () => {
    const cursor = createLull(spec({ rest: 1.1, check: 0.55 }), mulberry32(4), 0.3, {
      bpm: 120,
      sync: 0.5,
    });
    const edges = pumped(cursor, 100, 4);
    expect(edges.length).toBeGreaterThan(10);
    for (const edge of edges)
      expect(Math.abs(instantOf(edge) / 0.5 - Math.round(instantOf(edge) / 0.5))).toBeLessThan(
        1e-9,
      );
    // 1.1s rounds onto a beat, checked every half: held for a beat from the first tick past the
    // first half-beat check.
    expect(edges[0]).toEqual({ t: "hold", at: 1 });
    expect(edges[1]).toEqual({ t: "release", at: 2 });
  });

  it("lays nothing on a yard whose beat was never found", () => {
    const cursor = createLull(spec(), mulberry32(4), 0, { bpm: 0, sync: null });
    expect(pumped(cursor, 100, 4)).toEqual([]);
    expect(cursor.nextAt()).toBeNull();
  });

  it("keeps a rounded length inside the dial's own range", () => {
    const cursor = createLull(spec({ check: LULL_LENGTH_MIN }), mulberry32(6), 0, {
      bpm: 30,
      sync: null,
    });
    expect(nextOf(cursor)).toBeGreaterThanOrEqual(LULL_LENGTH_MIN);
    const long = createLull(spec({ check: LULL_LENGTH_MAX }), mulberry32(6), 0, {
      bpm: 0.5,
      sync: null,
    });
    expect(nextOf(long)).toBeLessThanOrEqual(LULL_LENGTH_MAX + 1e-9);
  });
});

/**
 * The Loose, which is the one term that is spent on a length rather than on the roll: every
 * length drawn under its own dial, the order of the draws unmoved by what it is worth, and a
 * drawn length still a length at the top of the dial (0396).
 */
// The Loose's whole contract in one block, each case a few lines and the block their count, the
// way the two blocks above are written. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("a lull held loosely", () => {
  /** How long each edge stood from the one before it. */
  const lengths = (edges: HoldEdge[]): number[] => {
    let last = 0;
    return edges.map((edge) => {
      const length = instantOf(edge) - last;
      last = instantOf(edge);
      return length;
    });
  };

  it("draws every length under its dial rather than holding it at the knob", () => {
    // At nought every rest and every check is exactly the dial, which is the run a lull already
    // laid: a square wave of twos.
    const held = lengths(pumped(createLull(spec(), mulberry32(5), 0, null), 40, 4));
    expect(held.length).toBeGreaterThan(10);
    for (const length of held) expect(length).toBe(2);
    // And at the top of the dial each one is drawn somewhere under its own two, never over it and
    // never nothing: the same schedule, performed rather than counted out.
    const loose = lengths(pumped(createLull(spec({ loose: 1 }), mulberry32(5), 0, null), 40, 4));
    expect(loose.length).toBeGreaterThan(10);
    for (const length of loose) {
      expect(length).toBeGreaterThanOrEqual(LULL_LENGTH_MIN);
      expect(length).toBeLessThanOrEqual(2);
    }
    expect(new Set(loose.map((length) => length.toFixed(6))).size).toBeGreaterThan(5);
  });

  it("keeps a drawn length a length at the top of the dial, and lays on past it", () => {
    // A draw that takes the whole of both dials away would lay every edge on the one it counts
    // from, and the walk below would never end: floored at the dial's own bottom instead.
    const most = createLull(spec({ loose: 1 }), () => 1 - Number.EPSILON, 0, null);
    const edges = pumped(most, 1, 1);
    expect(edges.length).toBeGreaterThan(90);
    for (const length of lengths(edges)) expect(length).toBeCloseTo(LULL_LENGTH_MIN, 9);
  });

  it("lays the same list at two cadences with every length drawn", () => {
    // The draw a length is taken under is spent when the edge it counts from is laid, never at the
    // pump that looks ahead, so a horizon in eights and one in halves are the same run (0204).
    const drawn = spec({ chance: () => 0.5, loose: 1 });
    const coarse = pumped(createLull(drawn, mulberry32(7), 0, null), 120, 8);
    const fine = pumped(createLull(drawn, mulberry32(7), 0, null), 120, 0.5);
    expect(coarse.length).toBeGreaterThan(10);
    expect(fine).toEqual(coarse);
  });

  it("spends no draw on a reset, so two writes of one knob lay the run one write does", () => {
    // Every lane a hand or an automator writes inside the horizon rewalks the cursor, and a drag
    // writes one a pointer sample: a draw spent there would make the run a function of how often
    // it was written rather than of the seed (0204, 0396).
    const walked = (resets: number): HoldEdge[] => {
      const cursor = createLull(spec({ loose: 1 }), mulberry32(8), 0, null);
      pumped(cursor, 10, 5);
      for (let i = 0; i < resets; i++) cursor.reset(10);
      return pumped(cursor, 40, 5);
    };
    expect(walked(1).length).toBeGreaterThan(5);
    expect(walked(2)).toEqual(walked(1));
  });

  it("refuses a looseness that is no number, rather than walking on forever", () => {
    // What a value missing from the instance's own record reads as: found here, where the number
    // came from, and not as a pump that never passes its horizon (principle 5).
    const out: HoldEdge[] = [];
    expect(() =>
      createLull(spec({ loose: () => Number.NaN }), mulberry32(1), 0, null).edges(10, out),
    ).toThrow(RangeError);
  });

  it("asks the Loose at the instant the length it draws is spent", () => {
    const asked: number[] = [];
    const cursor = createLull(
      spec({ check: 0.5, loose: (at) => (asked.push(at), 0) }),
      mulberry32(3),
      0,
      null,
    );
    // The first check's length is drawn from the birth, the rest's at the hold it holds from, and
    // the next check's from the release that ended it — each at the instant it is counted from
    // and never at the pump (0378).
    expect(pumped(cursor, 3, 3)).toEqual([
      { t: "hold", at: 0.5 },
      { t: "release", at: 2.5 },
      { t: "hold", at: 3 },
    ]);
    expect(asked).toEqual([0, 0.5, 2.5, 3]);
  });
});
