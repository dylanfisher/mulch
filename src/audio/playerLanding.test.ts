/**
 * @role What one landing of a jumping pattern is, at the transport: how long each of its repeats
 *   sounds, whether it sounds at all, which way round it reads, and the second quieter one it may
 *   throw — the knobs P118, P121 and P123 gave a landing.
 * @instead Everything else the player promises — where it may read, that it draws its seed's own
 *   sequence, that every seam is a fade and that it arms ahead of the clock → src/audio/player.ts's
 *   own suite, which is at the hard cap and is why these two claims are a file of their own.
 */
// Over the 400-line soft cap by the block a spark needed: this suite grows by a case whenever a
// landing grows a knob, so its length is the size of that vocabulary rather than a judgement of its
// own — and the file it would otherwise grow into is at the hard cap, which is the whole reason
// this one exists (0045). See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import { PLAYER_FADE_SECS, type PlayerSpec } from "@/lib/player";
import { PLAYER_MASK_MAX, PLAYER_SLOTS } from "@/lib/playerSlots";
import { playerSequence } from "@/lib/playerWalk";
import { createDeckVoice } from "./deck";
import { destination, fakeBuffer, fakeContext, type Call } from "./deckDouble";
import { emptyDeckPeek } from "./deckPeek";

/** A loop the grid divides into 0.2s slots — well clear of the shortest one that can seam. */
const SPAN = 3.2;
/** The clip the loop is cut out of: wider than the loop, so a mirrored read is a subtraction that
 *  moves a slot somewhere the loop's own grid is not (P121). */
const CLIP_SECS = 4;

/**
 * And the one geometry a mirror can fall off the front of: a loop that starts after zero and ends
 * on the clip's own end, which is what a drag to the end of the peaks gives. `in + 16 × slot` then
 * lands a couple of ulps past `out`, so the last slot's mirror is a few femtoseconds below zero
 * (P121). The numbers are picked rather than round: with these three, slot 15 mirrors to −8.9e-16.
 */
const EDGE_CLIP_SECS = 5.12;
const EDGE_LOOP_IN = 0.121;
const EDGE_BURST_SECS = 0.4;
const SLOT = SPAN / PLAYER_SLOTS;

/**
 * A plain pattern with nothing drawn under it: one count on every landing, one rate, no wait and
 * no stray, so the only thing moving a window in either case below is the knob it is about. Its
 * own literal rather than the one src/audio/player.test.ts declares, the way every test file in
 * this instrument declares the spec it is asking about (principle 2).
 */
const PLAYER: PlayerSpec = {
  seed: 7,
  slots: PLAYER_MASK_MAX,
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
  song: [],
};

/** The chain's own two gains — the deck fader and the rack's input — before any step's. */
const PRE_PLAYER_GAINS = 2;

/**
 * One deck voice on a fake graph, already jumping. The voice is built here rather than shared,
 * for the reason src/audio/deckDouble.ts gives: `createDeckVoice` has one production owner and
 * only a test file may stand in for it.
 */
function jumping(patch: Partial<PlayerSpec> = {}, clip = CLIP_SECS, from = 0, to = SPAN) {
  const { buffers, context, gainLogs, gainNodes, now, sources } = fakeContext();
  const reporter = {
    port: {
      addEventListener: () => {},
      removeEventListener: () => {},
      start: () => {},
      postMessage: () => {},
      close: () => {},
    },
    disconnect: () => {},
  };
  const voice = createDeckVoice(
    context,
    destination(),
    // oxlint-disable-next-line no-unsafe-type-assertion -- only the port and disconnect are used
    reporter as unknown as AudioWorkletNode,
    { started: () => {}, looped: () => {}, stopped: () => {}, xrun: () => {} },
  );
  // Samples in it, because a reversed landing reads a copy of them and a `{ duration }` fake could
  // not say which end it started at (P121).
  const buffer = fakeBuffer(clip);
  voice.load(buffer);
  voice.setLoop(from, to);
  voice.setPlayer({ ...PLAYER, ...patch });
  voice.play();
  return { buffer, buffers, gainLogs, gainNodes, now, sources, voice };
}

type Host = ReturnType<typeof jumping>;

/** One step's seams, in the order they were scheduled. */
const seamsOf = (host: Host, step: number): Call[] =>
  (host.gainLogs[PRE_PLAYER_GAINS + step] ?? []).filter(
    ([method]) => method === "setValueCurveAtTime",
  );

/** Where each of a deck's steps began, to nine places — past any rounding a fade adds. */
const startsOf = (host: Host): string[] =>
  host.sources.map((source) => (source.started[0]?.[0] ?? Number.NaN).toFixed(9));

describe("a ratcheted landing", () => {
  /**
   * The ratchet, in the only two places a repeat's length is computed: where the landing ends, and
   * where each of its repeats opens. A hold that accelerates into the next jump is exactly this
   * and nothing else — the count is a geometric run rather than a run of equal windows (P118).
   */
  it("shrinks its repeats, and ends where their sum says", () => {
    const ratchet = 0.25;
    const host = jumping({ ratchet, gate: 1 });
    // What the whole landing occupies, off the source's own scheduled stop: the geometric sum of
    // four repeats of this fixture's burst, rather than four of them standing equal.
    const sum = [0, 1, 2, 3].reduce((secs, repeat) => secs + SLOT * (1 - ratchet) ** repeat, 0);
    for (const source of host.sources) {
      const held = (source.stopped[0] ?? 0) - (source.started[0]?.[0] ?? 0) - PLAYER_FADE_SECS;
      expect(held).toBeCloseTo(sum, 9);
      expect(held).toBeLessThan(PLAYER.repeats * SLOT);
    }
    // And the repeats inside it open at those partial sums: a cut landing carries one pair of
    // seams per repeat, so the openings are every other one and the gaps between them shrink.
    // Every cut landing of the pass, not the first one that happens to be cut: the gate is drawn
    // per landing, so one step is a sample of the seed rather than a claim about the arithmetic.
    const cut = host.sources
      .map((_source, step) => seamsOf(host, step))
      .filter((seams) => seams.length > 2);
    expect(cut.length).toBeGreaterThan(2);
    for (const seams of cut) {
      const opens = seams.filter((_seam, index) => index % 2 === 0).map((seam) => seam[2] ?? 0);
      expect(opens).toHaveLength(PLAYER.repeats);
      const spacings = opens.slice(1).map((at, index) => at - (opens[index] ?? Number.NaN));
      expect(spacings[0]).toBeCloseTo(SLOT, 9);
      spacings.slice(1).forEach((gap, index) => {
        expect(gap).toBeCloseTo((spacings[index] ?? Number.NaN) * (1 - ratchet), 9);
      });
    }
  });
});

describe("a dropped landing", () => {
  /**
   * The hole: a landing that is scheduled, placed and never opened. Its source is built, started,
   * stopped and reaped exactly as a sounding one is — which is what keeps `position` answering
   * inside it and the step after it beginning where it always would have — and the whole of what
   * makes it silent is a fader that gets no curve at all (P118).
   */
  it("is scheduled, never opens, and leaves the next landing where it was", () => {
    const holes = jumping({ drop: 1 });
    const sounding = jumping({ drop: 0 });
    expect(holes.sources).toHaveLength(sounding.sources.length);
    // The same windows, landing for landing. A drop that fires spends a draw, so the two passes
    // walk different slots — this fixture varies nothing and waits for nothing, so what a window
    // is made of is the count and the burst alone and the two passes lay them at the same instants.
    // That is the whole claim: a hole occupies its place rather than collapsing out of the grid.
    expect(startsOf(holes)).toEqual(startsOf(sounding));
    const spacings = holes.sources
      .slice(1)
      .map(
        (source, step) =>
          (source.started[0]?.[0] ?? 0) - (holes.sources[step]?.started[0]?.[0] ?? 0),
      );
    for (const gap of spacings) expect(gap).toBeCloseTo(PLAYER.repeats * SLOT, 9);
    // Every one of them stops on its own schedule, so nothing is left wired in with no `ended` to
    // reap it — a dropped landing is a step the transport lets go of like any other.
    expect(holes.sources.every((source) => source.stopped.length === 1)).toBe(true);
    expect(holes.sources.every((_source, step) => seamsOf(holes, step).length === 0)).toBe(true);
    expect(sounding.sources.every((_source, step) => seamsOf(sounding, step).length === 2)).toBe(
      true,
    );
  });
});

/** The slot each of a pattern's steps reads, in buffer seconds, off the walk rather than off the
 *  schedule: what is under test is where the transport put the head, so the slot it was told to
 *  read has to come from the pattern itself (P121). */
const slotsOf = (patch: Partial<PlayerSpec>, count: number): number[] =>
  playerSequence({ ...PLAYER, ...patch }, count).map((step) => step.slot * SLOT);

describe("a reversed landing", () => {
  /**
   * There is no negative rate on an `AudioBufferSourceNode`, so a landing that reads backwards
   * reads a reversed copy of the whole buffer — and the window it loops is the mirror of its own
   * slot: `[duration − from − span, duration − from)`, entered at its beginning like any other.
   * The same slot, the same length, the other way round (P121).
   */
  it("reads the mirror of its own slot, out of one reversed copy of the buffer", () => {
    const host = jumping({ reverse: 1 });
    const slots = slotsOf({ reverse: 1 }, host.sources.length);
    expect(host.sources.length).toBeGreaterThan(4);
    host.sources.forEach((source, step) => {
      const from = slots[step] ?? Number.NaN;
      const mirrored = CLIP_SECS - from - SLOT;
      expect(source.started[0]?.[1]).toBeCloseTo(mirrored, 9);
      expect(source.loopStart).toBeCloseTo(mirrored, 9);
      expect(source.loopEnd).toBeCloseTo(mirrored + SLOT, 9);
    });
    // One copy for the whole pass, however many landings read backwards: it is the deck's buffer
    // reversed and not the landing's slot, so there is nothing per-step to make.
    expect(host.buffers).toHaveLength(1);
    // And it really is the audio backwards: this fixture's samples are the frame index, so the
    // copy opens on the frame the deck's own buffer ends at.
    const copied = host.buffers[0]?.getChannelData(0) ?? new Float32Array();
    expect(copied[0]).toBe(host.buffer.length - 1);
    expect(copied.at(-1)).toBe(0);
  });
});

describe("a reversed landing at the buffer's edge", () => {
  /**
   * A mirror is the one read this module takes by subtraction, so it is the one that can land
   * before the buffer begins: a negative offset is a `RangeError` out of `start`, and a negative
   * `loopStart` is a source that ignores its loop points and repeats the whole reversed clip
   * instead of the slot (P121).
   */
  it("never reads before the buffer's own start, on a loop ending at the clip's end", () => {
    // A full stride against a full lean walks the grid by a fixed number of slots, so the second
    // landing is the last slot of it — where the clamp binds and the subtraction is tightest.
    const edge = { reverse: 1, stride: 1, bias: 1, distance: 15, burst: EDGE_BURST_SECS };
    const host = jumping(edge, EDGE_CLIP_SECS, EDGE_LOOP_IN, EDGE_CLIP_SECS);
    // The landing this is about was actually armed: a pass that never reached the last slot would
    // pass this on the slots it did reach and prove nothing.
    const last = playerSequence({ ...PLAYER, ...edge }, host.sources.length).filter(
      (step) => step.slot === PLAYER_SLOTS - 1,
    );
    expect(last.length).toBeGreaterThan(0);
    for (const source of host.sources) {
      expect(source.started[0]?.[1] ?? Number.NaN).toBeGreaterThanOrEqual(0);
      expect(source.loopStart).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("a forward landing", () => {
  /**
   * A pattern that reverses nothing asks for no copy at all and reads its slots the way it
   * always did — which is what says the case above is the knob rather than the fixture.
   */
  it("leaves a forward pattern reading its own slot, with no copy made", () => {
    const host = jumping({ reverse: 0 });
    const slots = slotsOf({ reverse: 0 }, host.sources.length);
    host.sources.forEach((source, step) => {
      expect(source.started[0]?.[1]).toBeCloseTo(slots[step] ?? Number.NaN, 9);
      expect(source.loopStart).toBeCloseTo(slots[step] ?? Number.NaN, 9);
    });
    expect(host.buffers).toHaveLength(0);
  });
});

describe("a reversed cursor", () => {
  /**
   * The cursor the playhead and the picture are drawn from runs the other way inside the same
   * slot. It has to: the read head is the deck's own fact, and a cursor walking forwards under a
   * landing playing backwards is the instrument showing one thing and playing another (P121).
   */
  it("runs its cursor the other way inside the slot it landed on", () => {
    const into = SLOT / 4;
    const out = emptyDeckPeek();
    // The first landing of any pattern is slot 0 — a play begins at the top of the loop — so both
    // readings below are inside the same slot and the only difference is which way it is read.
    const backwards = jumping({ reverse: 1 });
    backwards.now((backwards.sources[0]?.started[0]?.[0] ?? 0) + into);
    backwards.voice.peek(out);
    expect(out.position).toBeCloseTo(SLOT - into, 6);

    const forwards = jumping({ reverse: 0 });
    forwards.now((forwards.sources[0]?.started[0]?.[0] ?? 0) + into);
    forwards.voice.peek(out);
    expect(out.position).toBeCloseTo(into, 6);
  });
});

// Three cases over one knob, where every other block here has one: a spark is the first thing a
// landing grew that is a node rather than a number, so what it is has to be said as where it reads,
// what window it reads over, and what it does *not* do to the queue. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a sparking landing", () => {
  /** The level a spark below sounds at, well under the landing so a wrong gain is legible. */
  const LEVEL = 0.25;

  /**
   * The companion: a second source at another slot, through a gain held at its level and into the
   * landing's own fader — so it takes the landing's window and the landing's seams and differs by
   * where it reads and how loud it is, and by nothing else (P123).
   */
  it("schedules a second source at the spark's own slot", () => {
    const sparking = jumping({ spark: 1, sparkLevel: LEVEL });
    const plain = jumping({ spark: 0 });
    // Two sources per landing where there was one, and the pass is the same length: this fixture
    // varies nothing and waits for nothing, so what a window is made of is untouched by a spark.
    expect(sparking.sources).toHaveLength(plain.sources.length * 2);
    const steps = playerSequence({ ...PLAYER, spark: 1, sparkLevel: LEVEL }, plain.sources.length);
    steps.forEach((step, at) => {
      // The landing first and its spark straight after it, which is the order one landing is armed
      // in: the pair is built together and the queue keeps only the first of them.
      expect(sparking.sources[at * 2]?.started[0]?.[1]).toBeCloseTo(step.slot * SLOT, 9);
      expect(sparking.sources[at * 2 + 1]?.started[0]?.[1]).toBeCloseTo(
        (step.sparked?.slot ?? Number.NaN) * SLOT,
        9,
      );
    });
  });

  /**
   * And the rest of it is the landing's: the same instant in and the same instant out, because a
   * spark hangs under the fader the landing's seams are written on and the only node of its own is
   * the gain holding it at its level (P123).
   *
   * The one thing it does not take is the landing's loop period. A read is clamped so it never runs
   * past the end of the loop's grid, and that clamp is its own slot's — so a burst wider than a slot
   * wraps sooner near the end of the loop, for a spark exactly as for a landing (0089). Asked on a
   * burst four slots wide, where the clamp bites, rather than on the fixture's own one, where
   * `Math.min` is a no-op at every slot and the assertion would be about nothing.
   */
  it("gives it the landing's instants, its own slot's clamp, and a gain at the dial's level", () => {
    const burst = SLOT * 4;
    const sparking = jumping({ spark: 1, sparkLevel: LEVEL, burst });
    const plain = jumping({ spark: 0, burst });
    // One gain per landing where there was one too — the level — and the landing's own fader is
    // still the only thing the seams are written on.
    expect(sparking.gainNodes.length - PRE_PLAYER_GAINS).toBe(
      (plain.gainNodes.length - PRE_PLAYER_GAINS) * 2,
    );
    /** The window one read of `slot` loops: the burst, or what is left of the grid past it. */
    const clamped = (slot: number) => Math.min(burst, SPAN - slot * SLOT);
    const steps = playerSequence(
      { ...PLAYER, spark: 1, sparkLevel: LEVEL, burst },
      plain.sources.length,
    );
    steps.forEach((step, at) => {
      const landing = sparking.sources[at * 2];
      const spark = sparking.sources[at * 2 + 1];
      expect(spark?.started[0]?.[0]).toBeCloseTo(landing?.started[0]?.[0] ?? Number.NaN, 9);
      expect(spark?.stopped[0]).toBeCloseTo(landing?.stopped[0] ?? Number.NaN, 9);
      expect((spark?.loopEnd ?? 0) - (spark?.loopStart ?? 0)).toBeCloseTo(
        clamped(step.sparked?.slot ?? Number.NaN),
        9,
      );
      expect(sparking.gainNodes[PRE_PLAYER_GAINS + at * 2 + 1]?.gain.value).toBe(LEVEL);
    });
    // And the clamp really does bite on this burst: some spark loops a window its landing does not,
    // which is what says the line above is the spark's own slot rather than the landing's.
    expect(
      steps.some((step) => clamped(step.sparked?.slot ?? Number.NaN) !== clamped(step.slot)),
    ).toBe(true);
  });

  /**
   * And the chain still holds the *landing*. `bindSource` is one slot, not a per-node initialiser:
   * the deck's speed, pitch and tone are AudioParams of the source the chain is holding, so a
   * companion handed to it would take a live move away from the landing it hangs under and the two
   * would read at two rates (0031, P123). The spark is given the landing's own two values instead.
   */
  it("never hands the chain a companion to write a speed change onto", () => {
    const host = jumping({ spark: 1 });
    // Every landing is at an even index and every companion at the odd one after it: the pair is
    // armed together, the landing first.
    expect(host.sources.length % 2).toBe(0);
    host.now(0.2);
    host.voice.setParam(null, "deck.speed", 2);
    const written = host.sources.filter((source) => source.rateCalls.length > 0);
    expect(written.length).toBeGreaterThan(0);
    expect(host.sources.every((source, at) => at % 2 === 0 || source.rateCalls.length === 0)).toBe(
      true,
    );
  });

  /**
   * And the queue is still a queue of landings. `position` answers off the latest entry the clock
   * is at or past, so a companion sitting in that list would win the scan and walk the deck's read
   * head away from the pattern — the whole reason a spark is held on the landing's own entry
   * rather than pushed on beside it (P123, docs/plan.md).
   */
  it("leaves the read head on the landing rather than on the spark", () => {
    const into = SLOT / 4;
    const out = emptyDeckPeek();
    const host = jumping({ spark: 1 });
    const first = playerSequence({ ...PLAYER, spark: 1 }, 1)[0];
    // The spark of the first landing is somewhere else in the loop, or this proves nothing.
    expect(first?.sparked?.slot).not.toBe(first?.slot);
    host.now((host.sources[0]?.started[0]?.[0] ?? 0) + into);
    host.voice.peek(out);
    // The first landing of any pattern is slot 0 — a play begins at the top of the loop.
    expect(out.position).toBeCloseTo(into, 6);
  });
});

/** Every rate one source was scheduled at, in order — what the transport told the graph. */
const ladderOf = (calls: readonly Call[]): Call[] =>
  calls.filter(([method]) => method === "setValueAtTime");

// Two cases over one knob, where the blocks above run to one and three: a climb is the first
// amount that moves a number *inside* a landing, so it has to be said twice — as what the graph is
// told, and as what the cursor answers, which are the two things a rate had been one number for.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a climbing landing", () => {
  /** A climb of one rung a repeat inside a spread of one: the triangle 0, 1, 0, −1 over this
   *  fixture's four repeats, which is the rates 1, 1.5, 1 and 0.75 of `PLAYER_RATES`. */
  const CLIMBING = { climb: 1, spread: 1 } as const;
  const LADDER = [1.5, 1, 0.75];

  /**
   * The road P124 took: one source per landing still, with the ladder scheduled onto its own
   * `playbackRate` at each repeat's boundary. Stepped and never ramped — what is between two rungs
   * is not a rate this module may read at — and one source rather than one per repeat, so a
   * climbing landing costs the busiest thing in the instrument no nodes at all (0167).
   */
  it("steps its own source's rate at each repeat's boundary", () => {
    const host = jumping(CLIMBING);
    const first = host.sources[0];
    expect(first).toBeDefined();
    const at = first?.started[0]?.[0] ?? Number.NaN;
    // One step per repeat after the first, at the rung that repeat climbed to and at the instant
    // the repeat before it ends. The first rung is the value the chain's own speed was multiplied
    // by, so it is on the param rather than in this list.
    expect(first?.playbackRate.value).toBe(1);
    const ladder = ladderOf(first?.rateCalls ?? []);
    expect(ladder.map(([method, rate]) => [method, rate])).toEqual(
      LADDER.map((rate) => ["setValueAtTime", rate]),
    );
    // To nine places, because a boundary is the running sum of the repeats before it and the last
    // of them lands an ulp off the product this reads it against.
    ladder.forEach(([, , when], repeat) => {
      expect(when).toBeCloseTo(at + SLOT * (repeat + 1), 9);
    });
    // And a landing that does not climb schedules nothing at all: the ladder is one rung wide, so
    // there is no boundary to write anything at.
    expect(ladderOf(jumping({}).sources[0]?.rateCalls ?? [])).toEqual([]);
  });

  /**
   * And the companion climbs it too. A spark takes everything from the landing but its slot and
   * its level, and the one thing it may never do is read at a rate the landing is not reading at —
   * so the ladder goes onto both sources, off the one speed the chain wrote (P123, 0167).
   */
  it("gives the spark the same ladder rather than the rung it started on", () => {
    const host = jumping({ ...CLIMBING, spark: 1 });
    // Every landing is at an even index and every companion at the odd one after it, and the
    // landing is climbing, or the two agreeing would be two empty lists.
    expect(host.sources.length % 2).toBe(0);
    expect(ladderOf(host.sources[0]?.rateCalls ?? [])).toHaveLength(LADDER.length);
    for (const [at, source] of host.sources.entries()) {
      if (at % 2 === 0) continue;
      expect(ladderOf(source.rateCalls)).toEqual(ladderOf(host.sources[at - 1]?.rateCalls ?? []));
    }
  });

  /**
   * And the cursor the playhead and the picture are drawn from crosses the boundary with it: a
   * landing has read the repeats it has finished at the rungs they were read at, plus the part of
   * the one it is inside. Multiplied by one rate it would say the head is somewhere the source is
   * not, which is the instrument showing one thing and playing another (P121, 0167).
   */
  it("reads its cursor as the sum of the repeats it has finished", () => {
    const out = emptyDeckPeek();
    const into = SLOT + SLOT / 2;
    // A play begins at the top of the loop, so the first landing of any pattern is slot 0 and the
    // reading below is the head's own distance into it.
    const climbing = jumping(CLIMBING);
    climbing.now((climbing.sources[0]?.started[0]?.[0] ?? 0) + into);
    climbing.voice.peek(out);
    // One whole repeat at unity and half of one at a rung and a half, wrapped on the burst's span.
    expect(out.position).toBeCloseTo((SLOT + (SLOT / 2) * 1.5) % SLOT, 6);
    // Where a landing at one rate is exactly as far in as the clock is.
    const flat = jumping({});
    flat.now((flat.sources[0]?.started[0]?.[0] ?? 0) + into);
    flat.voice.peek(out);
    expect(out.position).toBeCloseTo(into % SLOT, 6);
  });
});
