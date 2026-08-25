/**
 * @role Tests which lanes become rows, that a rack instance's row is what the instance is set to
 *   rather than only what it is, and that a bypassed instance contributes neither its own row nor
 *   the lanes riding it.
 */
// One over the cap, and the ones over it are the two this step added: the analyser that measures a
// source and the generator that makes one, which is what proves two files draw two pictures
// (docs/decisions/0007-reviewed-oversized-functions.md).
// oxlint-disable import/max-dependencies
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { effectById } from "@/audio/effects/registry";
import { PARAMS, paramKey } from "@/audio/params";
import { automationValueAt } from "@/lib/automation";
import { fold } from "@/lib/copy";
import { normalize } from "@/lib/range";
import { analyzeBeats } from "@/lib/analysis";
import { renderGen } from "@/lib/waveform";
import { emptyDeckPeek } from "@/audio/deckPeek";
import {
  colourReached,
  DRIFT_DEPTH_FLOOR,
  DRIFT_FEEDBACK_REACH,
  DRIFT_REST,
  EFFECT_ROW_PERIOD_SECS,
  effectRowPeriod,
  FLAT_BEND,
  laneBend,
  LINEAR_GEOMETRY,
  MIN_ROW_CYCLES,
  PLAIN_PROFILE,
} from "@/lib/moire";
import {
  DRIFT_PULSE_DB,
  PLAIN_CUT,
  pulsedDepth,
  sourceCut,
  type SourceCut,
} from "@/lib/moireSound";
import { landingSecs, PLAYER_BURST_MAX, PLAYER_BURST_MIN, PLAYER_REPEATS_MAX } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import {
  PLAYER_ROW_SHAPE,
  PLAYER_TINTS,
  playerRowHue,
  playerRowPeriod,
  playerRowPitch,
} from "@/lib/playerDrift";
import { PLAYER_PART_DEFAULTS, PLAYER_SONG_MAX, type SongPart } from "@/lib/playerSong";
import { screenHue } from "@/ui/moireScreen";
import type { PlayerSpec } from "@/lib/player";
import type { SessionEffect } from "@/state/session";
import type { DeckState } from "@/state/store";
import {
  deckLanes,
  moireRows as builtRows,
  refillRows,
  type MoireLane,
  type MoireRowSet,
} from "@/ui/moireRows";

/**
 * The one builder, with the jumps module's period defaulted to none. Every case here but the
 * module's own is about a lane, an instance or the loop, and a yard that is not jumping is what
 * each of them was written against — so the argument is named only where it is the subject.
 */
const moireRows = (
  lanes: readonly MoireLane[],
  effects: DeckState["effects"],
  loopPeriod: number,
  cut: SourceCut,
  playerPeriod: number | null = null,
): MoireRowSet => builtRows(lanes, effects, loopPeriod, cut, playerPeriod);

const emptyDeck = (): DeckState => {
  const deck = createInstrument(manualClock()).state.getState().decks.a;
  if (deck === undefined) throw new Error("the initial session holds no deck a");
  return deck;
};

/**
 * A rack instance the way the session builds one: every parameter its entry declares, at the
 * default unless this test says otherwise. `paramIn` throws on a value an instance does not hold
 * (0030), so a fixture holding half a rack entry is a fixture no session could produce.
 */
const instance = (
  id: string,
  over: Partial<{
    effect: SessionEffect["effect"];
    bypassed: boolean;
    params: SessionEffect["params"];
    automation: SessionEffect["automation"];
  }> = {},
): SessionEffect => {
  const effect = over.effect ?? "delay";
  return {
    id,
    effect,
    bypassed: over.bypassed ?? false,
    params: {
      ...Object.fromEntries(effectById(effect).params.map((param) => [param.id, param.default])),
      ...over.params,
    },
    automation: over.automation ?? {},
  };
};

/**
 * A part of a song, with the opaque badge every one carries: minted at the gesture that adds one,
 * so two parts alike in every other field are still two things (0076, 0157).
 */
const songPart = (id: string, length: number): SongPart => ({
  ...PLAYER_PART_DEFAULTS,
  id,
  length,
});

/** A yard's pattern, arranged as `song` and otherwise exactly what a switch press leaves. */
const playerSpec = (song: readonly SongPart[]): PlayerSpec => ({
  seed: 7,
  ...PLAYER_DEFAULTS,
  song,
});

const mix = [
  { at: 0, value: 0 },
  { at: 3, value: 1 },
];

// One flat list of what a yard's rows are made of, each case a few lines (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireRows", () => {
  it("makes a row of every lane that has a period, and of nothing else", () => {
    const state = emptyDeck();
    expect(deckLanes(state.automation, state.effects)).toEqual([]);
    // A lane that never moved has no period and is not drift (0035).
    expect(deckLanes({ "deck.gain": [{ at: 0, value: 0.5 }] }, [])).toEqual([]);
    expect(
      deckLanes(
        {
          "deck.gain": [
            { at: 0, value: 0.5 },
            { at: 2, value: 1 },
          ],
        },
        [],
      ),
    ).toEqual([
      {
        key: paramKey(null, "deck.gain"),
        period: 2,
        // The parameter picks the waveform, so two lanes of the same period on different knobs
        // are different rows; the lane's own values bend it.
        shape: fold("deck.gain"),
        bend: laneBend([
          { at: 0, value: 0.5 },
          { at: 2, value: 1 },
        ]),
        // A deck's own knob belongs to no effect, so its row is cut to the plain grating the
        // loop's reference row is, along the straight axis every row was cut along before an
        // effect could bend one — nothing in the picture claims it as its own kind (P99, 0142).
        profile: PLAIN_PROFILE,
        geometry: LINEAR_GEOMETRY,
      },
    ]);
  });

  it("finds a rack instance's lanes under the instance's own key", () => {
    const lanes = deckLanes({}, [instance("fx1", { automation: { "delay.mix": mix } })]);
    expect(lanes).toEqual([
      {
        key: paramKey("fx1", "delay.mix"),
        period: 3,
        shape: fold("delay.mix"),
        bend: laneBend(mix),
        // A knob on an effect is that effect doing something, so the row is cut to the profile the
        // registry entry declares rather than to the plain one a deck's own knob draws, along the
        // coordinate that entry declares beside it.
        profile: effectById("delay").drift,
        geometry: effectById("delay").geometry,
      },
    ]);
    expect(effectById("delay").drift).not.toBe(PLAIN_PROFILE);
  });

  it("gives an instance in the rack a row of its own, lane or no lane", () => {
    const { rows, reads } = moireRows([], [instance("fx1")], 0, PLAIN_CUT);
    // An effect is drawn whether or not anything is automating it, and nothing automates this one,
    // so its phase comes off the deck's own clock rather than out of a lane's key.
    expect(rows).toHaveLength(1);
    expect(reads).toEqual([{ lane: null, instance: "fx1", colour: [], song: false }]);
    // Its angle and where in its cycle it starts are still folded out of its own id the way its
    // name is (0076) — two rows that agreed in every field would draw no fringe at all.
    expect(rows[0]?.shape).toBe(fold("fx1"));
    expect(rows[0]?.reference).toBe(false);
    // And it says which kind of effect it is: the profile is the plugin's (P99).
    expect(rows[0]?.profile).toBe(effectById("delay").drift);
    const [shortest, longest] = EFFECT_ROW_PERIOD_SECS;
    expect(rows[0]?.period).toBeGreaterThanOrEqual(shortest);
    expect(rows[0]?.period).toBeLessThanOrEqual(longest);
    // And a lane on that effect keeps bending the row it already bends: the instance's own row is
    // beside it, the loop is after them, and the macro row on when the three of them line up is
    // last of all — a period the yard already knows and no knob owns (0143).
    const bent = instance("fx1", { automation: { "delay.mix": mix } });
    const withLane = moireRows(deckLanes({}, [bent]), [bent], 8, PLAIN_CUT);
    expect(withLane.periods).toEqual([3, rows[0]?.period, 8]);
    expect(withLane.rows.map((each) => each.period)).toEqual([
      ...withLane.periods,
      "secs" in withLane.recurrence ? withLane.recurrence.secs : 0,
    ]);
    expect(withLane.reads).toEqual([
      // The delay claims no colour dimension, so a lane on its mix carries none: the row's depth is
      // what the knob is set to, the way every dimension but the three colour ones is (0139, 0150).
      { lane: paramKey("fx1", "delay.mix"), instance: null, colour: [], song: false },
      { lane: null, instance: "fx1", colour: [], song: false },
      { lane: null, instance: null, colour: [], song: false },
      { lane: null, instance: null, colour: [], song: false },
    ]);
  });

  it("draws an instance at what it is set to, and two set alike alike", () => {
    // The delay declares its time into where its row is anchored, its feedback into the frame laid
    // back into this one and its mix into the depth the row cuts, so the picture moves with the
    // knobs rather than only with the rack's contents (0139, 0142, 0148).
    const slow = moireRows([], [instance("fx1", { params: { "delay.time": 1.8 } })], 0, PLAIN_CUT)
      .rows[0];
    const fast = moireRows([], [instance("fx1", { params: { "delay.time": 0.03 } })], 0, PLAIN_CUT)
      .rows[0];
    expect(slow?.centre).toBeGreaterThan((fast?.centre ?? 0) + 0.5);
    const loud = moireRows(
      [],
      [instance("fx1", { params: { "delay.feedback": 0.9 } })],
      0,
      PLAIN_CUT,
    ).rows[0];
    const quiet = moireRows(
      [],
      [instance("fx1", { params: { "delay.feedback": 0 } })],
      0,
      PLAIN_CUT,
    ).rows[0];
    // A repeat of what has already been heard is the frame before this one cut back into it, and
    // the whole of a knob's travel is the whole of the share the ceiling bounds (0143).
    expect(loud?.feedback).toBeCloseTo(DRIFT_FEEDBACK_REACH, 9);
    expect(quiet?.feedback).toBe(DRIFT_REST.feedback);
    // And its depth is its mix — how much of this effect is heard at all is how much of its own
    // depth its row cuts — so the pair above, both at the delay's own mix, agree in it (0148).
    expect(loud?.depth).toBe(quiet?.depth);
    const mixed = (heard: number) =>
      moireRows([], [instance("fx1", { params: { "delay.mix": heard } })], 0, PLAIN_CUT).rows[0];
    expect(mixed(0)?.depth).toBeCloseTo(DRIFT_DEPTH_FLOOR, 9);
    expect(mixed(1)?.depth).toBeCloseTo(DRIFT_REST.depth, 9);

    // Two instances of one effect set alike agree in everything their values reach, and differ
    // only in the identity the fold gives them — which for this entry is its angle, where in its
    // cycle it starts, and the period no value of a delay's claims (0142 moved its time onto the
    // anchor, an echo arriving from somewhere rather than every so often).
    const [one, two] = moireRows(
      [],
      [
        instance("fx1", { params: { "delay.time": 0.4 } }),
        instance("fx2", { params: { "delay.time": 0.4 } }),
      ],
      0,
      PLAIN_CUT,
    ).rows;
    expect({ ...one, shape: 0, period: 0 }).toEqual({ ...two, shape: 0, period: 0 });
    expect(one?.shape).not.toBe(two?.shape);
    expect(one?.period).not.toBe(two?.period);
  });

  it("keeps the fold for a dimension no value of the effect's reaches", () => {
    // The filter declares its cutoff into the sweep of its row's pitch and nothing else, so its
    // period is still the one its own id folds to and two of them still beat against each other.
    const rows = moireRows(
      [],
      [instance("fx1", { effect: "filter" }), instance("fx2", { effect: "filter" })],
      0,
      PLAIN_CUT,
    ).rows;
    expect(rows[0]?.period).toBe(effectRowPeriod(fold("fx1")));
    expect(rows[1]?.period).toBe(effectRowPeriod(fold("fx2")));
    expect(rows[0]?.bend).toBe(FLAT_BEND);
    expect(rows[0]?.depth).toBe(1);
    const wide = moireRows(
      [],
      [instance("fx1", { effect: "filter", params: { "filter.cutoff": 20_000 } })],
      0,
      PLAIN_CUT,
    ).rows[0];
    expect(wide?.chirp).not.toBe(rows[0]?.chirp);
    expect(wide?.pitch).toBe(DRIFT_REST.pitch);
    expect(wide?.period).toBe(rows[0]?.period);
  });

  it("leaves a bypassed instance out of the picture, and its lanes with it", () => {
    // What the rack skips is not in the signal path, so it is not on the screen either: neither
    // the instance's own row nor a lane riding one of its knobs (0139).
    const playing = instance("fx1", { automation: { "delay.mix": mix } });
    const skipped = instance("fx1", { bypassed: true, automation: { "delay.mix": mix } });
    expect(deckLanes({}, [playing])).toHaveLength(1);
    expect(deckLanes({}, [skipped])).toEqual([]);
    // A lane, the instance's own row, the loop, and the macro row on when the three come round.
    expect(moireRows(deckLanes({}, [playing]), [playing], 8, PLAIN_CUT).rows).toHaveLength(4);
    // The loop is still there — it belongs to the yard and not to the rack.
    const rows = moireRows(deckLanes({}, [skipped]), [skipped], 8, PLAIN_CUT).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reference).toBe(true);
    // And it comes back unchanged when the switch does, because nothing about a row is stored.
    expect(moireRows(deckLanes({}, [playing]), [playing], 8, PLAIN_CUT).rows).toEqual(
      moireRows(deckLanes({}, [playing]), [playing], 8, PLAIN_CUT).rows,
    );
  });

  // P104: a grating on when the whole yard lines up, which is a period the yard already knows and
  // no single knob owns — so the composition reorganises on it without any row in it moving
  // differently (0143).
  it("puts a grating on the whole yard coming round, and keeps it out of the yard's own periods", () => {
    const two = [instance("fx1", { effect: "filter" }), instance("fx2", { effect: "eq" })];
    const { rows, reads, periods, recurrence } = moireRows([], two, 8, PLAIN_CUT);
    // The periods are the yard's own three: the rows the macro one was measured from, and not the
    // macro row itself — the estimate beside the picture and the window the picture is drawn across
    // are both read off them, so a row the picture added to itself must not reach either.
    expect(periods).toHaveLength(3);
    expect(periods).toEqual(rows.slice(0, 3).map(({ period }) => period));
    // And the macro row is last, on the recurrence itself, belonging to nobody: no lane files its
    // phase, it is not the reference the others are read against, and it is the plainest row there
    // is along the straight axis, because it is not any effect doing anything.
    expect(rows).toHaveLength(4);
    const macro = rows[3];
    expect(macro?.period).toBe("secs" in recurrence ? recurrence.secs : 0);
    expect(macro?.period).toBeGreaterThan(Math.max(...periods));
    expect(periods).not.toContain(macro?.period);
    expect(reads[3]).toEqual({ lane: null, instance: null, colour: [], song: false });
    expect(macro?.reference).toBe(false);
    expect(macro?.profile).toBe(PLAIN_PROFILE);
    expect(macro?.geometry).toBe(LINEAR_GEOMETRY);
    expect(macro?.shape).not.toBe(0);
    // And a recurrence the picture is not wide enough to show coming round twice is left out: the
    // pitch every spacing is banded to makes it the same grating a much shorter one draws, and it
    // never moves, so it would be a line where the picture only draws bands (`MIN_ROW_CYCLES`).
    // The same rack over a one-second loop is that case — a shorter window, a longer recurrence.
    const tight = moireRows([], two, 1, PLAIN_CUT);
    expect("secs" in tight.recurrence && tight.recurrence.secs * MIN_ROW_CYCLES).toBeGreaterThan(
      tight.windowSecs,
    );
    expect(tight.rows).toHaveLength(3);
    expect(tight.rows.map(({ period }) => period)).toEqual(tight.periods);
    // A yard running on one period comes round on that period, so a macro row would be a second
    // copy of a row already in the picture: it is left out rather than drawn twice.
    const alone = moireRows([], [], 8, PLAIN_CUT);
    expect(alone.rows).toHaveLength(1);
    expect(alone.periods).toEqual([8]);
    // And a picture with nothing going round has nothing to come round.
    expect(moireRows([], [], 0, PLAIN_CUT).rows).toEqual([]);
  });

  // P105: the picture is of this sample. Two decoded sources cut the reference row two ways, and
  // the same source cuts it the same way twice — the whole of what "one file looks unlike another"
  // is, and the reason a picture may rest on analysis at all (0145).
  it("draws two sources two ways, and one source the same way twice", () => {
    const RATE = 48_000;
    const struck = analyzeBeats(
      [renderGen("click-train", { secs: 2, sampleRate: RATE, hz: 4 })],
      RATE,
    );
    const held = analyzeBeats([renderGen("sine", { secs: 2, sampleRate: RATE, hz: 220 })], RATE);
    // A struck source stands well above its own mean and a sustained one sits near it, which is
    // what chooses the wave; the onsets per second are what set the spacing.
    expect(struck.crest).toBeGreaterThan(held.crest);
    const one = moireRows([], [], 4, sourceCut(struck, 2));
    const other = moireRows([], [], 4, sourceCut(held, 2));
    expect(one.rows).toHaveLength(1);
    expect(one.rows[0]?.reference).toBe(true);
    expect(one.rows[0]?.profile).not.toBe(other.rows[0]?.profile);
    expect(one.rows[0]?.pitch).not.toBe(other.rows[0]?.pitch);
    expect(one.rows).not.toEqual(other.rows);
    // And the same source twice is the same picture: nothing here is stored, so this has to be a
    // function of the analysis and of nothing else.
    expect(one.rows).toEqual(moireRows([], [], 4, sourceCut(struck, 2)).rows);
    // A yard with nothing measured draws what the reference row drew before there was a source.
    const bare = moireRows([], [], 4, sourceCut(null, 0)).rows[0];
    expect(bare?.profile).toBe(PLAIN_PROFILE);
    expect(bare?.pitch).toBe(DRIFT_REST.pitch);
  });

  // 0150: the one thing about a row a lane moves. The dial travels under a lane and the picture's
  // colour travels with it, out of the phase `peek()` already files and the same `automationValueAt`
  // the knob beside it reads through (0035).
  it("carries an instance's colour where a lane is riding the knob that claims it", () => {
    const tone = [
      { at: 0, value: 200 },
      { at: 2, value: 16000 },
    ];
    const spec = PARAMS["tape.tone"];
    const parked = instance("fx1", { effect: "tape", params: { "tape.tone": 800 } });
    const { rows, reads } = moireRows(
      [],
      [instance("fx1", { effect: "tape", automation: { "tape.tone": tone } })],
      0,
      PLAIN_CUT,
    );
    const resting = moireRows([], [parked], 0, PLAIN_CUT).rows[0]?.hue;
    const row = rows[0];
    if (row === undefined || resting === undefined) throw new Error("the picture has no tape row");
    const key = paramKey("fx1", "tape.tone");
    const peek = emptyDeckPeek();

    // A lane the voice has not armed yet files no phase, and the row rests where the knob is: the
    // picture a yard draws before it is playing is the picture it drew with no lane at all.
    refillRows(rows, reads, peek, 1, 0);
    expect(row.hue).toBe(
      colourReached("hue", normalize(spec.default, spec.min, spec.max, spec.curve)),
    );

    // And once it is running, the row is where the lane has actually carried the parameter — the
    // same reading, so the picture and the dial cannot disagree.
    for (const at of [0, 1, 2]) {
      peek.automation.set(key, at);
      refillRows(rows, reads, peek, 1, 0);
      const value = automationValueAt(tone, at, spec.default);
      expect(row.hue).toBe(colourReached("hue", normalize(value, spec.min, spec.max, spec.curve)));
    }
    // Two ends of one gesture are two colours, and neither is where the knob alone would have put
    // this instance: the whole claim is that the travel is visible.
    peek.automation.set(key, 0);
    refillRows(rows, reads, peek, 1, 0);
    const dark = row.hue;
    peek.automation.set(key, 2);
    refillRows(rows, reads, peek, 1, 0);
    expect(row.hue).toBeGreaterThan(dark);
    expect(row.hue).not.toBe(resting);

    // Shape is not colour: what the lane's own knob does to the rest of the row is what the knob is
    // set to, and only the three colour dimensions follow a gesture (0139, 0150).
    expect(reads[0]?.colour.map(({ into }) => into)).toEqual(["hue"]);
  });

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
    expect(rows).toHaveLength(1);
    expect(reads).toEqual([{ lane: null, instance: null, colour: [], song: true }]);
    // The landing its dials say, which is one burst repeated the count it is set to.
    expect(row.period).toBe(spec.burst * spec.repeats);
    expect(row.reference).toBe(false);
    expect(row.profile).toBe(PLAIN_PROFILE);
    // Nothing standing yet: a pattern that is not running is not in a part, so the row rests where
    // a row nothing reaches rests and makes no claim on the picture's colour.
    refillRows(rows, reads, emptyDeckPeek(), 1, 0);
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
    peek.player.song = song;
    peek.player.part = one.id;
    const held: number[] = [];
    for (const position of [0, 0.1, 0.4, 0.9]) {
      peek.position = position;
      refillRows(rows, reads, peek, 1, 0);
      expect(row.shape).toBe(fold(one.id));
      expect(row.pitch).toBe(playerRowPitch(one));
      expect(row.hue).toBe(playerRowHue(one));
      held.push(row.phase);
    }
    expect(new Set(held).size).toBe(held.length);

    // The boundary, and the whole of what the picture shows of a song: another badge is another
    // angle and another place in the cycle, another length is another spacing, and a stepped
    // change is what has the strongest claim on the tint (0141).
    peek.player.part = two.id;
    refillRows(rows, reads, peek, 1, 0);
    expect(row.shape).not.toBe(fold(one.id));
    expect(row.pitch).not.toBe(playerRowPitch(one));
    expect(row.hue).not.toBe(playerRowHue(one));
    expect(row.pitch).toBeGreaterThan(playerRowPitch(one));
    expect(screenHue([row])).toBe(row.hue);

    // And the same part coming round again is the same field: nothing about a row is stored, so a
    // part is drawn out of its badge rather than out of how many boundaries have gone by.
    peek.player.part = one.id;
    refillRows(rows, reads, peek, 1, 0);
    expect(row.shape).toBe(fold(one.id));
    expect(row.pitch).toBe(playerRowPitch(one));
    expect(row.hue).toBe(playerRowHue(one));

    // A badge no arrangement holds is nobody standing: a cursor and a song that disagree leave the
    // row at its own rest rather than at whatever it last drew.
    peek.player.part = "a part this song does not hold";
    refillRows(rows, reads, peek, 1, 0);
    expect(row.shape).toBe(PLAYER_ROW_SHAPE);
    expect(row.hue).toBe(DRIFT_REST.hue);
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

  // P105: the meter-driven breath, at the seam the frame loop actually crosses — `peek()` carries
  // the readings beside the playhead, and `refillRows` writes them onto the rows the set was built
  // with. No React state, no second loop, no allocation (plan §2, 0070, 0128 amended).
  it("breathes an instance's row with its own meter, in place and off the one peek", () => {
    const { rows, reads } = moireRows([], [instance("fx1"), instance("fx2")], 4, PLAIN_CUT);
    const identity = [...rows];
    const rowAt = (at: number) => {
      const row = rows[at];
      if (row === undefined) throw new Error(`the picture has no row ${at}`);
      return row;
    };
    const peek = { ...emptyDeckPeek(), position: 1 };
    // Nothing metering anything: every row rests where its knobs put it, which is the picture the
    // drift drew before a reading could reach it.
    refillRows(rows, reads, peek, 1, 0);
    expect(rows.map(({ pulse }) => pulse)).toEqual([0, 0, 0]);
    expect(rows.map((row) => pulsedDepth(row))).toEqual(rows.map(({ depth }) => depth));
    // One instance pulling hard, the other not metered at all. Only the row of the instance the
    // reading came from moves, and it moves down, toward the floor a turned-down effect sits at.
    peek.meters.set("fx1", -DRIFT_PULSE_DB);
    refillRows(rows, reads, peek, 1, 0);
    expect(rows).toEqual(identity);
    expect(rows[0]?.pulse).toBe(1);
    expect(rows[1]?.pulse).toBe(0);
    expect(pulsedDepth(rowAt(0))).toBeCloseTo(DRIFT_DEPTH_FLOOR, 12);
    expect(pulsedDepth(rowAt(1))).toBe(rowAt(1).depth);
    // The reference row belongs to no instance, so no reading can reach it however loud it is.
    expect(rows[2]?.reference).toBe(true);
    expect(rows[2]?.pulse).toBe(0);
    // And a reading that goes away leaves the row where its knobs put it rather than latched.
    peek.meters.delete("fx1");
    refillRows(rows, reads, peek, 1, 0);
    expect(rows[0]?.pulse).toBe(0);
  });
});
