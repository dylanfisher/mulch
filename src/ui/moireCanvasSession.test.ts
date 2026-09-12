/**
 * @role Tests that the picture is of what a session is doing: that one effect at two settings is
 *   two fields and a rack of two is neither, that two parts of one song are two fields and a part
 *   coming round again is the field it was, and that an octave row's coarse copies stand at the
 *   pitch they claim and half as deep.
 * @instead Everything else the painter draws → src/ui/moireCanvas.test.ts, which this was split out
 *   of at the 800-line hard cap (0045). The rows a rack and a song make → src/ui/moireRows.ts. The
 *   harness these paint through → src/ui/moireCanvasPainted.ts, read back through
 *   src/ui/moireCanvasReadings.ts.
 */
// One over the dependency cap, and the one over it is the session's own row builder: a case that
// paints what a session paints has to reach the picture the way a yard does rather than through a
// second copy of the walk from a rack instance to a row (principle 1).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";
import { fractalStopsRest } from "@/lib/moireFractal";
import { type MoireRow } from "@/lib/moire";
import { gratingDepth } from "@/lib/moireGrating";
import { octaveShare } from "@/lib/moireOctaves";
import { PLAIN_PROFILE } from "@/lib/moireProfiles";
import { PLAIN_CUT } from "@/lib/moireSound";
import { emptyDeckPeek } from "@/audio/deckPeek";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { playerRowPeriod } from "@/lib/playerDrift";
import { partVoice } from "@/lib/player";
import { PLAYER_PART_DEFAULTS, type SongPart } from "@/lib/playerSong";
import { playerWalk, type PlayerStep } from "@/lib/playerWalk";
import { resetTuning } from "@/lib/moireTuning";
import { moireRows, NO_MASTER, refillRows } from "@/ui/moireRows";
import { joltRest } from "@/ui/moireJolt";
import { screenInkRest } from "@/ui/moireScreenInk";
import { NO_GROWN } from "@/ui/moireGrown";
import type { PlayerSpec } from "@/lib/player";
import { TILE_PX } from "@/ui/moireCanvas";
import { painterOn } from "@/ui/moireCanvasPainted";
import {
  ARRIVED,
  keptAt,
  pitchOf,
  rackRows,
  SILENT_MASTER,
  turnsIn,
} from "@/ui/moireCanvasReadings";
import { shapeRest } from "@/ui/moireShape";
import { moireRow as row } from "@/lib/moireRow";
import { oneSong } from "@/lib/playerSongs";
/**
 * And where the picture's own structure stands: at rest, and standing on its rest — so nothing here
 * travels and every case reads the structure the picture would draw with nothing having moved
 * (`fractalStopsRest`, src/lib/moireFractal.ts).
 */
const STOOD = fractalStopsRest();
/** A part of a song, with the opaque badge every one carries (0076, 0157). */
const songPart = (id: string, length: number): SongPart => ({
  ...PLAYER_PART_DEFAULTS,
  id,
  name: id,
  // The dials a part was captured from: nothing in the picture reads one — a row is cut by the
  // badge and the length alone (0176, src/lib/playerDrift.ts) — so the switch's own will do.
  voice: partVoice(PLAYER_DEFAULTS),
  length,
});
/**
 * The rows a yard jumping through `song` draws while `standing` is the part it is in — through the
 * one builder and the one per-frame read a session's picture is made with, so a case here paints
 * what a yard paints rather than what a fixture row would.
 */
const songRows = (song: readonly SongPart[], standing: SongPart): MoireRow[] => {
  const spec: PlayerSpec = { seed: 7, ...PLAYER_DEFAULTS, songs: oneSong(song) };
  /** The step the clock would be inside, off the walk itself rather than a fixture of its own:
   *  the peek hands the whole step over now, so a case here builds what a yard reads (0180). */
  const standingStep = (): PlayerStep => ({ ...playerWalk(spec)(), part: standing.id, song });
  const { rows, reads } = moireRows(
    [],
    [],
    0,
    PLAIN_CUT,
    playerRowPeriod(spec),
    NO_GROWN,
    null,
    NO_MASTER,
  );
  const peek = emptyDeckPeek();
  peek.player.step = standingStep();
  refillRows(
    rows,
    reads,
    peek,
    1,
    null,
    0,
    null,
    SILENT_MASTER,
    ARRIVED,
    0,
    STOOD,
    STOOD,
    screenInkRest(),
    [],
    joltRest(),
    shapeRest(),
  );
  return rows;
};

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetTuning();
});
// One flat list of the session's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the picture a session draws", () => {
  // What 0139 promised and nothing painted: the picture is of what the rack is set to. Read off the
  // registry's own delay rather than off a fixture row, so it is the mapping under test (0148).
  it("paints one effect at two settings as two fields, and a rack of two as neither", () => {
    const dry = { "delay.time": 0.03, "delay.mix": 0.05 };
    const wet = { "delay.time": 1.8, "delay.mix": 1 };
    vi.stubGlobal("devicePixelRatio", 1);
    const near = paintedOn(400, 128, rackRows({ id: "fx1", effect: "delay", params: dry }));
    vi.stubGlobal("devicePixelRatio", 1);
    const far = paintedOn(400, 128, rackRows({ id: "fx1", effect: "delay", params: wet }));
    vi.stubGlobal("devicePixelRatio", 1);
    const again = paintedOn(400, 128, rackRows({ id: "fx1", effect: "delay", params: dry }));
    // One grating each, and the same instance set the same way twice is the same picture twice:
    // the ink it cuts with is its mix and the place it is measured from is its time. The lattice
    // the rack stands in is in the set and cuts nothing until a read has said how loud the output
    // is (`latticeHeard`), and no read has.
    expect(near.cuts).toHaveLength(1);
    expect(near.cuts[0]?.alpha).toBeCloseTo(again.cuts[0]?.alpha ?? 0, 9);
    expect(near.aims[0]?.e).toBeCloseTo(again.aims[0]?.e ?? 0, 9);
    expect(near.cuts[0]?.alpha).toBeLessThan((far.cuts[0]?.alpha ?? 0) - 0.05);
    expect(Math.abs((near.aims[0]?.e ?? 0) - (far.aims[0]?.e ?? 0))).toBeGreaterThan(1);

    // And a rack of two is one field of both rather than a picture of either: the two are
    // multiplied, so it is dark wherever either of them blocks (0131).
    vi.stubGlobal("devicePixelRatio", 1);
    const rack = rackRows(
      { id: "fx1", effect: "delay", params: dry },
      { id: "fx2", effect: "delay", params: wet },
    );
    const twin = rack[0]?.profile ?? PLAIN_PROFILE;
    const both = paintedOn(400, 128, rack);
    // One cut per row the yard builds — the two instances, and behind them the grating on the whole
    // yard coming round, which a yard of two periods gets and a yard of one does not (0143), so the
    // count is read off the set rather than written down here — less the lattice, which no read
    // has cut yet. The instance rows are the first two.
    expect(both.cuts).toHaveLength(rack.length - 1);
    expect(rack.length).toBeGreaterThan(1);
    let apartFromOne = 0;
    let apartFromTwo = 0;
    for (let x = 4; x < 400; x += 8) {
      for (let y = 4; y < 128; y += 8) {
        const one = keptAt(both.aims[0], both.cuts[0]?.alpha ?? 0, x, y, twin);
        const two = keptAt(both.aims[1], both.cuts[1]?.alpha ?? 0, x, y, twin);
        apartFromOne = Math.max(apartFromOne, Math.abs(one * two - one));
        apartFromTwo = Math.max(apartFromTwo, Math.abs(one * two - two));
      }
    }
    expect(apartFromOne).toBeGreaterThan(0.05);
    expect(apartFromTwo).toBeGreaterThan(0.05);
  });

  // P117: what a song is doing is in the picture. A part boundary is a discontinuity, so two parts
  // are two fields — another angle, another spacing, another tint — and a part coming round again is
  // the field it was, because a row is drawn out of the part's own badge and nothing is stored
  // (0157, 0131).
  it("paints two parts of one song as two fields, and one part twice as one", () => {
    const one = songPart("verse", 2);
    const two = songPart("chorus", 32);
    const song = [one, two];
    vi.stubGlobal("devicePixelRatio", 1);
    const first = paintedOn(400, 128, songRows(song, one));
    vi.stubGlobal("devicePixelRatio", 1);
    const other = paintedOn(400, 128, songRows(song, two));
    vi.stubGlobal("devicePixelRatio", 1);
    const again = paintedOn(400, 128, songRows(song, one));
    // One grating per tier of the arrangement, and no more — a yard of one period has no macro row
    // to come round (0143). The part's own is the first of the two, and the song's over it holds
    // still through every part of one song, which is what makes a boundary one layer moving (P161).
    expect(first.cuts).toHaveLength(2);
    expect(other.aims.slice(1)).toEqual(first.aims.slice(1));
    // The same part twice is the same field twice: the same angle, the same spacing, the same
    // place it is measured from.
    expect(turnsIn(again.aims[0])).toBeCloseTo(turnsIn(first.aims[0]), 9);
    expect(pitchOf(again.aims[0])).toBeCloseTo(pitchOf(first.aims[0]), 9);
    expect(again.aims[0]?.e).toBeCloseTo(first.aims[0]?.e ?? 0, 9);
    // The other part is neither: a longer part is a broader field and another badge is another lean.
    expect(pitchOf(other.aims[0])).toBeGreaterThan(pitchOf(first.aims[0]) * 1.2);
    expect(turnsIn(other.aims[0])).not.toBeCloseTo(turnsIn(first.aims[0]), 3);
    // And the two are two pictures where it counts, which no pair of numbers on their own says.
    const depth = first.cuts[0]?.alpha ?? 0;
    let apart = 0;
    for (let x = 4; x < 400; x += 8) {
      for (let y = 4; y < 128; y += 8) {
        apart = Math.max(
          apart,
          Math.abs(keptAt(first.aims[0], depth, x, y) - keptAt(other.aims[0], depth, x, y)),
        );
      }
    }
    expect(apart).toBeGreaterThan(0.05);
  });

  // P104: one effect contributing a fine texture and a coarse one, so the coarse copies beat with
  // every other row's fine ones and the picture has structure inside its own structure (0143).
  it("draws an octave row's coarse copy at the pitch it claims, and half as deep", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const one = paintedOn(400, 128, [row({ period: 3 })]);
    const three = paintedOn(400, 128, [row({ period: 3, octaves: 3 })]);
    // One fill per scale, through the tile and the matrix the first copy already used.
    expect(one.cuts).toHaveLength(1);
    expect(three.cuts).toHaveLength(3);
    // Each copy an octave coarser than the one below it, and the first at the pitch the row would
    // have been drawn at on its own.
    const pitches = three.aims.slice(0, 3).map((move) => pitchOf(move) * TILE_PX);
    expect(pitches[0]).toBeCloseTo(pitchOf(one.aims[0]) * TILE_PX, 9);
    expect(pitches[1]).toBeCloseTo((pitches[0] ?? 0) * 2, 9);
    expect(pitches[2]).toBeCloseTo((pitches[0] ?? 0) * 4, 9);
    // And half as deep at each of them, so the coarse copies texture the picture rather than
    // replacing it. The depth every row is cut at falls too — by what the three copies come to
    // between them, a grating and three quarters and not three (`octaveShare`, 0244).
    const alphas = three.cuts.map(({ alpha }) => alpha);
    expect(alphas[1]).toBeCloseTo((alphas[0] ?? 0) / 2, 9);
    expect(alphas[2]).toBeCloseTo((alphas[0] ?? 0) / 4, 9);
    expect(alphas[0]).toBeCloseTo(gratingDepth(octaveShare(3)), 9);
  });
});
