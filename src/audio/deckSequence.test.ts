/**
 * @role The sequence on one deck's transport: its fade laid on the gain after the fader as the
 *   ramps of the window ahead, counted on the lane clock — held by a pause, carried on by the
 *   next play, rewound by a stop — and cleared to one the instant it is let go (0379).
 * @instead The transport's other roads → ./deck.test.ts and ./deckRest.test.ts, whose harness
 *   this drives. The maths of the ramps themselves → src/lib/deckSequence.test.ts.
 */
import { describe, expect, it } from "vitest";

import { sequenceRamps, type DeckSequence } from "@/lib/deckSequence";
import type { PlayPlan } from "@/lib/timeline";
import type { Call } from "./deckDouble";
import { deck } from "./deckHarness";
import { emptyDeckPeek } from "./deckPeek";
import { AUTOMATION_HORIZON_SECS, LOOKAHEAD_SECS } from "./transport";

type Harness = ReturnType<typeof deck>;
type Posted = PlayPlan & { id: number };

/** In over four, play four, out over four: twelve seconds, longer than one horizon. */
const BREATH: DeckSequence = [
  { kind: "in", secs: 4 },
  { kind: "play", secs: 4 },
  { kind: "out", secs: 4 },
];

const lastPlan = (plans: readonly unknown[]): Posted => {
  let last: unknown = null;
  for (const plan of plans) if (plan !== null) last = plan;
  if (last === null) throw new Error("no plan was posted");
  // oxlint-disable-next-line no-unsafe-type-assertion -- the transport posts exactly this shape
  return last as Posted;
};

/** Play, confirmed by the reporter. */
const play = ({ voice, report, plans }: Harness): void => {
  voice.play();
  report({ ...lastPlan(plans), t: "started", at: LOOKAHEAD_SECS, offset: 0 });
};

/** The sequence's own gain is the second the chain builds, after the fader (`PRE_PLAYER_GAINS`). */
const fadeCalls = ({ gainLogs }: Harness): Call[] => {
  const calls = gainLogs[1];
  if (calls === undefined) throw new Error("the chain built no fade");
  return calls;
};

/** The calls a window's ramps are laid as. */
const laid = (ramps: readonly (readonly [number, number])[]): Call[] => {
  const [first, ...rest] = ramps;
  if (first === undefined) throw new Error("no ramps");
  return [
    ["cancelScheduledValues", first[1]],
    ["setValueAtTime", first[0], first[1]],
    ...rest.map(([value, at]): Call => ["linearRampToValueAtTime", value, at]),
  ];
};

const fadeOf = ({ voice }: Harness): { at: number; level: number } => {
  const out = emptyDeckPeek();
  voice.peek(out);
  return { at: out.sequenceAt, level: out.fade };
};

describe("a sequence on the transport", () => {
  it("lays the window ahead on the fade the moment play begins, from the top of its run", () => {
    const held = deck();
    held.voice.setSequence(BREATH);
    // Held with nothing up, it is laid by the play and not before.
    expect(fadeCalls(held)).toEqual([]);
    play(held);
    // The first audible sample is the sequence's nought: pinned at nought, up to one at four
    // seconds, held to eight, the window's end at nine and a half of the twelve.
    const from = LOOKAHEAD_SECS;
    expect(fadeCalls(held)).toEqual(
      laid(sequenceRamps(BREATH, from, from, from + AUTOMATION_HORIZON_SECS)),
    );
    expect(fadeOf(held)).toEqual({ at: 0, level: 0 });
  });

  it("is re-laid from where the clock stands when moved mid-pass, and never restarts", () => {
    const held = deck();
    play(held);
    const started = held.sources.length;
    held.now(2);
    held.voice.setSequence(BREATH);
    expect(held.sources.length).toBe(started);
    // Moved at two, it counts from the rewind the play made at its first sample: two seconds in
    // less the lookahead, and laid from the clock rather than from the anchor.
    const from = 2;
    expect(fadeCalls(held)).toEqual(
      laid(sequenceRamps(BREATH, LOOKAHEAD_SECS, from, from + AUTOMATION_HORIZON_SECS)),
    );
    expect(fadeOf(held).at).toBeCloseTo(2 - LOOKAHEAD_SECS, 9);
  });

  it("holds where a pause found it, and carries on from there at the next play", () => {
    const held = deck();
    held.voice.setSequence(BREATH);
    play(held);
    held.now(2 + LOOKAHEAD_SECS);
    held.voice.pause();
    // Two seconds in, halfway up the fade in, and it stays there while the deck is halted.
    expect(fadeOf(held).at).toBeCloseTo(2, 9);
    expect(fadeOf(held).level).toBeCloseTo(0.5, 9);
    held.now(10);
    expect(fadeOf(held).at).toBeCloseTo(2, 9);

    fadeCalls(held).length = 0;
    play(held);
    // The next play carries it on: the window laid at the resume is the one two seconds in.
    const from = 10 + LOOKAHEAD_SECS;
    expect(fadeCalls(held)).toEqual(
      laid(sequenceRamps(BREATH, from - 2, from, from + AUTOMATION_HORIZON_SECS)),
    );
    expect(fadeOf(held).at).toBeCloseTo(2, 9);
  });

  it("rewinds on a stop, so the next play fades in from the top again", () => {
    const held = deck();
    held.voice.setSequence(BREATH);
    play(held);
    held.now(6);
    expect(fadeOf(held).level).toBe(1);
    held.voice.stop();
    expect(fadeOf(held)).toEqual({ at: 0, level: 0 });

    fadeCalls(held).length = 0;
    held.now(20);
    play(held);
    const from = 20 + LOOKAHEAD_SECS;
    expect(fadeCalls(held)).toEqual(
      laid(sequenceRamps(BREATH, from, from, from + AUTOMATION_HORIZON_SECS)),
    );
  });

  it("goes on arming through its whole run, one window a tick", () => {
    const held = deck();
    held.voice.setSequence(BREATH);
    play(held);
    fadeCalls(held).length = 0;
    // The tick at four: the window from four, which carries the edge at eight and the fade out
    // to its end at twelve plus the lookahead, inside the horizon.
    held.now(4);
    held.voice.armAutomation();
    expect(fadeCalls(held)).toEqual(
      laid(sequenceRamps(BREATH, LOOKAHEAD_SECS, 4, 4 + AUTOMATION_HORIZON_SECS)),
    );
    // Past the end the level stays where the last step left it, and the deck goes on playing.
    held.now(30);
    expect(fadeOf(held).level).toBe(0);
    expect(held.voice.planned()).toBe(true);
  });

  it("is heard at one the instant it is let go, playing or not", () => {
    const held = deck();
    held.voice.setSequence(BREATH);
    play(held);
    held.now(2);
    fadeCalls(held).length = 0;
    held.voice.setSequence([]);
    expect(fadeCalls(held)).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 1, 2],
    ]);
    expect(fadeOf(held).level).toBe(1);
  });
});
