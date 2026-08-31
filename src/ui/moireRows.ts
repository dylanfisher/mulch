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
import { drawnParamIds } from "@/audio/effects/automator";
import { effectById, isEffectId, isGrowable, type EffectId } from "@/audio/effects/registry";
import { automationValueAt, laneSpan } from "@/lib/automation";
import { fold } from "@/lib/copy";
import { grownOctaves } from "@/lib/effectGrowth";
import {
  colourReached,
  driftedCentre,
  driftReached,
  DRIFT_REST,
  easedCentre,
  restingCentre,
  shareOctaves,
  turnsOf,
  laneBend,
  LINEAR_GEOMETRY,
  wrap,
  type DriftGeometry,
  type DriftReach,
  type MoireRow,
} from "@/lib/moire";
import { agedFoldReach, agedPitch } from "@/lib/moireAge";
import { foldInto, foldNothing, type FractalFold } from "@/lib/moireFractal";
import { PLAIN_PROFILE, type DriftProfile } from "@/lib/moireProfiles";
import {
  heardHard,
  heardPitch,
  heardPulse,
  heardLevel,
  heardShape,
  heardTight,
  heardTilt,
  meterPulse,
  washAmount,
  type SourceCut,
} from "@/lib/moireSound";
import {
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
  READS_NOTHING,
  referenceInto,
  sessionInto,
  washInto,
  type ColourRead,
  type MoireRowSet,
  type RowRead,
} from "@/ui/moireRowsField";
import type { MasterPeek } from "@/app/facade";
import type { GrownEffect, EffectInstanceId } from "@/audio/effects/contract";
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
 * How a row belonging to one registry entry is cut: the shape of its wave and the coordinate that
 * wave runs down, both declared beside the entry's icon (0137, 0142). Three rows ask it — a lane on
 * one of that effect's knobs, the instance's own row, and a row the automator grew — and one
 * lookup answers, so a fourth kind of row cannot be cut to a fifth kind of thing (principle 3).
 */
const driftCut = (effect: EffectId): Pick<MoireRow, "profile" | "geometry"> => {
  const plugin = effectById(effect);
  return { profile: plugin.drift, geometry: plugin.geometry };
};

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
 * The same, for an effect an automator grew rather than one a hand added: where each value its
 * registry entry declared a way into the picture for stands, read off what the run drew it at.
 *
 * A grown effect holds no session entry to read a knob out of, so the turns come from the run
 * itself — `GrownEffect.values` is already each drawn knob as a fraction of its own range, in the
 * order `drawnParamIds` declares (src/audio/effects/automator.ts, 0208). A dimension whose
 * parameter the pool does not draw — one a rebuild or a hold keeps back — stands at the entry's own
 * default, which is exactly where that knob is on a place nobody has moved.
 */
export function grownReach(effect: EffectId, values: readonly number[]): DriftReach[] {
  const plugin = effectById(effect);
  const drawn = isGrowable(plugin) ? drawnParamIds(plugin) : [];
  return plugin.driftFrom.map(({ param, into }) => {
    const spec = PARAMS[param];
    const at = drawn.indexOf(param);
    const value = values[at];
    return {
      into,
      turn: value ?? normalize(spec.default, spec.min, spec.max, spec.curve),
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
 * Whether one row rests on the ground the yard is reading: the reference row, the wash over it and
 * the module's own tiers, and nothing else. Named once because two things ask — the read that
 * travels them, and the carry that keeps that travel across a rebuilt set (principle 1).
 */
const onGround = (read: RowRead): boolean =>
  read.heard !== null || read.ground !== null || read.tier !== null;

/**
 * Where a picture's ground rows had got to, carried onto the set that replaces them. **A row set is
 * rebuilt on things that are not jumps** — anything durable moving, and a run turning over — and
 * every row in a fresh one is built at `DRIFT_REST.centre`, so without this a knob touch would
 * sweep the whole field back from the middle of the picture and a yard holding a wander would never
 * leave it (0235, `MoireStrip`). The travel is the one accumulated number in the picture: every
 * other field a read writes is written outright, which is why only this one has to survive.
 *
 * The first ground row's centre and not each row's own, because one ground is one field: the read
 * writes them all from one number and they can only differ by having been built apart.
 */
export function carryGround(from: MoireRowSet, to: MoireRowSet): void {
  for (const [index, read] of from.reads.entries()) {
    if (!onGround(read)) continue;
    const centre = from.rows[index]?.centre;
    if (centre === undefined) return;
    for (const [at, into] of to.reads.entries()) {
      if (!onGround(into)) continue;
      const row = to.rows[at];
      if (row !== undefined) row.centre = centre;
    }
    return;
  }
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
function groundTravel(rows: readonly MoireRow[], reads: readonly RowRead[]): number {
  for (let index = 0; index < reads.length; index += 1) {
    const read = reads[index];
    if (read === undefined || read.tier === null) continue;
    return playerGroundSecs(rows[index]?.period ?? 0);
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
  // Last, because it is the whole set's bound and not any one row's: every copy past the first is
  // a fill of its own, and how many rows there are to ask for one is not something a per-row reach
  // can hold (`shareOctaves`, 0144).
  shareOctaves(rows);
  return { rows, reads, wash: 0, age: 0, fold: foldNothing(), ...macro };
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
 * **And the one thing it fills rather than writes onto a row**: how far the picture is laid back
 * into itself, which is a reading of the run the peek is holding and belongs to the whole field
 * (`foldInto`, src/lib/moireFractal.ts). It is handed in and refilled in place, where the wash is
 * answered, because it is an object and there is nothing to answer it with that does not allocate
 * one a painting (0070). **And what that fold is cut by is what the output sounds like** — the
 * spiral tightens under a resonance and the stack hardens under a sharp sound, off the same
 * master window everything else here reads (`foldHeard`).
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
 * beside the set and never twice. What it widens here is the ceiling the fold is held to and the
 * band the reference row's spacing is drawn in, each a reach with an end, so the oldest picture the
 * instrument can draw is a picture and not a smear.
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
  // `fractal` rather than `fold`, which is the name it wears on the set: this file already imports
  // `fold` from src/lib/copy.ts for every identity it takes off an id.
  fractal: FractalFold,
): number {
  // How far the picture folds into itself, off the same read — one entry per run of effects an
  // automator is holding, and none at all for a yard growing nothing (`foldInto`, 0202, 0204). It
  // belongs to the whole field rather than to any row, so it is filled in place beside the rows
  // rather than written onto one of them (0213).
  foldInto(fractal, peek.grown, agedFoldReach(age));
  foldHeard(fractal, master);
  const into = rate > 0 ? (peek.position - (loop?.in ?? 0)) / rate : 0;
  // The ground the yard is standing on, folded once for the five rows that rest on it — the
  // module's three and the two the field is beaten against — rather than once a row, and once for
  // both halves of it, because a second call for the other half is the same fold paid twice. Where
  // the walk is standing beside it, for the same reason: a tier row resolving the standing part for
  // itself would walk the arrangement three times a painting.
  const stand = playerRowStand(peek.player.step?.bed ?? null, loop, duration);
  const groundCentre = stand === null ? DRIFT_REST.centre : stand.centre;
  const groundOn = stand === null ? null : stand.ground;
  const place = peek.player.step?.place ?? null;
  const part = standingPart(peek.player);
  // And how long a whole move of it takes to travel, resolved once beside it for the same reason.
  const travel = groundTravel(rows, reads);
  // One pass writing every row's per-frame reading, and the readings it writes are resolved once
  // above it: a helper would take the ground, the part, the travel and the reads and stay
  // index-for-index with the rows, which is the shape the two builders above are waived for. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  rows.forEach((row, index) => {
    const read = reads[index] ?? READS_NOTHING;
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
    row.pulse = reading === undefined ? 0 : meterPulse(reading);
    // The reference row is the one row the sound itself cuts: how fine it is drawn is the onset
    // density of the stretch the yard is actually reading — which is what makes two grounds two
    // pictures — and how deep it cuts is the deck's own level, bounded so a silent yard still
    // draws its loop (0196, 0128 amended). Both are read off the peek and neither is stored.
    if (read.heard !== null) {
      row.pitch = agedPitch(heardPitch(analysis, duration, peek.position, read.heard), age);
      row.pulse = heardPulse(peek.meter);
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
      row.pulse = heardLevel(master.level);
      row.pitch = heardTilt(master.tilt);
      // And its phase off the session's own clock rather than this deck's playhead, which is the
      // whole of what makes it one layer rather than one per yard: two pictures open at once stand
      // it in the same place, where a deck's position would put it in two (0228).
      row.phase = row.period > 0 ? wrap(master.at, row.period) : 0;
      return;
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
  return washAmount(peek.crest, peek.meter);
}

/**
 * And what the output *sounds* like onto the fold that read just filled: how tight each run's own
 * spiral is drawn, and how hard the whole stack is laid. Both are readings of the master bus and
 * neither is a depth — how deep the picture folds is the population an automator is standing and
 * nothing else says it (0240, 0145).
 *
 * Written over the ratios `foldInto` wrote rather than handed into it, because the two halves have
 * two authors: how a spiral is aimed is the holding instance's own id, and how tight it is drawn is
 * the output of a session that knows nothing about which yard is open (0213). Written in place and
 * over the entries in force alone, so it allocates nothing and leaves the arrays past `folds` as the
 * last read's leavings, exactly as the fill above does (0070).
 */
function foldHeard(fractal: FractalFold, master: Readonly<MasterPeek>): void {
  fractal.keep = heardHard(master.edge);
  for (let each = 0; each < fractal.folds; each += 1) {
    fractal.ratios[each] = heardTight(fractal.ratios[each] ?? 0, master.flatness);
  }
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
  reads.push({ ...READS_NOTHING, tier: "part" });
  rows.push(playerTierRow(playerPeriod));
  reads.push({ ...READS_NOTHING, tier: "song" });
}

/**
 * What each instance holding a run of its own is holding right now — `DeckPeek.grown`, and nothing
 * this file may narrow: the picture reads the run, it does not keep one.
 */
export type GrownRun = ReadonlyMap<EffectInstanceId, readonly GrownEffect[]>;

/** The run nothing is holding, shared, so a caller with no automator allocates no map. */
export const NO_GROWN: GrownRun = new Map();

/**
 * What a run looked like the last time a picture was built from it: every place standing, and every
 * knob each of them was drawn at. Two flat arrays rather than a copy of the read, because it is
 * compared on the frame path and a copy per frame is the allocation 0070 exists to refuse.
 */
export type GrownStanding = { ids: EffectInstanceId[]; draws: number[] };

/** A caller that has never looked at a run. */
export const grownNothing = (): GrownStanding => ({ ids: [], draws: [] });

/**
 * Whether `was` already describes the run the read is holding — and, either way, it describes it
 * once this returns. **The one question a frame asks about the run**: which rows a picture has, and
 * what each is cut to, is a function of a population nothing stores and nothing renders (0204), so
 * the only way to notice one moving is to have looked at the last one.
 *
 * The ids and not the count: six places going and six arriving in one tick is a different picture
 * of the same length. And the draws beside them, because a place's knobs are rewritten in place
 * where a run wanders (`wander`, src/audio/effects/automator.ts) — a row reaches through the values
 * its plugin declared a way into the picture for, exactly as a rack instance's does, and a rack
 * instance's row is rebuilt the moment one of those values moves.
 *
 * Written into the caller's own arrays and answered without allocating, because every frame between
 * two of those moves must cost nothing (0070); a move is a tick of the run at most, which is a
 * second at its fastest (`TICK_MIN_SECS`). The read's own map is already free of a bypassed
 * instance's places (`growth`, src/audio/effects/rack.ts), so what it holds is what `moireRows`
 * draws.
 */
export function grownStanding(was: GrownStanding, grown: GrownRun): boolean {
  let at = 0;
  let drawn = 0;
  let same = true;
  for (const held of grown.values()) {
    for (const each of held) {
      if (was.ids[at] !== each.instance) {
        was.ids[at] = each.instance;
        same = false;
      }
      at++;
      for (const value of each.values) {
        if (was.draws[drawn] !== value) {
          was.draws[drawn] = value;
          same = false;
        }
        drawn++;
      }
    }
  }
  if (was.ids.length !== at) {
    was.ids.length = at;
    same = false;
  }
  if (was.draws.length !== drawn) {
    was.draws.length = drawn;
    same = false;
  }
  return same;
}

/**
 * Every effect one automator is holding, a row apiece, onto the picture its own instance's row was
 * just pushed onto. **The rows the session cannot see**: a grown effect is drawn from a seed and
 * never stored (0204), so without this a run of six turning over completely leaves the picture
 * exactly as it was — the automator's own knobs reached one row and the six they grew reached none.
 *
 * Each is cut the way a rack instance's is and by the same three things: its identity folded off
 * the id the run minted for it, which is the same word its row in the card carries (0076), and the
 * profile and geometry its own registry entry declares — so what the picture shows is which plugins
 * are standing, not that something is. What it is *set* to comes off the run rather than off the
 * session (`grownReach`), because there is no session entry to read.
 *
 * A place laid but not yet arrived is not among them: the read already withholds one, for the same
 * reason a bypassed instance carries no row — what nobody can hear is not in the picture (0139).
 * Nothing is read per frame for one: a grown row's phase runs on the deck's own clock, and its
 * fading in and out is the automator's row to tell.
 */
function grownInto(
  rows: MoireRow[],
  reads: RowRead[],
  grown: readonly GrownEffect[] | undefined,
): void {
  if (grown === undefined) return;
  for (const held of grown) {
    if (!isEffectId(held.effect)) continue;
    const seed = fold(held.instance);
    const cut = driftCut(held.effect);
    const reach = grownReach(held.effect, held.values);
    const reached = driftReached(seed, reach, cut.geometry);
    rows.push({
      ...reached,
      // The run's own size, spent on the rows it grew (`grownOctaves`, 0143). Never below what the
      // plugin's own value already claimed, so what the run asks for is added to that row and never
      // swapped for it. What the whole set can afford is `shareOctaves` below, and that one may
      // take a copy back off any row here — a set-wide budget is nobody's preference (0230).
      octaves: Math.max(reached.octaves, grownOctaves(grown.length, cut.geometry)),
      phase: 0,
      pulse: 0,
      reference: false,
      shape: seed,
      ...cut,
    });
    reads.push({ ...READS_NOTHING, anchor: restingCentre(seed, cut.geometry, reach) });
  }
}

/**
 * Whether a surface holding these rows belongs on the frame loop. The one answer both sizes ask.
 * A halted yard is painted but not animated: `laneNow()` freezes on a halt and the playhead holds
 * where it stopped (0040), so every phase is the phase the last frame drew — an idle page runs
 * zero frames (src/ui/frame.ts), and a picture that is not moving is a commit, not a subscription.
 */
export const paintsPerFrame = (playing: boolean, rows: number): boolean => playing && rows > 0;
