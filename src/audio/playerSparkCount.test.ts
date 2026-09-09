/**
 * @role What a landing throwing more than one companion is at the transport: a source and a level
 *   gain per spark, opened evenly up to the fraction the delay says, stopped with the landing, and
 *   read back as one cursor each (P123, 0175).
 * @instead What one companion is — its slot, its level, its clamp, the ladder it climbs and the
 *   seam it opens on → src/audio/playerLanding.test.ts. Where the count's slots come from →
 *   src/lib/playerWalk.test.ts. Both of those files are within a few lines of the hard cap, which
 *   is why the count is a file of its own (0045, docs/plan.md §4).
 */
import { describe, expect, it } from "vitest";

import { PLAYER_FADE_SECS, type PlayerSpec } from "@/lib/player";
import { playerSequence } from "@/lib/playerWalk";
import { deck, PLAYER, PRE_PLAYER_GAINS, SLOT, SPAN } from "./player.test";
import { emptyDeckPeek } from "./deckPeek";
import { fakeContext } from "./deckDouble";

/** A jumping deck whose graph is held, so a case can count the gains a landing built as well as
 *  the sources. `jumping` in src/audio/player.test.ts keeps its own context and hands back neither
 *  the nodes nor a way to pass one in, and a level held on a node is not a call to read off. */
const sparking = (patch: Partial<PlayerSpec>) => {
  const graph = fakeContext();
  const host = deck(graph);
  host.voice.setLoop(0, SPAN);
  host.voice.setPlayer({ ...PLAYER, ...patch });
  host.voice.play();
  return { ...host, gainNodes: graph.gainNodes };
};

const COUNT = 3;
/** How many sources and gains one landing of a pattern at that count is made of: itself and its
 *  companions, which is what the indices below step by. */
const PER_LANDING = COUNT + 1;
/** Half the landing's window, so the three stand at a sixth, a third and a half of it — a spacing
 *  no two of which could be confused with the delay itself. */
const HALF = 0.5;

describe("a landing that throws three sparks", () => {
  /**
   * Three companions is three sources and three level gains under the one landing, and the pass is
   * the same length: the count moves what a landing is made of and never what a window is, because
   * the roll that decides whether a landing sparks at all is unchanged (P123).
   */
  it("builds one source and one level gain per companion", () => {
    const many = sparking({ spark: 1, sparkCount: COUNT });
    const plain = sparking({ spark: 0 });
    expect(many.sources).toHaveLength(plain.sources.length * PER_LANDING);
    expect(many.gainNodes.length - PRE_PLAYER_GAINS).toBe(
      (plain.gainNodes.length - PRE_PLAYER_GAINS) * PER_LANDING,
    );
    // And each reads the slot the walk drew for it, in the order the walk drew them: the landing
    // first, then its three, which is the order one landing is armed in.
    const steps = playerSequence({ ...PLAYER, spark: 1, sparkCount: COUNT }, plain.sources.length);
    steps.forEach((step, at) => {
      expect(many.sources[at * PER_LANDING]?.started[0]?.[1]).toBeCloseTo(step.slot * SLOT, 9);
      step.sparked?.slots.forEach((slot, index) => {
        expect(many.sources[at * PER_LANDING + index + 1]?.started[0]?.[1]).toBeCloseTo(
          slot * SLOT,
          9,
        );
      });
    });
  });

  /**
   * And they stand evenly across the delay rather than in a pile on it: the dial says where the
   * *last* one begins and the rest divide the stretch between the landing's start and it, so the
   * count is a rhythm. The bound is untouched — the last is still a fraction of the landing's own
   * window less a seam, so no reading of either dial can start a spark at or after its own stop
   * (0175).
   */
  it("begins them evenly up to the delayed fraction, and stops all three with the landing", () => {
    const many = sparking({ spark: 1, sparkCount: COUNT, sparkDelay: HALF });
    for (let landing = 0; (landing + 1) * PER_LANDING <= many.sources.length; landing++) {
      const host = many.sources[landing * PER_LANDING];
      const at = host?.started[0]?.[0] ?? Number.NaN;
      // The landing's stop is a seam past its end, which is what makes the window its own.
      const ends = (host?.stopped[0] ?? Number.NaN) - PLAYER_FADE_SECS;
      for (let index = 0; index < COUNT; index++) {
        const spark = many.sources[landing * PER_LANDING + index + 1];
        // The share spelled out rather than taken from `sparkStartOf`, which is what this case
        // is about: an expectation built from the arithmetic under test would hold whatever it
        // said (src/lib/playerSpark.test.ts asks the arithmetic itself).
        expect(spark?.started[0]?.[0]).toBeCloseTo(
          at + ((HALF * (index + 1)) / COUNT) * (ends - at - PLAYER_FADE_SECS),
          9,
        );
        // Inside the landing, and let go with it: a companion may not outlive the entry it rides.
        expect(spark?.started[0]?.[0] ?? Number.NaN).toBeLessThan(ends);
        expect(spark?.stopped[0]).toBeCloseTo(host?.stopped[0] ?? Number.NaN, 9);
      }
      // The last of them is the delay itself, which is the one reading the dial promises.
      const last = many.sources[landing * PER_LANDING + COUNT];
      expect(last?.started[0]?.[0]).toBeCloseTo(at + HALF * (ends - at - PLAYER_FADE_SECS), 9);
    }
  });

  /**
   * And the peaks get a cursor each, off that one entry: `position` goes on answering off the
   * landing — which is why a spark rides the landing's queue entry at all (0166) — so three
   * companions are three more answers and never three more queue entries. Only the ones actually
   * sounding are in the list, because a cursor drawn before a spark's own start is a read the
   * instrument is claiming to play (0175).
   */
  it("reports one read position per spark, and only once each has begun", () => {
    const out = emptyDeckPeek();
    const many = sparking({ spark: 1, sparkCount: COUNT, sparkDelay: HALF });
    const first = playerSequence(
      { ...PLAYER, spark: 1, sparkCount: COUNT, sparkDelay: HALF },
      1,
    )[0];
    const at = many.sources[0]?.started[0]?.[0] ?? Number.NaN;
    const starts = Array.from(
      { length: COUNT },
      (_, index) => many.sources[index + 1]?.started[0]?.[0] ?? Number.NaN,
    );
    // Before the first of them: the landing is reading and none of its companions is.
    many.now((at + starts[0]!) / 2);
    many.voice.peek(out);
    expect(out.player.sparkPositions).toEqual([]);
    // Between the first and the second: one cursor, which is what "evenly across" means for a read.
    many.now((starts[0]! + starts[1]!) / 2);
    many.voice.peek(out);
    expect(out.player.sparkPositions).toHaveLength(1);
    // And a quarter of a slot past the last of them: three, each off the slot it was thrown at.
    const into = SLOT / 4;
    many.now(starts[2]! + into);
    many.voice.peek(out);
    expect(out.player.sparkPositions).toHaveLength(COUNT);
    out.player.sparkPositions.forEach((reading, index) => {
      const slot = first?.sparked?.slots[index] ?? Number.NaN;
      // Each has read for as long as it has been sounding, wrapped on its own slot's window.
      const held = (starts[2]! + into - starts[index]!) % SLOT;
      expect(reading).toBeCloseTo(slot * SLOT + held, 6);
    });
    // And the list is an answer about *now* rather than a high-water mark: asked again at an
    // instant with fewer sparks sounding it is shorter, which is the one thing a read that is
    // written by index rather than emptied on the way in has to get right (0070).
    many.now((at + starts[0]!) / 2);
    many.voice.peek(out);
    expect(out.player.sparkPositions).toEqual([]);
  });
});
