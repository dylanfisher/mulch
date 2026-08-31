/**
 * @role What a list of parts answers about itself — whether the walk plays any of it, and how much
 *   of what is heard one part is — and what the cursor over a run the pattern draws for itself
 *   promises (0158, 0176).
 * @instead What the tier over a part promises the walk, and the cursor that hands parts out →
 *   src/lib/playerSongs.test.ts (P170).
 */
import { describe, expect, it } from "vitest";

import { partVoice, type PlayerVoice } from "./player.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import { mulberry32 } from "./random.ts";
import {
  createDrawnSong,
  PLAYER_PART_DEFAULTS,
  PLAYER_PART_MAX,
  PLAYER_PART_MIN,
  songIsPlayed,
  songLength,
  songShare,
  type ArrangementSpec,
  type SongPart,
} from "./playerSong.ts";

/** Every field a draw touches, which is the switch's own values but the song and the cast
 *  (0153, 0174). */
const { songs: _songs, cast: _cast, ...PLAIN } = PLAYER_DEFAULTS;

/**
 * A voice told apart by one number. What a part is drawn as is the caller's — this file never
 * sees a character — so a draw here is a counter, and `distance` is the field the count rides in.
 */
const voiceOf = (drawn: number): PlayerVoice => ({ ...PLAIN, distance: drawn });

/** A part, with the opaque id every one carries and a spec told apart by one number — counted
 *  here, so a case can name the one it expects the cursor to hand back (0157, 0176). */
let minted = 0;
const part = (fields: Partial<SongPart> = {}): SongPart => ({
  id: `part-${++minted}`,
  name: `part-${minted}`,
  skip: false,
  voice: partVoice(voiceOf(minted)),
  length: 2,
  steps: [],
  ...fields,
});

// One case per promise a song makes, and the list of them is what a song is: the length is how
// many such promises there are rather than how much this block decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a song of parts", () => {
  /**
   * And the same rule asked of the list rather than walked: what the card reads to decide whether
   * there is an arrangement at all, so a song of nothing but skipped parts is not one there either
   * (principle 1, src/ui/PlayerCard.tsx).
   */
  it("says a song of nothing but skipped parts is no arrangement", () => {
    expect(songIsPlayed([])).toBe(false);
    expect(songIsPlayed([part({ skip: true }), part({ skip: true })])).toBe(false);
    expect(songIsPlayed([part({ skip: true }), part()])).toBe(true);
  });

  /**
   * How much of the song one part is: its jumps over the jumps of what is actually played. A
   * skipped part is none of it and is none of the total either, so the bar a row draws is a
   * picture of what is heard rather than of what is listed.
   */
  it("measures a part's share against the parts the walk plays", () => {
    const [one, two, three] = [
      part({ length: 1 }),
      part({ length: 3 }),
      part({ length: 4, skip: true }),
    ];
    const song = [one, two, three];
    expect(songShare(song, one)).toBe(0.25);
    expect(songShare(song, two)).toBe(0.75);
    expect(songShare(song, three)).toBe(0);
    // Every part skipped is a total of zero, and a share of zero rather than a division that is
    // not a number (principle 5).
    expect(songShare([{ ...one, skip: true }], { ...one, skip: true })).toBe(0);
  });
});

/** The four amounts, at what a switch press leaves them: one arrangement, kept forever, never
 *  evolving and never coming home — the point every case below moves one field away from. */
const AMOUNTS: ArrangementSpec = {
  arrange: 3,
  arrangeKeep: 0,
  arrangeChance: 0,
  arrangeReturn: 0,
  arrangeAmount: 1,
  arrangeGrow: 0,
  arrangeSpan: 0,
  arrangeApart: 0,
};

/**
 * The drawn cursor's answers over `jumps` calls. The part draw is the caller's, exactly as it is
 * in the walk: a counted id, and a spec whose one number comes off the generator standing in for
 * the character a walk would draw — so a case can tell two runs apart by what was drawn and not
 * only by when (0176).
 */
function drew(amounts: ArrangementSpec, jumps: number, seed = 3) {
  const random = mulberry32(seed);
  let drawn = 0;
  const next = createDrawnSong(
    amounts,
    random,
    () => ({
      id: `d${drawn}`,
      name: `d${drawn++}`,
      skip: false,
      voice: partVoice(voiceOf(random())),
      length: 1,
      steps: [],
    }),
    (laid) => ({ ...PLAIN, ...laid.voice }),
  );
  const seen = Array.from({ length: jumps }, () => next());
  return {
    laid: drawn,
    parts: seen.map((handed) => handed?.part.id ?? null),
    runs: seen.map((handed) => handed?.song.map((entry) => entry.id).join(",") ?? null),
  };
}

// One case per promise a drawn arrangement makes, which is `createFigure`'s list one tier up: the
// length is how many such promises there are rather than how much this block decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a song the pattern draws", () => {
  // Zero parts is the whole of "not drawn", so a cursor that is off hands nothing over and draws
  // nothing at all — the guard every amount in this module carries (0134, 0151).
  it("hands the walk nothing, and draws nothing, while it is off", () => {
    expect(drew({ ...AMOUNTS, arrange: 0 }, 8)).toEqual({
      laid: 0,
      parts: Array.from({ length: 8 }, () => null),
      runs: Array.from({ length: 8 }, () => null),
    });
  });

  // Laid one part at the jump it begins, so the run fills in as it is heard rather than a round
  // ahead of it — and it is the laying that is the first of the rounds a keep counts.
  it("lays its run one part at a time and then reads it back", () => {
    expect(drew(AMOUNTS, 7).parts).toEqual(["d0", "d1", "d2", "d0", "d1", "d2", "d0"]);
  });

  /** A round kept is the same parts; a round let go is not. The two halves of what the keep
   *  counts, over one seed so the only thing between them is the amount. */
  it("keeps a run for the rounds its keep asks and lets the next go", () => {
    expect(drew({ ...AMOUNTS, arrangeKeep: 1 }, 6).parts).toEqual([
      "d0",
      "d1",
      "d2",
      "d3",
      "d4",
      "d5",
    ]);
  });

  /** And a let-go run comes home on the return's odds, which at one is the first run it laid
   *  every time it is dropped — and never a run that went on evolving in place (0151). */
  it("returns a let-go run to the first one it laid", () => {
    expect(drew({ ...AMOUNTS, arrangeKeep: 1, arrangeReturn: 1 }, 6).parts).toEqual([
      "d0",
      "d1",
      "d2",
      "d0",
      "d1",
      "d2",
    ]);
  });

  /** Evolving is one part of a kept run redrawn at the top of a round, and exactly one: the run
   *  stays recognisable and is never twice the same. */
  it("redraws one part of a kept run on the chance", () => {
    const { parts, laid } = drew({ ...AMOUNTS, arrangeChance: 1 }, 9);
    expect(laid).toBe(5);
    expect(parts.slice(0, 3)).toEqual(["d0", "d1", "d2"]);
    expect(parts.slice(3, 6).filter((id) => id === "d3")).toHaveLength(1);
  });

  /** Every step is handed the run it was walked in, and a run already handed out is never moved
   *  under it: a surface reading an arrangement off a step reads the one that step was drawn in
   *  (0157). */
  it("hands out a run that is not moved under a step already given one", () => {
    const { runs } = drew({ ...AMOUNTS, arrangeChance: 1 }, 9);
    expect(runs[0]).toBe("d0");
    expect(runs[2]).toBe("d0,d1,d2");
    expect(runs[3]).not.toBe(runs[2]);
  });

  /**
   * 0199's growth: a run given a grow opens on one part and takes another on each time it has come
   * round that many times, so an arrangement *arrives* rather than starting complete. Read at a
   * grow of one over eight jumps of a three-part run, where each part lasts a single jump: the
   * first part alone, again, then the second beside it, and so on until the run is whole.
   */
  it("opens on one part and takes another on every round it is given", () => {
    expect(drew({ ...AMOUNTS, arrangeGrow: 1 }, 9).parts).toEqual([
      "d0",
      "d0",
      "d1",
      "d0",
      "d1",
      "d2",
      "d0",
      "d1",
      "d2",
    ]);
  });

  /**
   * And a grow of zero is the whole of "lay it at once", which is the run a drawn song laid before
   * there was anything to grow — the guard every amount in this module carries (0134, 0158).
   */
  it("lays the whole run at once while there is no grow", () => {
    expect(drew({ ...AMOUNTS, arrangeGrow: 0 }, 7)).toEqual(drew(AMOUNTS, 7));
  });

  /**
   * What a keep counts is rounds of the *arrangement*, and a run still growing has not finished
   * arriving — so the rounds it makes on its way up are not among them. Read against the same keep
   * without a grow: the growing run is still laying its own parts where the flat one has already
   * let go and drawn new ones.
   */
  it("does not count a growing run's rounds against its keep", () => {
    const grown = drew({ ...AMOUNTS, arrangeKeep: 1, arrangeGrow: 2 }, 6).parts;
    expect(grown.slice(0, 5)).toEqual(["d0", "d0", "d0", "d1", "d0"]);
  });
});

describe("how long a drawn part lasts", () => {
  /** A span of zero has one length in it, so every draw across the whole range is the default —
   *  and the draw is spent either way, which is the rule every draw in this module keeps (0089). */
  it("draws the one length while there is no span", () => {
    for (const draw of [0, 0.13, 0.5, 0.99]) {
      expect(songLength(0, draw)).toBe(PLAYER_PART_DEFAULTS.length);
    }
  });

  /**
   * And doublings and not jumps: one span is the eight halved, held and doubled, drawn evenly
   * across those three — which is what makes a run of parts a run of sections rather than a run of
   * arbitrary lengths (0199).
   */
  it("halves and doubles the default, one doubling per span", () => {
    expect([0, 0.5, 0.99].map((draw) => songLength(1, draw))).toEqual([4, 8, 16]);
    expect(songLength(2, 0)).toBe(2);
    expect(songLength(3, 0)).toBe(PLAYER_PART_MIN);
    expect(songLength(3, 0.99)).toBe(PLAYER_PART_MAX);
  });

  /** And never outside what a part may be, whatever the span reaches for. */
  it("clamps to what a part may last", () => {
    for (const span of [0, 1, 2, 3]) {
      for (const draw of [0, 0.25, 0.5, 0.75, 0.99]) {
        const length = songLength(span, draw);
        expect(length).toBeGreaterThanOrEqual(PLAYER_PART_MIN);
        expect(length).toBeLessThanOrEqual(PLAYER_PART_MAX);
      }
    }
  });
});
