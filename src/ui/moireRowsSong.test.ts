/**
 * @role The jumps module's own rows in a yard's drift — one per tier of the arrangement — measured
 *   through the one builder and the one per-frame read a picture is actually made with: that a
 *   jumping yard has them at all, what the part standing moves about the finest of them — its
 *   identity, its spacing, its tint, the wave it is cut to and the coordinate it is cut along —
 *   where the ground it is reading on anchors it, how the song and the album over it are drawn
 *   broader and step at their own boundaries, and the two bounds they are written against.
 * @instead The rows a lane, a rack instance, a grown run and the macro row make →
 *   src/ui/moireRows.test.ts, which this was the tail of until it reached the hard cap (0045). The
 *   two that belong to the whole field, the loop's own and the wash over it →
 *   src/ui/moireRowsField.test.ts. What the module declares → src/lib/playerDrift.ts. Drawing any
 *   of it → src/ui/moireCanvas.test.ts.
 */
// Over the soft cap, and what is over it is the two tiers over a part: the module's row is three
// rows now, and each of the three is measured for what it is, what its own boundary moves about it
// and what it leaves to the tier under it (0007, 0045). The split this file was made by is the one
// that stays: what the arrangement draws is one subject.
// oxlint-disable max-lines
// One import per thing the module's row is measured against — the picture's own rests and bands,
// the module's declarations, the walk that stands a part and the screen the tint reaches. The count
// tracks what a row says, exactly as it does in the file this was the tail of (0007).
// oxlint-disable import/max-dependencies
import { describe, expect, it } from "vitest";

import { emptyDeckPeek } from "@/audio/deckPeek";
import { fold } from "@/lib/copy";
import {
  DRIFT_BROADEST_PITCH,
  DRIFT_PITCH_REACH,
  DRIFT_REST,
  EFFECT_ROW_PERIOD_SECS,
  LINEAR_GEOMETRY,
  type MoireRow,
} from "@/lib/moire";
import { PLAIN_PROFILE, RESERVED_PROFILES } from "@/lib/moireProfiles";
import { PLAIN_CUT, type SourceCut } from "@/lib/moireSound";
import { landingSecs, partVoice, PLAYER_BURST_MAX, PLAYER_BURST_MIN } from "@/lib/player";
import { bedGround } from "@/lib/playerBed";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import {
  PLAYER_ALBUM_ROW_PITCH,
  PLAYER_ALBUM_ROW_SHAPE,
  PLAYER_ROW_SHAPE,
  PLAYER_SONG_ROW_PITCH,
  PLAYER_SONG_ROW_SHAPE,
  PLAYER_TINTS,
  playerRowStand,
  playerRowGeometry,
  playerRowHue,
  playerRowPeriod,
  playerRowPitch,
  playerRowProfile,
} from "@/lib/playerDrift";
import { PLAYER_REPEATS_MAX } from "@/lib/playerRepeats";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { PLAYER_PART_DEFAULTS, PLAYER_SONG_MAX, type SongPart } from "@/lib/playerSong";
import { playerWalk, type PlayerStep } from "@/lib/playerWalk";
import { screenHue } from "@/ui/moireScreen";
import type { PlayerSpec } from "@/lib/player";
import type { BeatAnalysis } from "@/lib/analysis";
import type { DeckPeek } from "@/audio/deckPeek";
import type { DeckState } from "@/state/store";
import type { Loop } from "@/lib/timeline";
import {
  moireRows as builtRows,
  refillRows as filledRows,
  NO_GROWN,
  type MoireLane,
} from "@/ui/moireRows";
import type { MoireRowSet, RowRead } from "@/ui/moireRowsField";
import { emptyMasterPeek } from "@/audio/context";
import { oneAlbum } from "@/lib/playerAlbum";

// oxlint-enable import/max-dependencies

/**
 * The one builder, with everything a case here is not about defaulted: a yard whose picture is the
 * module's row and the module's row alone. The same wrapper the rest of the rows are measured
 * through, and the second of two — the third would be the one to lift out (principle 3).
 */
const moireRows = (
  lanes: readonly MoireLane[],
  effects: DeckState["effects"],
  loopPeriod: number,
  cut: SourceCut,
  playerPeriod: number | null = null,
): MoireRowSet => builtRows(lanes, effects, loopPeriod, cut, playerPeriod, NO_GROWN, null);

/** An output with nothing in it: the module's rows are read off the walk and never off the bus. */
const SILENT_MASTER = emptyMasterPeek();

/** The per-frame read with nothing measured behind it, which is what every case here is about. */
const refillRows = (
  rows: readonly MoireRow[],
  reads: readonly RowRead[],
  peek: Readonly<DeckPeek>,
  rate: number,
  loop: Loop | null,
  duration: number,
  analysis: BeatAnalysis | null = null,
): void => {
  filledRows(rows, reads, peek, rate, loop, duration, analysis, SILENT_MASTER);
};

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

/** A yard's pattern, arranged as `song` and otherwise exactly what a switch press leaves. */
const playerSpec = (song: readonly SongPart[]): PlayerSpec => ({
  seed: 7,
  ...PLAYER_DEFAULTS,
  albums: oneAlbum(song),
});

/**
 * A step of that walk, standing in `part` — the very object the transport hands the peek, off the
 * walk itself rather than a fixture of its own, so a case here reads what a yard reads (0180).
 */
const standingStep = (song: readonly SongPart[], part: SongPart): PlayerStep => ({
  ...playerWalk(playerSpec(song))(),
  part: part.id,
  song,
});

/**
 * The same step standing in another song of another album: the place the walk authored, with the
 * two tiers over the part pointed elsewhere — which is the whole of what a boundary one and two
 * tiers up is, since a place is the cursor's and nothing else may derive one (0221).
 */
const standingIn = (step: PlayerStep, album: string, song: string): PlayerStep => {
  if (step.place === null) throw new Error("the walk stood in no place");
  return { ...step, place: { ...step.place, album, song } };
};

// One flat list of what the module's row is made of, each case a few lines (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the jumps module's row", () => {
  // P117: the thing actually moving where the deck reads from now draws. A song is the one thing on
  // a yard that changes in steps rather than continuously, so its row is the one whose identity, its
  // spacing and its tint move at a part boundary and hold through every frame between two of them
  // (0157, src/lib/playerDrift.ts).
  it("gives a yard holding a pattern a row of its own, and one holding none no row at all", () => {
    // A yard that cannot jump has no module doing anything, so the picture says nothing about one.
    expect(moireRows([], [], 0, PLAIN_CUT).rows).toEqual([]);
    const spec = playerSpec([songPart("verse", 2)]);
    const { rows, reads } = moireRows([], [], 0, PLAIN_CUT, playerRowPeriod(spec));
    const row = rows[0];
    if (row === undefined) throw new Error("the picture has no jumps row");
    // One row per tier of the arrangement, the part's first and the two over it after (P161).
    expect(rows).toHaveLength(3);
    expect(reads.map((read) => read.tier)).toEqual(["part", "song", "album"]);
    expect(reads).toEqual(
      ["part", "song", "album"].map((tier) => ({
        lane: null,
        instance: null,
        colour: [],
        tier,
        anchor: null,
        ground: null,
        heard: null,
        session: false,
      })),
    );
    // The landing its dials say, which is one burst repeated the count it is set to.
    expect(row.period).toBe(spec.burst * spec.repeats);
    expect(row.reference).toBe(false);
    expect(row.profile).toBe(PLAIN_PROFILE);
    // Nothing standing yet: a pattern that is not running is not in a part, so the row rests where
    // a row nothing reaches rests and makes no claim on the picture's colour.
    refillRows(rows, reads, emptyDeckPeek(), 1, null, 0);
    expect(row.shape).toBe(PLAYER_ROW_SHAPE);
    expect(row.pitch).toBe(DRIFT_REST.pitch);
    expect(row.hue).toBe(DRIFT_REST.hue);
  });

  // And the move itself: a part boundary is the discontinuity, and every frame between two of them
  // leaves the row exactly as it was but for the phase the deck is reading on.
  it("moves the jumps module's row at a part boundary and not per frame", () => {
    const one = songPart("verse", 2);
    const two = songPart("chorus", 32);
    const song = [one, two];
    const { rows, reads } = moireRows([], [], 0, PLAIN_CUT, playerRowPeriod(playerSpec(song)));
    const row = rows[0];
    if (row === undefined) throw new Error("the picture has no jumps row");
    const peek = emptyDeckPeek();

    // One part standing, and every frame of it is the same field: only the phase moves, which is
    // the deck reading on. A song does not travel through its part — it is in one until the next.
    peek.player.step = standingStep(song, one);
    const held: number[] = [];
    for (const position of [0, 0.1, 0.4, 0.9]) {
      peek.position = position;
      refillRows(rows, reads, peek, 1, null, 0);
      expect(row.shape).toBe(fold(one.id));
      expect(row.pitch).toBe(playerRowPitch(one));
      expect(row.hue).toBe(playerRowHue(one));
      held.push(row.phase);
    }
    expect(new Set(held).size).toBe(held.length);

    // The boundary, and the whole of what the picture shows of a song: another badge is another
    // angle and another place in the cycle, another length is another spacing, and a stepped
    // change is what has the strongest claim on the tint (0141).
    peek.player.step = standingStep(song, two);
    refillRows(rows, reads, peek, 1, null, 0);
    expect(row.shape).not.toBe(fold(one.id));
    expect(row.pitch).not.toBe(playerRowPitch(one));
    expect(row.hue).not.toBe(playerRowHue(one));
    expect(row.pitch).toBeGreaterThan(playerRowPitch(one));
    expect(screenHue([row])).toBe(row.hue);

    // And the same part coming round again is the same field: nothing about a row is stored, so a
    // part is drawn out of its badge rather than out of how many boundaries have gone by.
    peek.player.step = standingStep(song, one);
    refillRows(rows, reads, peek, 1, null, 0);
    expect(row.shape).toBe(fold(one.id));
    expect(row.pitch).toBe(playerRowPitch(one));
    expect(row.hue).toBe(playerRowHue(one));

    // A badge no arrangement holds is nobody standing: a cursor and a song that disagree leave the
    // row at its own rest rather than at whatever it last drew.
    peek.player.step = { ...standingStep(song, one), part: "a part this song does not hold" };
    refillRows(rows, reads, peek, 1, null, 0);
    expect(row.shape).toBe(PLAYER_ROW_SHAPE);
    expect(row.hue).toBe(DRIFT_REST.hue);
  });

  /**
   * P161: and the two tiers over a part carry a row each, broader than the layer under them — so a
   * part changing is a fine field moving over a coarser one holding still, and a whole album coming
   * round moves the picture wholesale. Each is folded off its own tier's id and steps at its own
   * tier's boundary, off the place the step already carries (0221).
   */
  it("lays a broader row over the part's for the song it is in and the album over that", () => {
    const one = songPart("verse", 2);
    const two = songPart("chorus", 32);
    const song = [one, two];
    const { rows, reads } = moireRows([], [], 0, PLAIN_CUT, playerRowPeriod(playerSpec(song)));
    const [row, songRow, albumRow] = rows;
    if (row === undefined || songRow === undefined || albumRow === undefined)
      throw new Error("the picture has no tier rows");
    // Broader than the tier under it, and the album's the broadest the picture has — the coarse end
    // of the band the field's own row already sits at, so the three sit inside the band the picture
    // has rather than off the end of it.
    expect(songRow.pitch).toBe(PLAYER_SONG_ROW_PITCH);
    expect(albumRow.pitch).toBe(PLAYER_ALBUM_ROW_PITCH);
    expect(songRow.pitch).toBeGreaterThan(DRIFT_PITCH_REACH);
    expect(albumRow.pitch).toBeGreaterThan(songRow.pitch);
    expect(albumRow.pitch).toBe(DRIFT_BROADEST_PITCH);
    // Everything else is the module's own row said again: one period for the three of them, which
    // is the landing the dials say, and the plainest grating there is along the straight axis.
    for (const tier of [songRow, albumRow]) {
      expect(tier.period).toBe(row.period);
      expect(tier.reference).toBe(false);
      expect(tier.profile).toBe(PLAIN_PROFILE);
      expect(tier.geometry).toBe(LINEAR_GEOMETRY);
      // Cut as deep as any row nothing reaches, which is what makes them layers rather than
      // readings: the field's own row rests at no depth precisely because it is a reading (0213).
      expect(tier.depth).toBe(DRIFT_REST.depth);
    }
    // Nothing standing: each rests on its own name, and no two of the three agree — three rows at
    // one angle would draw no fringe between them at all.
    const peek = emptyDeckPeek();
    refillRows(rows, reads, peek, 1, null, 0);
    expect(songRow.shape).toBe(PLAYER_SONG_ROW_SHAPE);
    expect(albumRow.shape).toBe(PLAYER_ALBUM_ROW_SHAPE);
    expect(new Set([row.shape, songRow.shape, albumRow.shape]).size).toBe(3);
    // And neither of the two makes a claim on the colour or the anchor the part standing and the
    // ground being read already make: a broader layer saying them again is one fact drawn twice.
    for (const tier of [songRow, albumRow]) {
      expect(tier.hue).toBe(DRIFT_REST.hue);
      expect(tier.centre).toBe(DRIFT_REST.centre);
    }
  });

  /**
   * And each of the three steps at its own tier's boundary and at nobody else's, which is what
   * makes a part changing one layer moving over a coarser one holding still (P161, 0221).
   */
  it("steps each tier's row at its own boundary and at nobody else's", () => {
    const one = songPart("verse", 2);
    const two = songPart("chorus", 32);
    const song = [one, two];
    const { rows, reads } = moireRows([], [], 0, PLAIN_CUT, playerRowPeriod(playerSpec(song)));
    const [row, songRow, albumRow] = rows;
    if (row === undefined || songRow === undefined || albumRow === undefined)
      throw new Error("the picture has no tier rows");
    const peek = emptyDeckPeek();
    // A part boundary is one layer moving: the fine row steps and the two over it hold still.
    peek.player.step = standingStep(song, one);
    refillRows(rows, reads, peek, 1, null, 0);
    const held = [songRow.shape, albumRow.shape];
    expect(songRow.shape).toBe(fold("one-song"));
    expect(albumRow.shape).toBe(fold("one-album"));
    peek.player.step = standingStep(song, two);
    refillRows(rows, reads, peek, 1, null, 0);
    expect(row.shape).toBe(fold(two.id));
    expect([songRow.shape, albumRow.shape]).toEqual(held);

    // Another song of the same album moves one of them, another album moves the other.
    peek.player.step = standingIn(standingStep(song, two), "one-album", "another-song");
    refillRows(rows, reads, peek, 1, null, 0);
    expect(songRow.shape).toBe(fold("another-song"));
    expect(albumRow.shape).toBe(held[1]);
    peek.player.step = standingIn(standingStep(song, two), "another-album", "another-song");
    refillRows(rows, reads, peek, 1, null, 0);
    expect(albumRow.shape).toBe(fold("another-album"));
    // Nothing about a tier is stored, so the same album reached again is the field it was — and
    // neither tier makes a claim on the colour or the anchor the part and the ground already make.
    peek.player.step = standingStep(song, one);
    refillRows(rows, reads, peek, 1, null, 0);
    expect([songRow.shape, albumRow.shape]).toEqual(held);
    expect(songRow.pitch).toBe(PLAYER_SONG_ROW_PITCH);
    expect(albumRow.pitch).toBe(PLAYER_ALBUM_ROW_PITCH);
  });

  /**
   * P145: a tint, a spacing and an angle recolour one row out of a dozen, so a song coming round
   * was a picture that barely moved. What the row *is* moves too — the wave it is cut to and the
   * coordinate it is cut along — and a comb becoming a ring is the row leaving one family of
   * fringes for another (0142).
   */
  it("cuts the module's row to the wave and the coordinate of the part standing", () => {
    // Two badges whose low bits differ: the geometry and the profile are read off bits the tint
    // does not spend, so they are the part's own and not a second name for its colour.
    const straight = songPart("verse", 2);
    const round = songPart("outro", 2);
    const song = [straight, round];
    const { rows, reads } = moireRows([], [], 0, PLAIN_CUT, playerRowPeriod(playerSpec(song)));
    const row = rows[0];
    if (row === undefined) throw new Error("the picture has no jumps row");
    const peek = emptyDeckPeek();

    peek.player.step = standingStep(song, straight);
    refillRows(rows, reads, peek, 1, null, 0);
    expect(row.geometry).toBe(playerRowGeometry(straight));
    expect(row.profile).toBe(playerRowProfile(straight));
    expect(row.geometry).toBe(LINEAR_GEOMETRY);

    // The boundary: another badge is another coordinate and another wave, and the row is a
    // different kind of thing rather than the same thing in another colour.
    peek.player.step = standingStep(song, round);
    refillRows(rows, reads, peek, 1, null, 0);
    expect(row.geometry).not.toBe(LINEAR_GEOMETRY);
    expect(row.profile).not.toBe(playerRowProfile(straight));

    // Only the two the instrument's own rows wear, ever: an effect may claim neither, so a song
    // can never make the picture say a plugin is doing what the arrangement is doing (0137, 0145).
    for (const part of ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => songPart(id, 2)))
      expect(RESERVED_PROFILES).toContain(playerRowProfile(part));

    // And nobody standing is the plainest grating there is, along the straight axis, which is what
    // the row rests at (`playerRow`).
    peek.player.step = { ...standingStep(song, round), part: "a part this song does not hold" };
    refillRows(rows, reads, peek, 1, null, 0);
    expect(row.geometry).toBe(LINEAR_GEOMETRY);
    expect(row.profile).toBe(PLAIN_PROFILE);
  });

  // P140: where in the source the yard is reading is what the picture is anchored on (0142, 0185).
  // Unlike the three fields above it moves without a part boundary, because the ground crawls in
  // sixteenths rather than stepping at one — and unlike them it is read off the step and not off
  // the part, because a yard whose badge names nothing is still reading somewhere.
  it("anchors the module's row where in the source the yard is reading, and crawls it", () => {
    const verse = songPart("verse", 2);
    const song = [verse];
    const { rows, reads } = moireRows([], [], 0, PLAIN_CUT, playerRowPeriod(playerSpec(song)));
    const row = rows[0];
    if (row === undefined) throw new Error("the picture has no jumps row");
    // A loop of two seconds two seconds into a sixteen-second file: a sixteenth of it is an eighth
    // of a second, and the ground has room either side.
    const loop = { in: 2, out: 4 };
    const duration = 16;
    const peek = emptyDeckPeek();

    // Nothing standing: no ground is being read, so the row makes no claim on where the picture is
    // measured from and rests in the middle of it.
    refillRows(rows, reads, peek, 1, loop, duration);
    expect(row.centre).toBe(DRIFT_REST.centre);

    // A ground of zero is the loop itself — a place the yard really is reading, so it anchors
    // there rather than resting. The peaks hide their rectangle here; an anchor claims no move.
    peek.player.step = { ...standingStep(song, verse), bed: 0 };
    refillRows(rows, reads, peek, 1, loop, duration);
    expect(row.centre).toBe(2 / 16);

    // And the crawl: one bed along is a quarter of the way in, one sixteenth along is one step of
    // an eighth of a second — and both are `bedGround`'s answer and not a second arithmetic
    // (principle 1, src/lib/playerBed.ts).
    const walked: number[] = [];
    for (const bed of [1, 8, PLAYER_SLOTS]) {
      peek.player.step = { ...standingStep(song, verse), bed };
      refillRows(rows, reads, peek, 1, loop, duration);
      expect(row.centre).toBe(bedGround(loop.in, loop.out - loop.in, duration, bed).in / duration);
      walked.push(row.centre);
    }
    expect(walked).toEqual([2.125 / 16, 3 / 16, 4 / 16]);

    // A badge no arrangement holds rests the three fields the part cuts and anchors this one all
    // the same: a ground is not the song's, so where the yard reads is true whether or not the
    // cursor's badge resolves. The one state in which the four fields deliberately disagree.
    peek.player.step = {
      ...standingStep(song, verse),
      bed: 8,
      part: "a part this song does not hold",
    };
    refillRows(rows, reads, peek, 1, loop, duration);
    expect(row.shape).toBe(PLAYER_ROW_SHAPE);
    expect(row.hue).toBe(DRIFT_REST.hue);
    expect(row.centre).toBe(3 / 16);

    // A yard with no loop and one with no source are both reading nowhere, so both rest.
    expect(playerRowStand(8, null, duration)).toBe(null);
    expect(playerRowStand(8, loop, 0)).toBe(null);
  });

  // The two bounds the module's row is written against, neither of which a default spec reaches:
  // the picture's own band, which a landing outside it is banded into, and the number of tints a
  // whole song may ask for — which is what keeps a boundary off the tile the picture is inked
  // through (0159, 0141).
  it("bands the module's period into the picture's own, and its whole song into four tints", () => {
    const [floor, ceiling] = EFFECT_ROW_PERIOD_SECS;
    expect(playerRowPeriod(playerSpec([]))).toBe(PLAYER_DEFAULTS.burst * PLAYER_DEFAULTS.repeats);
    // And a landing whose repeats shrink runs on the sum of them rather than on the count times
    // one: the row is the landing the transport schedules, or it is a picture that disagrees with
    // the sound about how long a landing is (P118, principle 1).
    const held = { ...playerSpec([]), burst: 0.5, repeats: 8 };
    expect(playerRowPeriod(held)).toBe(held.burst * held.repeats);
    expect(playerRowPeriod({ ...held, ratchet: 0.5 })).toBeCloseTo(
      landingSecs(held.burst, held.repeats, 0.5),
      12,
    );
    expect(playerRowPeriod({ ...held, ratchet: 0.5 })).toBeLessThan(playerRowPeriod(held));
    // A landing of five milliseconds is a line the window cannot show coming round, and one of two
    // minutes is a line that never moves inside it: both are drawn at the ends of the one band.
    expect(playerRowPeriod({ ...playerSpec([]), burst: PLAYER_BURST_MIN, repeats: 1 })).toBe(floor);
    expect(
      playerRowPeriod({ ...playerSpec([]), burst: PLAYER_BURST_MAX, repeats: PLAYER_REPEATS_MAX }),
    ).toBe(ceiling);
    // Eight parts is the longest song there is, and however their badges fall they ask the picture
    // for at most four tints — so a song that has been round once is asking for tiles that exist.
    const song = Array.from({ length: PLAYER_SONG_MAX }, (_, at) => songPart(`part-${at}`, 8));
    const tints = new Set(song.map((part) => playerRowHue(part)));
    expect(tints.size).toBeGreaterThan(1);
    expect(tints.size).toBeLessThanOrEqual(PLAYER_TINTS);
    // And a tint is the badge's and nobody else's, so a part keeps it wherever it is in the list.
    expect(playerRowHue(songPart("verse", 2))).toBe(playerRowHue(songPart("verse", 64)));
  });
});
