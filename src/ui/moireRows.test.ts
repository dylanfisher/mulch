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
import { effectById, type EffectId } from "@/audio/effects/registry";
import { PARAMS, paramKey } from "@/audio/params";
import { automationValueAt } from "@/lib/automation";
import { fold } from "@/lib/copy";
import { normalize } from "@/lib/range";
import { analyzeBeats } from "@/lib/analysis";
import { renderGen } from "@/lib/waveform";
import { emptyDeckPeek } from "@/audio/deckPeek";
import {
  colourReached,
  DRIFT_BROADEST_PITCH,
  DRIFT_DEPTH_FLOOR,
  DRIFT_DISPERSE_REACH,
  DRIFT_FEEDBACK_REACH,
  DRIFT_REST,
  EFFECT_ROW_PERIOD_SECS,
  effectRowPeriod,
  FLAT_BEND,
  laneBend,
  LINEAR_GEOMETRY,
  MIN_ROW_CYCLES,
  type MoireRow,
} from "@/lib/moire";
import { PLAIN_PROFILE } from "@/lib/moireProfiles";
import {
  DRIFT_HEARD_SHARE,
  DRIFT_PULSE_DB,
  DRIFT_WASH_SHARE,
  heardPitch,
  PLAIN_CUT,
  pulsedDepth,
  sourceCut,
  washAmount,
  washedDepth,
  WASH_CREST_SMEARED,
  WASH_CREST_STRUCK,
  type SourceCut,
} from "@/lib/moireSound";
import { crestFactor, peakMagnitude } from "@/lib/peaks";
import { screenDisperse } from "@/ui/moireScreen";
import type { SessionEffect } from "@/state/session";
import type { DeckState } from "@/state/store";
import type { BeatAnalysis } from "@/lib/analysis";
import type { DeckPeek } from "@/audio/deckPeek";
import type { GrownEffect } from "@/audio/effects/contract";
import type { Loop } from "@/lib/timeline";
import {
  deckLanes,
  grownNothing,
  grownStanding,
  moireRows as builtRows,
  NO_GROWN,
  refillRows as filledRows,
  type GrownRun,
  type MoireLane,
  type MoireRowSet,
  type RowRead,
} from "@/ui/moireRows";

/**
 * The one builder, with the jumps module's period defaulted to none and the run every automator is
 * holding defaulted to nothing. Every case here but the module's own and the run's own is about a
 * lane, an instance or the loop, and a yard that is neither jumping nor growing anything is what
 * each of them was written against — so an argument is named only where it is the subject.
 */
const moireRows = (
  lanes: readonly MoireLane[],
  effects: DeckState["effects"],
  loopPeriod: number,
  cut: SourceCut,
  playerPeriod: number | null = null,
  grown: GrownRun = NO_GROWN,
): MoireRowSet => builtRows(lanes, effects, loopPeriod, cut, playerPeriod, grown);

/**
 * The per-frame read with nothing measured behind it, which is what every case here but the
 * reference row's own is about: a yard whose source the analyser has not answered for draws the
 * cut the picture drew before there was one (0145, 0196).
 */
const refillRows = (
  rows: readonly MoireRow[],
  reads: readonly RowRead[],
  peek: Readonly<DeckPeek>,
  rate: number,
  loop: Loop | null,
  duration: number,
  analysis: BeatAnalysis | null = null,
): number => filledRows(rows, reads, peek, rate, loop, duration, analysis);

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
    bounds: {},
  };
};

const mix = [
  { at: 0, value: 0 },
  { at: 3, value: 1 },
];

/**
 * One effect an automator is holding, as the read hands it over — a place that has arrived, is
 * fully in, and has its whole life left. Nothing here is a session shape: a run is drawn from a
 * seed and never stored (0204), so this is a fixture of the *read* and not of the state.
 */
const place = (effect: EffectId, id: string, values: readonly number[] = []): GrownEffect => ({
  effect,
  instance: id,
  presence: 1,
  remain: 30,
  life: 30,
  values,
});

/** The run one automator instance is holding, keyed the way `DeckPeek.grown` keys it. */
const runOf = (id: string, ...grown: readonly GrownEffect[]): GrownRun => new Map([[id, grown]]);

/** One row of a picture, or a loud no: an index the picture does not hold is a broken fixture. */
const rowAt = (rows: readonly MoireRow[], at: number): MoireRow => {
  const row = rows.at(at);
  if (row === undefined) throw new Error(`the picture has no row ${at}`);
  return row;
};

/** One meter window, `fill` written across it — the shape the deck's own analyser hands over. */
const windowOf = (fill: (at: number) => number): Float32Array =>
  Float32Array.from({ length: 1024 }, (_, at) => fill(at));

/** How far apart the deepest and the shallowest of these cuts stand. */
const spread = (depths: readonly number[]): number => Math.max(...depths) - Math.min(...depths);

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
    expect(reads).toEqual([{ lane: null, instance: "fx1", colour: [], song: false, heard: null }]);
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
    // beside it, the loop is after them, the macro row on when the three of them line up comes
    // after that — a period the yard already knows and no knob owns (0143) — and the field's own
    // broad row, on the loop's period, is last of all (0213).
    const bent = instance("fx1", { automation: { "delay.mix": mix } });
    const withLane = moireRows(deckLanes({}, [bent]), [bent], 8, PLAIN_CUT);
    expect(withLane.periods).toEqual([3, rows[0]?.period, 8]);
    expect(withLane.rows.map((each) => each.period)).toEqual([
      ...withLane.periods,
      "secs" in withLane.recurrence ? withLane.recurrence.secs : 0,
      8,
    ]);
    expect(withLane.reads).toEqual([
      // The delay claims no colour dimension, so a lane on its mix carries none: the row's depth is
      // what the knob is set to, the way every dimension but the three colour ones is (0139, 0150).
      {
        lane: paramKey("fx1", "delay.mix"),
        instance: null,
        colour: [],
        song: false,
        heard: null,
      },
      { lane: null, instance: "fx1", colour: [], song: false, heard: null },
      // The reference row's own, which is the pitch the whole source rests it at: the one row a
      // per-frame read recuts out of what is sounding under the playhead (0196).
      { lane: null, instance: null, colour: [], song: false, heard: PLAIN_CUT.pitch },
      { lane: null, instance: null, colour: [], song: false, heard: null },
      // The macro row's and the field's own: neither is read for anything, because what moves the
      // wash row is the one reading that belongs to no row at all (0213).
      { lane: null, instance: null, colour: [], song: false, heard: null },
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
    // A lane, the instance's own row, the loop, the macro row on when the three come round, and
    // the field's own broad row over all of them (0213).
    expect(moireRows(deckLanes({}, [playing]), [playing], 8, PLAIN_CUT).rows).toHaveLength(5);
    // The loop is still there — it belongs to the yard and not to the rack.
    const rows = moireRows(deckLanes({}, [skipped]), [skipped], 8, PLAIN_CUT).rows;
    expect(rows).toHaveLength(2);
    expect(rows[0]?.reference).toBe(true);
    // And it comes back unchanged when the switch does, because nothing about a row is stored.
    expect(moireRows(deckLanes({}, [playing]), [playing], 8, PLAIN_CUT).rows).toEqual(
      moireRows(deckLanes({}, [playing]), [playing], 8, PLAIN_CUT).rows,
    );
  });

  /**
   * P145: what an automator has grown is in no session anyone can read (0204), so the picture has
   * to rest on the per-frame read the card's own rows already paint from — which 0145 permits
   * precisely because nothing about a picture is stored. Without this a run of six turning over
   * completely leaves the picture exactly as it was.
   */
  it("gives every effect an automator has grown a row of its own, cut to its own plugin", () => {
    const auto = instance("auto", { effect: "automator" });
    const none = moireRows([], [auto], 8, PLAIN_CUT).rows;
    const standing: readonly EffectId[] = ["delay", "reverb", "filter"];
    const three = moireRows(
      [],
      [auto],
      8,
      PLAIN_CUT,
      null,
      runOf("auto", ...standing.map((effect, at) => place(effect, `g${at}`))),
    ).rows;
    expect(three).toHaveLength(none.length + 3);
    // Each cut to its own plugin's wave and its own coordinate, so the picture says which plugins
    // are standing and not merely that something is — a delay's comb and a room's rings.
    // Straight after the automator's own row, which is the first row of all: they are pushed onto
    // the picture as its instance is drawn, before the loop and everything laid over it.
    const grown = three.slice(1, 1 + standing.length);
    expect(grown.map(({ profile }) => profile)).toEqual(
      standing.map((effect) => effectById(effect).drift),
    );
    expect(grown.map(({ geometry }) => geometry)).toEqual(
      standing.map((effect) => effectById(effect).geometry),
    );
    // Its identity is the fold of the id the run minted for it, the way a rack instance's is
    // (0076) — so two places of one entry are two rows and the same place is the same row.
    expect(grown.map(({ shape }) => shape)).toEqual([fold("g0"), fold("g1"), fold("g2")]);
    // And what it is *set* to comes off the run: a knob the automator drew low and the same knob
    // drawn high are two rows, exactly as two rack instances set differently are (0139).
    const reaching = (turn: number): MoireRow | undefined =>
      moireRows([], [auto], 8, PLAIN_CUT, null, runOf("auto", place("filter", "g1", [turn])))
        .rows[1];
    expect(reaching(0)?.chirp).not.toBe(reaching(1)?.chirp);
  });

  /**
   * The rows a picture has are a function of a population nothing stores, so the only way to
   * notice one turning over is to have looked at the last one — the ids and not the count, because
   * a place going as another arrives is a different picture of the same length.
   */
  it("knows a run it has already looked at from one that has moved", () => {
    const was = grownNothing();
    expect(grownStanding(was, NO_GROWN)).toBe(true);
    expect(grownStanding(was, runOf("auto", place("delay", "g1")))).toBe(false);
    expect(grownStanding(was, runOf("auto", place("delay", "g1")))).toBe(true);
    // The same length and a different population: one place gone and one arrived in a tick.
    expect(grownStanding(was, runOf("auto", place("delay", "g2")))).toBe(false);
    expect(grownStanding(was, runOf("auto", place("delay", "g2")))).toBe(true);
    // What a place is *doing* is not what it is: a fading place is the same row (0128).
    expect(grownStanding(was, runOf("auto", { ...place("delay", "g2"), presence: 0.1 }))).toBe(
      true,
    );
    // But where its knobs stand is: a run that wanders rewrites a standing place's draw in place,
    // and a row reaches through those values the way a rack instance's reaches through its own.
    expect(grownStanding(was, runOf("auto", place("delay", "g2", [0.25])))).toBe(false);
    expect(grownStanding(was, runOf("auto", place("delay", "g2", [0.25])))).toBe(true);
    expect(grownStanding(was, runOf("auto", place("delay", "g2", [0.75])))).toBe(false);
    expect(grownStanding(was, NO_GROWN)).toBe(false);
    expect(was.ids).toEqual([]);
    expect(was.draws).toEqual([]);
  });

  /**
   * 0208: an entry declares whether what it runs is drawn from a stream, and a yard holding one
   * has nothing to line up. Bypassed, it is running nothing, so the estimate comes back.
   */
  it("has no recurrence at all where the yard is running something drawn from a stream", () => {
    const auto = instance("auto", { effect: "automator" });
    expect(moireRows([], [auto], 8, PLAIN_CUT).recurrence).toEqual({ unbounded: true });
    // And the macro row goes with it: a grating on a period nothing comes round on is a lie. The
    // field's own row stays, on the loop's period — it is a wash over the picture and not an
    // estimate of anything (0213).
    expect(moireRows([], [auto], 8, PLAIN_CUT).rows.map(({ period }) => period)).toEqual([
      ...moireRows([], [auto], 8, PLAIN_CUT).periods,
      8,
    ]);
    // Switched off it is not running, exactly as its own row leaves the picture (0139).
    const off = moireRows(
      [],
      [instance("auto", { effect: "automator", bypassed: true })],
      8,
      PLAIN_CUT,
    );
    expect("secs" in off.recurrence).toBe(true);
    // A jumping yard is one by the same argument: its steps are drawn from a seed, and its row's
    // period is how often it steps rather than when it comes back (0089).
    expect(moireRows([], [], 8, PLAIN_CUT, 2).recurrence).toEqual({ unbounded: true });
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
    expect(rows).toHaveLength(5);
    const macro = rows[3];
    expect(macro?.period).toBe("secs" in recurrence ? recurrence.secs : 0);
    expect(macro?.period).toBeGreaterThan(Math.max(...periods));
    expect(periods).not.toContain(macro?.period);
    expect(reads[3]).toEqual({
      lane: null,
      instance: null,
      colour: [],
      song: false,
      heard: null,
    });
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
    expect(tight.rows).toHaveLength(4);
    expect(tight.rows.map(({ period }) => period)).toEqual([...tight.periods, 1]);
    // A yard running on one period comes round on that period, so a macro row would be a second
    // copy of a row already in the picture: it is left out rather than drawn twice.
    const alone = moireRows([], [], 8, PLAIN_CUT);
    expect(alone.rows).toHaveLength(2);
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
    // The reference row, and the field's own broad row over it (0213).
    expect(one.rows).toHaveLength(2);
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

  /**
   * 0196: and the reference row is recut, once a painting, from the stretch of source actually
   * sounding — so a mulcher that has moved the loop to a busy passage of a file draws a finer row
   * than the same yard reading a sparse one, and two grounds in one file are two pictures. Before
   * this the row said the same thing wherever the ground had crawled to, which is exactly the
   * difference a bed is supposed to make (0185, 0191).
   */
  it("recuts the reference row from the stretch of source the yard is reading", () => {
    const RATE = 48_000;
    // One file, busy at the top and sparse at the end: the same source at two grounds, which is
    // what a bed move is.
    const dense = renderGen("click-train", { secs: 6, sampleRate: RATE, hz: 8 });
    const sparse = renderGen("click-train", { secs: 6, sampleRate: RATE, hz: 1 });
    const whole = new Float32Array(dense.length + sparse.length);
    whole.set(dense, 0);
    whole.set(sparse, dense.length);
    const analysis = analyzeBeats([whole], RATE);
    const secs = 12;
    const cut = sourceCut(analysis, secs);
    const { rows, reads } = moireRows([], [], 4, cut);
    const reference = rows[0];
    if (reference === undefined) throw new Error("the picture has no reference row");
    const at = (position: number): number => {
      refillRows(rows, reads, { ...emptyDeckPeek(), position }, 1, null, secs, analysis);
      return reference.pitch;
    };
    // Busy is finer: a smaller spacing, which is the direction `sourceCut` reads a dense file in.
    expect(at(2)).toBeLessThan(at(10));
    // And both are the same answer the maths gives on its own, resting at the whole file's cut
    // where there is nothing to read instead.
    expect(at(2)).toBe(heardPitch(analysis, secs, 2, cut.pitch));
    expect(heardPitch(null, secs, 2, cut.pitch)).toBe(cut.pitch);
    expect(heardPitch(analysis, 0, 2, cut.pitch)).toBe(cut.pitch);
    // The deck's own level is the other half: silence draws the row at the shallowest the share
    // allows and full level draws it as deep as its rest, and nothing may drive it deeper (0128).
    refillRows(rows, reads, { ...emptyDeckPeek(), meter: 1 }, 1, null, secs, analysis);
    expect(reference.pulse).toBe(0);
    expect(pulsedDepth(reference)).toBe(reference.depth);
    refillRows(rows, reads, { ...emptyDeckPeek(), meter: 0 }, 1, null, secs, analysis);
    expect(reference.pulse).toBe(DRIFT_HEARD_SHARE);
    expect(pulsedDepth(reference)).toBeLessThan(reference.depth);
    expect(pulsedDepth(reference)).toBeGreaterThan(DRIFT_DEPTH_FLOOR);
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
    refillRows(rows, reads, peek, 1, null, 0);
    expect(row.hue).toBe(
      colourReached("hue", normalize(spec.default, spec.min, spec.max, spec.curve)),
    );

    // And once it is running, the row is where the lane has actually carried the parameter — the
    // same reading, so the picture and the dial cannot disagree.
    for (const at of [0, 1, 2]) {
      peek.automation.set(key, at);
      refillRows(rows, reads, peek, 1, null, 0);
      const value = automationValueAt(tone, at, spec.default);
      expect(row.hue).toBe(colourReached("hue", normalize(value, spec.min, spec.max, spec.curve)));
    }
    // Two ends of one gesture are two colours, and neither is where the knob alone would have put
    // this instance: the whole claim is that the travel is visible.
    peek.automation.set(key, 0);
    refillRows(rows, reads, peek, 1, null, 0);
    const dark = row.hue;
    peek.automation.set(key, 2);
    refillRows(rows, reads, peek, 1, null, 0);
    expect(row.hue).toBeGreaterThan(dark);
    expect(row.hue).not.toBe(resting);

    // Shape is not colour: what the lane's own knob does to the rest of the row is what the knob is
    // set to, and only the three colour dimensions follow a gesture (0139, 0150).
    expect(reads[0]?.colour.map(({ into }) => into)).toEqual(["hue"]);
  });

  // P105: the meter-driven breath, at the seam the frame loop actually crosses — `peek()` carries
  // the readings beside the playhead, and `refillRows` writes them onto the rows the set was built
  // with. No React state, no second loop, no allocation (plan §2, 0070, 0128 amended).
  it("breathes an instance's row with its own meter, in place and off the one peek", () => {
    const { rows, reads } = moireRows([], [instance("fx1"), instance("fx2")], 4, PLAIN_CUT);
    const identity = [...rows];
    const peek = { ...emptyDeckPeek(), position: 1 };
    // Nothing metering anything: every row rests where its knobs put it, which is the picture the
    // drift drew before a reading could reach it.
    refillRows(rows, reads, peek, 1, null, 0);
    // The two instance rows rest; the reference row is the one row a *deck's* own level reaches,
    // and a peek reading silence draws it at the shallowest the share allows (0196).
    // The field's own row is last and pulses at nothing: what moves it is the wash, which no row
    // carries (0213).
    expect(rows.map(({ pulse }) => pulse)).toEqual([0, 0, DRIFT_HEARD_SHARE, 0]);
    expect(rows.slice(0, 2).map((row) => pulsedDepth(row))).toEqual(
      rows.slice(0, 2).map(({ depth }) => depth),
    );
    // One instance pulling hard, the other not metered at all. Only the row of the instance the
    // reading came from moves, and it moves down, toward the floor a turned-down effect sits at.
    peek.meters.set("fx1", -DRIFT_PULSE_DB);
    refillRows(rows, reads, peek, 1, null, 0);
    expect(rows).toEqual(identity);
    expect(rows[0]?.pulse).toBe(1);
    expect(rows[1]?.pulse).toBe(0);
    expect(pulsedDepth(rowAt(rows, 0))).toBeCloseTo(DRIFT_DEPTH_FLOOR, 12);
    expect(pulsedDepth(rowAt(rows, 1))).toBe(rowAt(rows, 1).depth);
    // The reference row belongs to no instance, so no *effect's* reading reaches it however loud
    // it is: what moves it is the deck's own level, which this peek is still reading as silence.
    expect(rows[2]?.reference).toBe(true);
    expect(rows[2]?.pulse).toBe(DRIFT_HEARD_SHARE);
    // And a reading that goes away leaves the row where its knobs put it rather than latched.
    peek.meters.delete("fx1");
    refillRows(rows, reads, peek, 1, null, 0);
    expect(rows[0]?.pulse).toBe(0);
  });

  /**
   * P146: a yard that has been smeared looks much like one that has not, because every motion in
   * the picture is a knob position or one instance's own meter. What "washed" is, measurably, is
   * the crest of the output window — its peak over its RMS — which falls as reverb, delay and
   * saturation fill the gaps between the transients (0213).
   */
  it("reads a struck window as no wash and a smeared one as a wash, and silence as neither", () => {
    // A struck window: one hit with room either side of it, which is a peak far above the window's
    // own power and the picture drawn before there was a wash in it.
    const struck = windowOf((at) => (at < 4 ? 1 : 0));
    expect(crestFactor(struck)).toBeGreaterThan(WASH_CREST_STRUCK);
    expect(washAmount(crestFactor(struck), 1)).toBe(0);
    // A smeared one: a held tone has no gaps left to fill, so its peak stands √2 above its RMS and
    // the picture reads it as washed through.
    const smeared = windowOf((at) => Math.sin((at / 1024) * 64 * Math.PI));
    expect(crestFactor(smeared)).toBeLessThan(WASH_CREST_SMEARED);
    expect(washAmount(crestFactor(smeared), 1)).toBe(1);
    // And a tail between the two reads between the two: a sixteenth of the window standing at full
    // scale is a crest of four, which is neither struck nor smeared.
    const tail = windowOf((at) => (at % 16 === 0 ? 1 : 0));
    expect(crestFactor(tail)).toBeCloseTo(4, 6);
    const between = washAmount(crestFactor(tail), 1);
    expect(between).toBeGreaterThan(0);
    expect(between).toBeLessThan(1);
    // Silence is not a wash, and it is silence in both of the ways a window can be. A window with
    // nothing in it has no crest to report — the same sentinel the source's own analysis uses for
    // "measured nothing" — and it draws no wash at all rather than the deepest one (0145).
    expect(crestFactor(windowOf(() => 0))).toBe(0);
    expect(washAmount(0, 1)).toBe(0);
    // And a crest knows nothing about how loud its window was: a noise floor nobody can hear has
    // the crest of a held tone, so the level beside it is what says there is nothing to wash.
    const floor = windowOf((at) => 1e-6 * Math.sin((at / 1024) * 64 * Math.PI));
    expect(crestFactor(floor)).toBeLessThan(WASH_CREST_SMEARED);
    expect(washAmount(crestFactor(floor), peakMagnitude(floor))).toBe(0);
    expect(washAmount(crestFactor(smeared), peakMagnitude(smeared))).toBe(1);
    // Bounded at both ends, whatever a window hands over: a picture the reading could push past
    // either end would be a reading deciding what the knobs are allowed to say.
    for (const crest of [0.5, 1, 1.5, 3, 8, 40, 1e6, Number.POSITIVE_INFINITY, Number.NaN]) {
      expect(washAmount(crest, 1)).toBeGreaterThanOrEqual(0);
      expect(washAmount(crest, 1)).toBeLessThanOrEqual(1);
    }
  });

  /**
   * And what the wash does to the picture: the rows stop being separable. Depth and disperse rise
   * together across every row at once, and one broad slow row is laid over the whole field at the
   * loop's own period — a larger moiré over the small ones, which is a picture blending rather than
   * a picture with one more thing in it. The reading belongs to the field and to no row: an output
   * has no item to belong to, where every other reading the picture takes is one item's own meter
   * (0128, 0213).
   */
  it("lays the field's own row over the picture and rises every row with the wash", () => {
    const { rows, reads } = moireRows([], [instance("fx1")], 4, PLAIN_CUT);
    const field = rowAt(rows, -1);
    // Last of all, on the loop's own period, at the coarse end of the band every row is drawn in —
    // so what it makes with the rest is a larger moiré and not a second hatch among them.
    expect(field.period).toBe(4);
    expect(field.pitch).toBe(DRIFT_BROADEST_PITCH);
    expect(field.reference).toBe(false);
    // And it cuts nothing at all until the yard is washed: a dry yard draws exactly the picture it
    // drew before there was a reading of its output.
    expect(field.depth).toBe(0);
    expect(washedDepth(rowAt(rows, 0), 0)).toBe(pulsedDepth(rowAt(rows, 0)));
    expect(washedDepth(field, 0)).toBe(0);

    const peek = { ...emptyDeckPeek(), position: 1, meter: 1 };
    // The reading arrives beside the meters on the one peek, in the unit it was measured in, and is
    // answered rather than written onto a row, because there is no row it belongs to.
    peek.crest = crestFactor(windowOf((at) => (at < 4 ? 1 : 0)));
    expect(refillRows(rows, reads, peek, 1, null, 0)).toBe(0);
    peek.crest = WASH_CREST_SMEARED;
    const wash = refillRows(rows, reads, peek, 1, null, 0);
    expect(wash).toBe(1);
    // Every row rises by the same share of what it had left, so the deepest and the shallowest
    // close on each other: that is the field becoming less separable rather than one row moving.
    const dry = rows.map((row) => pulsedDepth(row));
    const wet = rows.map((row) => washedDepth(row, wash));
    expect(wet).toEqual(dry.map((depth) => depth + (1 - depth) * DRIFT_WASH_SHARE));
    expect(wet.every((depth, at) => depth >= (dry[at] ?? 0))).toBe(true);
    // The field's own row is the one that had everything left to rise: it cuts half a picture at a
    // full wash, and nothing at all without one.
    expect(washedDepth(field, wash)).toBe(DRIFT_WASH_SHARE);
    expect(spread(wet)).toBeLessThan(spread(dry));
    // And the screen's three lattices diverge with them, on the one number, so the picture blends
    // in colour exactly as far as it blends in depth.
    expect(screenDisperse(rows, wash)).toBeGreaterThan(screenDisperse(rows, 0));
    expect(screenDisperse(rows, wash)).toBeLessThanOrEqual(DRIFT_DISPERSE_REACH);
    // Nothing about the reading is stored: the read wrote no depth onto any row, so a wash of
    // nothing is the picture the set was built with, whatever it has just been drawn under.
    expect(rows.map((row) => washedDepth(row, 0))).toEqual(dry);
    expect(field.depth).toBe(0);
  });
});
