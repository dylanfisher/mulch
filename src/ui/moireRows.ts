/**
 * @role What a yard's drift is made of before anything draws it: one row per lane it is running,
 *   one per instance its rack is playing and one per effect those instances have grown, one per
 *   tier of the arrangement its jumps module is walking and one for its loop — and, for
 *   an instance, how the values it is set to reach that row through the dimensions its registry
 *   entry declared, the three that are colour following the lane where one is riding the knob that
 *   claims them (0150), and for the module where in the two tiers the walk is standing right
 *   now — and the per-frame read that fills every row in the picture, this yard's and the field's
 *   alike. Pure of React and of the canvas, so the rows a yard makes are read without rendering one.
 * @instead The rows that belong to the whole field rather than to anything on the yard — the loop's
 *   own, the macro row, the wash and the session's — and the shape of the read itself →
 *   src/ui/moireRowsField.ts. The picture, its two sizes and the frame loop → src/ui/MoireStrip.tsx.
 *   What a row means, and the window the rows are drawn across → src/lib/moire.ts; the estimate of
 *   when they all line up → src/lib/recurrence.ts. Drawing them → src/ui/moireCanvas.ts.
 */
// Over the soft cap and well under the hard one: one builder per kind of row plus the one read that
// refills them all, and they must stay index-for-index — which is why the field's rows and the
// module's already left for files of their own rather than this being cut anywhere else (0045). See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
// Two imports over the cap. One is the per-frame read this file now performs: the shape `peek()`
// fills, which is where a lane's phase and an instance's meter both arrive (P105). The other is the
// word for a tier of an arrangement, which a row of one is keyed by and which is named once (P161).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import {
  DECK_AUTOMATION_PARAM_IDS,
  effectAutomationParamIds,
  paramIn,
  PARAMS,
  paramKey,
} from "@/audio/params";
import { effectById } from "@/audio/effects/registry";
import { driftCut, grownInto, type GrownRun } from "@/ui/moireGrown";
import { onGround } from "@/ui/moireCarry";
import { DRIFT_INK_SECS, inkTravelInto, screenInkRest } from "@/ui/moireScreen";
import { rackShape, shapeRest } from "@/ui/moireShape";
import { rackShatter } from "@/ui/moireShatter";
import { rackWind, windRest } from "@/ui/moireWind";
import {
  DRIFT_JOLT_SECS,
  joltHeard,
  joltInto,
  joltRest,
  joltWalked,
  type MoireJolt,
} from "@/ui/moireJolt";
import { automationValueAt, laneSpan } from "@/lib/automation";
import { fold } from "@/lib/copy";
import {
  colourReached,
  driftedCentre,
  driftReached,
  DRIFT_REST,
  easedCentre,
  restingCentre,
  turnsOf,
  laneBend,
  LINEAR_GEOMETRY,
  wrap,
  type DriftGeometry,
  type DriftReach,
  type MoireRow,
  type ScreenInk,
} from "@/lib/moire";
import { agedPitch } from "@/lib/moireAge";
import { arrivedInto, DRIFT_ARRIVAL_SECS } from "@/lib/moireArrival";
import { shareOctaves, spreadOctaves } from "@/lib/moireOctaves";
import {
  fractalShape,
  fractalStopsInto,
  fractalStopsRest,
  fractalTravelInto,
  fractalTravelSecs,
  runStanding,
  type FractalStops,
} from "@/lib/moireFractal";
import { PLAIN_PROFILE, type DriftProfile } from "@/lib/moireProfiles";
import {
  heardPitch,
  heardPulse,
  heardLevel,
  heardShape,
  heardTilt,
  meterPulse,
  washAmount,
  type SourceCut,
} from "@/lib/moireSound";
import {
  loopStand,
  playerGroundSecs,
  playerRow,
  playerRowStand,
  playerTierInto,
  playerTierRow,
} from "@/lib/playerDrift";
import { normalize } from "@/lib/range";
import {
  isColour,
  laneRead,
  macroInto,
  fractalHeard,
  READS_NOTHING,
  ROW_KEYS,
  referenceInto,
  fractalInto,
  sessionInto,
  washInto,
  type ColourRead,
  type MoireRowSet,
  type RowRead,
} from "@/ui/moireRowsField";
import type { MasterPeek } from "@/app/facade";
import type { BeatAnalysis } from "@/lib/analysis";
import type { DeckPeek, PlayerPeek } from "@/audio/deckPeek";
import type { Loop } from "@/lib/timeline";
import type { SongPart } from "@/lib/playerSong";
import type { DeckState } from "@/state/store";
// oxlint-enable import/max-dependencies

/**
 * One lane as a row: the key `peek()` files its phase under, the period it repeats on, the
 * waveform its parameter draws it with, its own gesture across one cycle, and the profile the
 * effect it belongs to declared. The middle two are what keep two lanes of the same period on
 * different parameters from drawing the same row; the last is what says which kind of thing the
 * knob is on.
 */
export type MoireLane = {
  key: string;
  period: number;
  shape: number;
  bend: readonly number[];
  profile: DriftProfile;
  geometry: DriftGeometry;
};

/**
 * Every lane this deck is actually running — its own and every rack instance's — each with the
 * period `laneSpan` reports for it, which P53 made something a gesture edits (0079). A lane that
 * never moved has no period and is not a row: an unmoving line is not drift.
 */
export function deckLanes(
  automation: DeckState["automation"],
  effects: DeckState["effects"],
): MoireLane[] {
  const lanes: MoireLane[] = [];
  for (const param of DECK_AUTOMATION_PARAM_IDS) {
    const lane = automation[param];
    if (lane === undefined || laneSpan(lane) <= 0) continue;
    lanes.push({
      key: paramKey(null, param),
      period: laneSpan(lane),
      // The parameter and not the key: a row's shape says which knob is drifting, so the same
      // knob on two rack instances reads as the same kind of row and their gestures separate them.
      shape: fold(param),
      bend: laneBend(lane),
      // A deck's own knob belongs to no effect, so it is cut to the plain grating the loop is,
      // along the straight axis every row was cut along before an effect could bend one.
      profile: PLAIN_PROFILE,
      geometry: LINEAR_GEOMETRY,
    });
  }
  for (const instance of effects) {
    // What the rack skips (src/audio/effects/rack.ts) is not in the signal path, so neither its
    // own row nor any lane riding it is in the picture: a bypassed instance is a sound nobody can
    // hear (0139). It leaves while the switch is off and comes back unchanged when it is on,
    // because nothing about a row is stored.
    if (instance.bypassed) continue;
    for (const param of effectAutomationParamIds(instance.effect)) {
      const lane = instance.automation[param];
      if (lane === undefined || laneSpan(lane) <= 0) continue;
      lanes.push({
        key: paramKey(instance.id, param),
        period: laneSpan(lane),
        shape: fold(param),
        bend: laneBend(lane),
        // A lane on an effect's knob is that effect doing something, so it is cut the way the
        // instance's own row below is: to the profile and coordinate the registry entry declares.
        ...driftCut(instance.effect),
      });
    }
  }
  return lanes;
}

/**
 * Where each value an instance's registry entry declared a way into the picture for stands in its
 * own range, as a turn on 0..1 — what `driftReached` folds into the row. Read off the value the
 * session holds rather than off a lane: a knob at rest still says what its effect is doing, and a
 * lane on that knob goes on bending the row it already bends (0139). Where a lane rides a knob that
 * claims one of the three colour dimensions, `colourReads` below carries that one live (0150).
 */
export function effectReach(instance: DeckState["effects"][number]): DriftReach[] {
  return effectById(instance.effect).driftFrom.map(({ param, into }) => {
    const spec = PARAMS[param];
    return {
      into,
      turn: normalize(paramIn(instance.params, param), spec.min, spec.max, spec.curve),
    };
  });
}

/**
 * The colour dimensions of an instance's row that follow a lane rather than resting where the knob
 * is parked. Only the three: a lane's own row already says the gesture is there, and what a knob
 * under it is doing to the *shape* of the picture is what it is set to (0139). Colour is the one
 * thing a lane may carry, because the dial travels and the picture must travel with it (0150).
 *
 * A lane that never moved is not one: an unmoving line drives nothing, which is the same test
 * `deckLanes` opens with.
 */
export function colourReads(instance: DeckState["effects"][number]): ColourRead[] {
  const reads: ColourRead[] = [];
  const reach = effectById(instance.effect).driftFrom;
  for (const param of effectAutomationParamIds(instance.effect)) {
    const lane = instance.automation[param];
    if (lane === undefined || laneSpan(lane) <= 0) continue;
    const into = reach.find((each) => each.param === param)?.into;
    if (into === undefined || !isColour(into)) continue;
    reads.push({
      into,
      key: paramKey(instance.id, param),
      lane,
      base: paramIn(instance.params, param),
      spec: PARAMS[param],
    });
  }
  return reads;
}

/**
 * Which part of the song being walked is standing, as the part itself rather than as its badge.
 * The one thing the module's row is read off besides the session (0158): a drawn song is a run
 * nothing stores, so the arrangement in force is the cursor's to say and this reads it there rather
 * than deriving a second. A loop rather than `find`, because this is on the frame path and a
 * closure per row per frame is an allocation (0070); a song holds at most `PLAYER_SONG_MAX`.
 */
function standingPart(peek: Readonly<PlayerPeek>): SongPart | null {
  const step = peek.step;
  if (step === null) return null;
  const { part, song } = step;
  if (part === null || song === null) return null;
  for (const each of song) if (each.id === part) return each;
  return null;
}

/**
 * How long this picture takes to travel a whole ground move, in real seconds — and nought on a
 * picture that holds no jumps row, which is a yard whose ground cannot move at all.
 *
 * Read off the module's own row rather than refolded from the spec: the landing every tier of the
 * module steps against *is* that row's period (`playerRowPeriod`), the per-frame read has the row in
 * hand and the peek carries no spec, so asking the row is the one place the number can come from
 * without a second author of it (principle 1). A loop like `standingPart` above for the reason that
 * one is a loop: this walk allocates nothing.
 */
function groundTravel(
  rows: readonly MoireRow[],
  reads: readonly RowRead[],
  sounding: boolean,
): number {
  for (let index = 0; index < reads.length; index += 1) {
    const read = reads[index];
    if (read === undefined || read.tier === null) continue;
    return playerGroundSecs(rows[index]?.period ?? 0);
  }
  // A yard jumping nowhere still has a ground — its loop (`loopStand`, 0274) — and the one length
  // that ground's own move can be a fraction of is the loop, which is the reference row's period:
  // a loop nudged a beat along slides and one dragged across the file sweeps, and both are over
  // inside the loop they are about. Only while the yard sounds, for the ink's reason below: a
  // halted picture is painted on a commit and never on a frame (0144), so a loop moved on a
  // stopped yard arrives outright rather than stranding the field mid-travel.
  if (!sounding) return 0;
  for (let index = 0; index < reads.length; index += 1) {
    const read = reads[index];
    if (read === undefined || read.heard === null) continue;
    return playerGroundSecs(rows[index]?.period ?? 0);
  }
  return 0;
}

/**
 * And how long it takes to travel a whole move of its own structure: a fraction of the window the
 * fractal rows are drawn across, which is those rows' own period. Read off the row for the reason
 * `groundTravel` reads the module's — the window is a fact the set already holds and asking the row
 * for it is the one place the number can come from without a second author (principle 1) — and
 * nought on a picture with no fractal row, which is a rack holding no automator (`fractalTravelSecs`,
 * `fractalInto`; a rack holding one that is standing nothing has the rows and travels, 0249).
 */
function fractalTravel(rows: readonly MoireRow[], reads: readonly RowRead[]): number {
  for (let index = 0; index < reads.length; index += 1) {
    const read = reads[index];
    if (read === undefined || !read.fractal) continue;
    return fractalTravelSecs(rows[index]?.period ?? 0);
  }
  return 0;
}

/**
 * The picture's rows at their own zero, and beside them where each one's two per-frame numbers are
 * read from. Only `phase` and `pulse` move after this.
 *
 * Every lane carries its own identity, the waveform its parameter draws and its own bend. Every
 * instance the rack is playing carries a row too, whether or not anything is automating it: its
 * identity is folded out of its own id the way its name already is (0076), and the rest of it —
 * how long it runs, how deep it cuts, how fine it is drawn, how far it breathes — is what the
 * effect is set to, through the dimensions its registry entry declared (0139). A bypassed instance
 * carries none: what nobody can hear is not in the picture. And every effect an instance has *grown*
 * carries one too, out of the per-frame read rather than out of the session, because that is the
 * only place a run exists at all (`grownInto`, 0204). The loop belongs to no parameter, so
 * bends nothing: it is the reference the others are read against, not another gesture. What it is
 * cut to and how fine it is drawn are the source's, out of the clip's own analysis — so a yard
 * playing one file and a yard playing another draw two pictures through one rack (0145).
 *
 * The jumps module carries one too wherever the yard is actually jumping, because the thing that
 * moves where the deck reads from is not something the picture may be silent about. Its period is
 * the landing its dials say and its identity, its spacing, its tint, its wave and the coordinate it
 * is cut along are the part of its song
 * standing right now — the one row in the picture that moves in steps, which is what a song is
 * (`src/lib/playerDrift.ts`, 0157).
 *
 * Then, and only where the yard has one the picture can show, the macro row: a grating on
 * the recurrence of every other row, which is the one period in the picture no knob owns (0143). It
 * is returned beside the periods it was built from, the recurrence it was built out of and the
 * window it has to come round inside, so the estimate beside the picture and the window the picture
 * is drawn across are read off the yard rather than off a row the picture added to itself.
 *
 * Last of all, the field's own two: the wash over the yard, and the session's, which is the one row
 * here that is nobody's yard — the same layer in every picture, on the session's own clock where
 * one is held (`washInto`, `sessionInto`, src/ui/moireRowsField.ts, 0213).
 */
// One pass over the four kinds of row a picture holds — lanes, rack instances, the jumps module
// and the loop — each a push and its read. Splitting it hands `rows` and `reads` between helpers
// that must stay index-for-index. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function moireRows(
  lanes: readonly MoireLane[],
  effects: DeckState["effects"],
  loopPeriod: number,
  cut: SourceCut,
  playerPeriod: number | null,
  grown: GrownRun,
  sync: number | null,
): MoireRowSet {
  const rows: MoireRow[] = lanes.map(({ period, shape, bend, profile, geometry }) => ({
    period,
    phase: 0,
    pulse: 0,
    arrival: 1,
    reference: false,
    shape,
    bend,
    profile,
    geometry,
    ...DRIFT_REST,
  }));
  const reads: RowRead[] = lanes.map(({ key }) => laneRead(key));
  for (const instance of effects) {
    if (instance.bypassed) continue;
    // The fold is still the row's identity — its angle and where in its cycle it starts — and what
    // the effect is set to is the rest of it, through the dimensions its registry entry declared.
    const seed = fold(instance.id);
    const drawn = driftCut(instance.effect);
    const reach = effectReach(instance);
    rows.push({
      ...driftReached(seed, reach, drawn.geometry),
      phase: 0,
      pulse: 0,
      arrival: 1,
      reference: false,
      shape: seed,
      ...drawn,
    });
    // Its own row is the one thing an instance's meter may move, so this is where the id is kept.
    // A lane riding the same instance keeps none: what a lane draws is the gesture (0128). And the
    // rest its anchor is carried around, on every row whose anchor is its own fold's rather than a
    // knob's (`restingCentre`, 0229).
    reads.push({
      ...READS_NOTHING,
      key: `${ROW_KEYS.rack}${instance.id}`,
      instance: instance.id,
      colour: colourReads(instance),
      anchor: restingCentre(seed, drawn.geometry, reach),
    });
    grownInto(rows, reads, grown.get(instance.id));
  }
  playerInto(rows, reads, playerPeriod);
  referenceInto(rows, reads, loopPeriod, cut);
  // Nothing in the picture lines up again where something in the yard is drawing from a stream
  // rather than repeating: a grown run, and a jumping pattern by the same argument — its steps are
  // drawn from a seed and its row's period is how often it *steps*, never when it comes back
  // (0080, 0089, 0208).
  const unbounded =
    playerPeriod !== null ||
    effects.some((instance) => !instance.bypassed && effectById(instance.effect).grows === true);
  const macro = macroInto(rows, reads, loopPeriod, unbounded);
  washInto(rows, reads, loopPeriod);
  sessionInto(rows, reads, loopPeriod, sync);
  // Then the whole picture is drawn at the scales the rack standing earns — every straight row and
  // not the automator's own alone, which is what makes a run look self-similar rather than deep in
  // one corner (`spreadOctaves`, 0244). Off the same summed presence the support reads, so one run
  // drives both (`runStanding`).
  spreadOctaves(rows, runStanding(grown));
  // And the one row whose axis is what that run is standing rather than what any of it is set to:
  // the picture's own structure, cut as a grating so every other row beats against it (0131, 0246).
  // After the octaves, because it is not one of the straight rows they are spread over.
  fractalInto(rows, reads, macro.windowSecs, grown);
  // Last, because it is the whole set's bound and not any one row's: every copy past the first is
  // a fill of its own, and how many rows there are to ask for one is not something a per-row reach
  // can hold (`shareOctaves`, 0144).
  shareOctaves(rows);
  // And where that structure stands on the plane, which is the field's and no row's: at rest, with
  // the place this population folds to filled once beside it. The travel between the two is the
  // read's, and a set built on a population that has already moved starts from wherever the picture
  // it replaces had got to (`carryFractal`, 0248).
  const stops = fractalStopsRest();
  const toward = fractalStopsRest();
  fractalStopsInto(toward, fractalShape(grown));
  // And where the picture's ink stands: at rest, travelled from there by the read and carried onto
  // whatever set replaces this one (`carryInk`).
  //
  // And what the rack standing behind all of it is doing to the whole field: how long it takes to
  // fall silent and which way that blows. Read here and never on a frame, because it is a fact
  // about what the entries are *set to* and a rebuild is what a durable move already is
  // (`rackWind`, src/ui/moireWind.ts). Where the wind has actually blown to is the read's, and it
  // is carried onto whatever set replaces this one, exactly as the ink is (`carryWind`).
  const blowing = rackWind(effects);
  // And how much of that same rack is scatter, which is the other thing it does to the whole field:
  // read here for the same reason and off the same standing population, in a pass of its own —
  // where the wind's two numbers are two readings of one tail, this is a reading of a different
  // fact, and folding it into that pass would be one loop answering two questions (`rackShatter`,
  // src/ui/moireShatter.ts).
  return {
    rows,
    reads,
    wash: 0,
    age: 0,
    sounding: 0,
    seed: stops,
    toward,
    ink: screenInkRest(),
    tail: blowing.tail,
    veering: blowing.veering,
    wind: windRest(),
    jolt: joltRest(),
    shatter: rackShatter(effects),
    // And how it shapes the whole field, read the same way and for the same reason, in a pass of
    // its own: a third fact about the same population (`rackShape`, src/ui/moireShape.ts).
    shaping: rackShape(effects),
    shape: shapeRest(),
    ...macro,
  };
}

/**
 * The per-frame read, and the whole of it: every row's phase, every row's pulse, the identity each
 * of the module's two rows takes from the tier of the arrangement it draws, the four other things
 * the part's own row takes from the part standing, and the identity and the anchor the reference
 * row and the wash over it take from the ground the pattern is reading on, and the depth and the
 * spacing the session's own row takes from the master bus — all written into the
 * rows the set was built with. Enters no React
 * state and is called from the one frame loop through the drift's own cadence (plan §2, 0070,
 * 0144).
 *
 * The loop and the source's length are taken whole rather than as the loop's in-point alone,
 * because the ground is an offset in the loop's own sixteenths folded onto the room the file has
 * either side of it (0185): the anchor needs the span and the duration the fold is against, and so
 * does the ground the two rows the field is beaten against are folded off. The analysis comes in
 * for the reference row alone, which is cut by the stretch of source sounding
 * under the playhead rather than by the file as a whole (0196). The master's own window comes in
 * beside the deck's, already read for this frame however many surfaces asked for it
 * (`masterHeard`, src/ui/masterHeard.ts).
 *
 * **It allocates only where a standing pattern's ground is resolved and folded, and nowhere else.**
 * Every row, every read and every map here is written in place, which is why `standingPart` below is
 * a loop rather than a `find` — but `bedGround` answers a pair and a bound (src/lib/playerBed.ts),
 * so a yard with a pattern standing costs three object literals per painting — the bounds, the
 * ground and the pair both halves of it are answered in — plus the one short string the field's own
 * identity is folded over (`heardShape`, src/lib/moireSound.ts). Spelling the fold out here
 * to avoid them is the one thing 0185 forbids: two authors of the crawl is a picture that can
 * disagree with the loop a press writes. So 0070's rule is paid where it is cheap and this is what
 * it costs, at the drift's own cadence rather than at 60fps (0144) — the peaks already pay it on
 * their frame path for the same reason (`paintFrame`, src/ui/Waveform.tsx).
 *
 * **And the one number it answers rather than writes**: how washed the yard has become, off the
 * crest of the same window the meter is read from. It belongs to the field and to no row, so there
 * is nowhere among the rows to put it and it is returned instead — the paint spends it over every
 * row at once (0213).
 *
 * **And how hard the picture's own structure cuts is what the output sounds like**: the fractal
 * row is cut deeper under a sharp sound and bent further through its own lens under a resonant
 * one, off the same master window everything else here reads (`fractalHeard`). What that structure
 * *is* is not read here at all — it is the population an automator is standing, which is what the
 * row was folded from when the set was built (`fractalInto`, src/ui/moireRowsField.ts, 0246).
 *
 * **And the one thing it is told rather than reads**: how long it is since the last read, on the
 * session's own clock. A ground move is travelled and not written (0235), so the rows carry where
 * the travel has got to and only the gap between two reads says how much further it goes — which is
 * the one number a read in place cannot hold for itself. Its caller measures it, once per picture,
 * off the same shared read the session's row already runs its phase on (`MoireStrip`, 0228).
 *
 * **And how old the performance is**, on 0..1 off the elapsed sounding the peek carries
 * (`driftAge`, src/lib/moireAge.ts). Told rather than read for the same reason `elapsed` is: the
 * paint spends it too — it is the band the picture's ink is carried across — so it is resolved once
 * beside the set and never twice. What it widens here is the band the reference row's spacing is
 * drawn in, a reach with an end, so the oldest picture the instrument can draw is a picture and not
 * a smear.
 *
 * **And the picture's ink, which it travels rather than writes**: what the rows claim about colour
 * is the boldest of them, so a place retiring or a knob crossing a stop would hand the picture
 * another ink between two frames. The set carries where the travel has got to and this walks it one
 * step further, on the same `elapsed` the ground above is travelled on (`inkTravelInto`,
 * src/ui/moireScreen.ts).
 *
 * A lane the voice has not armed yet reports no phase and its row sits at its own zero rather than
 * vanishing, because the period is a fact about the lane either way. The loop's row and a rack
 * instance's are automated by nothing, so both run on the deck's own clock, wrapped — and a deck
 * sitting outside its loop still lands on the row. `into` is where the playhead is since the top of
 * the loop, in real seconds: buffer seconds divided by the rate they are read at (0035), and a deck
 * read at no rate at all is a deck holding still.
 */
// One pass over every row a picture holds, and a prologue that resolves the ground and the place
// the walk is standing in once for the five rows that rest on them. Splitting it would hand `rows`
// and `reads` to a helper that must stay index-for-index, which is the shape the builder above is
// waived for. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function refillRows(
  rows: readonly MoireRow[],
  reads: readonly RowRead[],
  peek: Readonly<DeckPeek>,
  rate: number,
  loop: Loop | null,
  duration: number,
  analysis: BeatAnalysis | null,
  master: Readonly<MasterPeek>,
  elapsed: number,
  age: number,
  seed: FractalStops,
  toward: Readonly<FractalStops>,
  ink: ScreenInk,
  jolt: MoireJolt,
): number {
  const into = rate > 0 ? (peek.position - (loop?.in ?? 0)) / rate : 0;
  // The ground the yard is standing on, folded once for the five rows that rest on it — the
  // module's three and the two the field is beaten against — rather than once a row, and once for
  // both halves of it, because a second call for the other half is the same fold paid twice. Where
  // the walk is standing beside it, for the same reason: a tier row resolving the standing part for
  // itself would walk the arrangement three times a painting.
  const stand = playerRowStand(peek.player.step?.bed ?? null, loop, duration);
  // And a yard jumping nowhere stands on its loop, which is a place it really is reading: a hand
  // moving the loop across the file is a ground move like a jump is, and the field travels to it
  // (`loopStand`, 0274). Only a yard with no loop at all rests in the middle of the picture.
  const groundCentre = stand?.centre ?? loopStand(loop, duration) ?? DRIFT_REST.centre;
  const groundOn = stand === null ? null : stand.ground;
  const place = peek.player.step?.place ?? null;
  const part = standingPart(peek.player);
  // And how long a whole move of it takes to travel, resolved once beside it for the same reason.
  const travel = groundTravel(rows, reads, peek.sounding > 0);
  // And one step of the picture's own travel, across the plane its structure stands on. Here in the
  // prologue and never inside the walk: the two fractal rows are one structure, so a step taken per
  // row would take it twice (0246, 0248).
  //
  // And not at all where there is no structure to travel, which is the one place this parts from the
  // ground above it: a yard that is not jumping still has a ground and stands on it outright
  // (`easedCentre`), but a rack holding no automator has no plane and no place on it — travelled
  // with no window, the picture would arrive at the stops an empty population folds to and hand
  // *those* to the first run that arrives (`carryFractal`). A rack holding one that is standing
  // nothing does have the rows and does travel (0249), toward whatever the population it is between
  // folded to, which is what makes the trough the middle of a move rather than a stop in one.
  const flight = fractalTravel(rows, reads);
  // And how long a row has to join the picture or to leave it, resolved once beside the two travels
  // above and for their reason: nothing at all where nothing is sounding, a halted picture being
  // painted on a commit rather than on a frame (0144, `inkTravelInto`).
  const arrivalSecs = peek.sounding > 0 ? DRIFT_ARRIVAL_SECS : 0;
  // And one step of the jolt the whole field answers a hit with: the bolder of what the output just
  // struck at and how far the walk just jumped, snapped up outright and let fall (0271). In the
  // prologue and never inside the walk, because it is the field's and no row's — every row spends
  // it below as a floor under its own reading, exactly as every row on the ground is written with
  // the one ground (0213). The walk's own strike is taken before the step below writes the landing
  // it was measured against.
  joltInto(
    jolt,
    Math.max(joltHeard(peek.crest, peek.meter), joltWalked(peek.player, jolt)),
    peek.player,
    age,
    elapsed,
    peek.sounding > 0 ? DRIFT_JOLT_SECS : 0,
  );
  if (flight > 0) fractalTravelInto(seed, toward, elapsed, flight);
  // One pass writing every row's per-frame reading, and the readings it writes are resolved once
  // above it: a helper would take the ground, the part, the travel and the reads and stay
  // index-for-index with the rows, which is the shape the two builders above are waived for. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  rows.forEach((row, index) => {
    const read = reads[index] ?? READS_NOTHING;
    // How much of this row is in the picture at all, one step on. **First, and on every row**: a
    // row joining a picture and a row leaving one are the same event seen twice, and a share
    // written outright is the whole picture restacking between two frames — every other row's
    // depth moves with the count (`gratingDepth`, src/lib/moireGrating.ts), so an effect added
    // flashed the whole field. Where a row starts from is the carry's (`carryArrivals`), and this
    // walks it the rest of the way on the same `elapsed` the ground and the ink travel on.
    row.arrival = arrivedInto(row.arrival, read.leaving, elapsed, arrivalSecs);
    // Where the rows that rest on the ground stand this frame. **A jump is a distance, and the
    // picture is the one surface that could show it**, so the ground is travelled toward rather
    // than written on: a jump to the next bar slides and a jump across the file sweeps (P174,
    // 0224). Where each row has got to is its own `centre` — the set is refilled in place, so the
    // travel keeps no state of its own — and a yard that is not jumping has no landing to time it
    // against and stands on the ground outright (`easedCentre`, `playerGroundSecs`).
    const ground = onGround(read)
      ? easedCentre(row.centre, groundCentre, elapsed, travel)
      : groundCentre;
    // A reading and never a setting: an instance whose plugin meters nothing is absent from the
    // map, and its row rests where its knobs put it (0128 amended).
    const reading = read.instance === null ? undefined : peek.meters.get(read.instance);
    // The field's own jolt is the floor under every row's own reading: a hit belongs to the whole
    // picture, and a row nothing is metering answers it exactly as one being metered hard does.
    row.pulse = Math.max(jolt.at, reading === undefined ? 0 : meterPulse(reading));
    // The reference row is the one row the sound itself cuts: how fine it is drawn is the onset
    // density of the stretch the yard is actually reading — which is what makes two grounds two
    // pictures — and how deep it cuts is the deck's own level, bounded so a silent yard still
    // draws its loop (0196, 0128 amended). Both are read off the peek and neither is stored.
    if (read.heard !== null) {
      row.pitch = agedPitch(heardPitch(analysis, duration, peek.position, read.heard), age);
      row.pulse = Math.max(jolt.at, heardPulse(peek.meter));
      // And anchored where in the source the yard is reading, the way the module's row is: two
      // combs of one pitch measured from two places differ by where their crests fall, so a ground
      // move stands the axis somewhere new against every row fanned off it (P161, 0185).
      row.centre = ground;
    }
    // What a lane is doing to the colour of the picture, where one is riding a knob that claims it.
    // A lane the voice has not armed yet reports no phase and the dimension stays where the knob is
    // parked, which is what it draws with no lane at all (0150).
    for (const colour of read.colour) {
      const at = peek.automation.get(colour.key);
      if (at === undefined) continue;
      const value = automationValueAt(colour.lane, at, colour.base);
      row[colour.into] = colourReached(
        colour.into,
        normalize(value, colour.spec.min, colour.spec.max, colour.spec.curve),
      );
    }
    // And the field's own row, the other one the ground moves: turned off its own resting identity
    // as well as anchored, so a jump to a new stretch re-centres and rotates the layer the whole
    // picture is beaten against rather than only respacing the axis under it (0196, 0213, P161).
    if (read.ground !== null) {
      row.shape = heardShape(groundOn, read.ground);
      row.centre = ground;
    }
    // And the row that is not this yard's: what the whole session is putting out. Its level is the
    // only depth it has — a row built at nothing is drawn at what its own meter says and at nothing
    // where there is nothing to hear (`pulsedDepth`, src/lib/moireSound.ts) — and how bright that
    // output is is how finely it is drawn (`heardTilt`). Both off the master bus and neither
    // stored, so two yards open at once are beaten against one layer (0213, 0145).
    if (read.session) {
      row.pulse = Math.max(jolt.at, heardLevel(master.level));
      row.pitch = heardTilt(master.tilt);
      // And its phase off the session's own clock rather than this deck's playhead, which is the
      // whole of what makes it one layer rather than one per yard: two pictures open at once stand
      // it in the same place, where a deck's position would put it in two (0228).
      row.phase = row.period > 0 ? wrap(master.at, row.period) : 0;
      return;
    }
    // And the one row the whole run stands in: how hard the picture's own structure cuts, and how
    // far it is bent, off the same master window. Its phase runs on the deck's clock below like any
    // other, which is what opens it into itself and closes it back out (`fractalZoom`, 0246).
    if (read.fractal) {
      // Anchored where the yard is reading, like the reference row and the wash over it: the
      // structure is one grating among the picture's own and stands where they stand (0251). Its
      // own travel across the plane is the population's and is taken in the prologue above.
      row.centre = ground;
      fractalHeard(row, peek.grown, master, age);
    }
    if (read.tier !== null) playerTierInto(row, read.tier, place, part, ground);
    if (read.lane !== null) {
      row.phase = peek.automation.get(read.lane) ?? 0;
      return;
    }
    row.phase = row.period > 0 ? wrap(into, row.period) : 0;
    // And where the row is standing, on the rows whose anchor is their own fold's: carried around
    // that rest by the phase just written, and thrown a little further off it by the same meter
    // reading `pulse` came from. Both are already this row's and already per frame, so rows on
    // different periods sweep past one another at their own rates and a crossing forms and comes
    // apart on the beat between the two (0229).
    if (read.anchor !== null) row.centre = driftedCentre(read.anchor, turnsOf(row), row.pulse);
  });
  const wash = washAmount(peek.crest, peek.meter);
  // And one step of the picture's ink travel, from where it has got to toward what the rows claim
  // now. After the walk and never inside it: a lane riding a colour writes its row's claim in there,
  // and the ink is the boldest of them all — one screen being one tile (`inkTravelInto`).
  //
  // **And no travel at all on a yard that is not sounding**, which is the same answer the ground
  // gives a yard that cannot jump: there is nothing to time a travel against. A halted picture is
  // painted on a commit and never on a frame (0144) and the clock it would be timed on is the deck's
  // (0126), which does not run — so a knob dragged on a stopped yard would strand its ink wherever
  // the last commit left it and leave it there, and the ink arrives outright instead.
  inkTravelInto(ink, rows, wash, age, elapsed, peek.sounding > 0 ? DRIFT_INK_SECS : 0);
  return wash;
}

/**
 * The jumps module's two rows onto a picture whose yard is jumping, and nothing at all onto one whose
 * yard is not: a yard that cannot jump has no module doing anything, exactly as a bypassed instance
 * has no effect doing anything (0139). *Holding* a pattern is not jumping — a loop with no grid to
 * jump around plays straight past the module (`playerJumps`, src/audio/playerGrid.ts) — so what says
 * whether there is a row is the period its caller has already resolved, or null.
 *
 * The rows in the picture that move in steps rather than continuously, which is what an
 * arrangement is — so each is built at its own rest here and what a tier boundary moves about it is
 * written by the per-frame read out of the place the walk is standing in at that frame
 * (`src/lib/playerDrift.ts`, 0157, 0221). One per tier, the part's first and the song's over it
 * broader, so a part changing is a fine layer moving over a coarser one holding still and a whole
 * song coming round moves the picture wholesale. Before the loop's, so the reference row stays the
 * last one a picture holds.
 */
function playerInto(rows: MoireRow[], reads: RowRead[], playerPeriod: number | null): void {
  if (playerPeriod === null) return;
  rows.push(playerRow(playerPeriod));
  reads.push({ ...READS_NOTHING, key: `${ROW_KEYS.tier}part`, tier: "part" });
  rows.push(playerTierRow(playerPeriod));
  reads.push({ ...READS_NOTHING, key: `${ROW_KEYS.tier}song`, tier: "song" });
}

/**
 * Whether a surface holding these rows belongs on the frame loop. The one answer both sizes ask.
 * A halted yard is painted but not animated: `laneNow()` freezes on a halt and the playhead holds
 * where it stopped (0040), so every phase is the phase the last frame drew — an idle page runs
 * zero frames (src/ui/frame.ts), and a picture that is not moving is a commit, not a subscription.
 */
export const paintsPerFrame = (playing: boolean, rows: number): boolean => playing && rows > 0;
