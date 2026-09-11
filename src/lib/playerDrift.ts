/**
 * @role How the jumps module reaches the drift: the period its own row runs on, the three things
 *   about that row the part standing in its song moves — its identity, its spacing and its tint —
 *   the two that say what the row is, its wave and its coordinate,
 *   the anchor the ground it is reading on puts it at and how long the picture takes to travel to a
 *   new one, and the broader row the tier over a part
 *   carries beside it — the song's, folded off its own tier's id.
 *   The player's own declaration rather than a registry entry's, because the player is not
 *   an effect and 0148's rule belongs to the effect registry (0139, 0148): it sits beside the
 *   module it declares. Pure maths: no canvas, no clock, no React.
 * @instead What a row is once every dimension has reached it → src/lib/moire.ts, whose reaches and
 *   resting values this spends rather than restates. Building the yard's rows out of this, and the
 *   per-frame read that moves them → src/ui/moireRows.ts. What a song is a run of →
 *   src/lib/playerSong.ts.
 */
// Over the cap because a drift is read off every module at once: the count is how many of them
// declare a row, and a helper between them would only move the same imports. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { fold } from "./copy";
import {
  colourReached,
  DRIFT_CENTRE_REACH,
  DRIFT_DEPTH_FLOOR,
  DRIFT_FRINGE_REACH,
  DRIFT_PITCH_REACH,
  DRIFT_REST,
  EFFECT_ROW_PERIOD_SECS,
  FLAT_BEND,
  LINEAR_GEOMETRY,
  type DriftDimension,
  type DriftGeometry,
  type MoireRow,
} from "./moire";
import { DRIFT_BROADEST_PITCH } from "./moireGrating";
import type { NamedTier } from "./copyNames";
import type { SongPlace } from "./playerSongs";
import { PLAIN_PROFILE, RESERVED_PROFILES, type DriftProfile } from "./moireProfiles";
import { bedGround } from "./playerBed";
import { clamp, denormalize, normalize } from "./range";
import { PLAYER_PART_MAX, PLAYER_PART_MIN, type SongPart, type SongPartId } from "./playerSong";
import { PLAYER_RATCHET_MAX } from "./playerRepeats";
import { PLAYER_REST_DRAWN_MAX } from "./playerRest";
import type { PlayerStep } from "./playerWalk";
import type { BedZone } from "./playerZone";
import { landingSecs, type PlayerSpec } from "./player";
import type { Loop } from "./timeline";

/**
 * The coordinates anything in the picture may *pick*, and never the three the field owns. An
 * effect declares one and the jumps module folds one off the part standing, and neither is a
 * picture of a run or of a rack, which is what the field's are (src/ui/moireRowsField.ts, 0246).
 * One fact and never a subtraction: a fold takes a remainder, so a pool that grew under one would
 * silently move every part's coordinate the day a fifth axis was added.
 */
export const DRIFT_PICKED_GEOMETRIES: readonly DriftGeometry[] = [
  "linear",
  "radial",
  "spiral",
  "fan",
];

/**
 * The identity of the row the jumps module draws while no part of a song is standing — a pattern
 * with no arrangement, and a pattern nobody has started. Folded off its own name the way the macro
 * row is (src/ui/moireRows.ts): the module belongs to no parameter and to no instance, so its
 * angle and where in its cycle it starts have to be nobody else's.
 */
export const PLAYER_ROW_SHAPE = fold("the yard jumping");

/**
 * How long the module's own row runs, in real seconds: the landing the dials say, which is the
 * count the pattern is set to, each repeat of it as long as the ratchet leaves it — `landingSecs`
 * rather than `burst * repeats`, so the row runs on the landing the transport actually schedules
 * and not on the one it would have before a landing could shrink (P118, principle 1). The one
 * length in the module that is wall
 * seconds rather than jumps or slots (0119), read off the spec and never off the standing voice —
 * a period is what the yard's recurrence and the picture's own window are measured from
 * (`macroInto`, src/ui/moireRows.ts), and a period that moved at a part boundary would be a row
 * rewriting how wide a picture the rest of them are drawn across.
 *
 * Banded into the range a rack instance draws its row from, and the same band rather than one of
 * its own: outside it a row is either a line that never moves inside the window or a spacing the
 * pixels alias, and which of those a period lands in is a fact about the picture rather than about
 * what is drawing on it.
 */
export const playerRowPeriod = (spec: PlayerSpec): number =>
  clamp(landingSecs(spec.burst, spec.repeats, spec.ratchet), ...EFFECT_ROW_PERIOD_SECS);

/**
 * What fraction of one landing the picture is given to travel a whole ground move. **The ease has
 * to finish inside the jump it is about**: a yard set to jump every quarter second and eased over a
 * second is a picture permanently chasing a ground two jumps back, which is a smear and not a move.
 * Half, so the whole travel is over well before the next landing arrives and there is still enough
 * of the landing left for the eye to read the move as one motion.
 */
export const PLAYER_GROUND_TRAVEL = 1 / 2;

/**
 * How long the picture takes to travel a whole ground move on a yard whose landing is `period`
 * seconds long. Derived off the length the module already resolves and bands (`playerRowPeriod`,
 * which is what a jumps row's period *is*) and never a constant of its own, so a yard jumping often
 * moves abruptly because there is no room for anything else and a yard jumping rarely glides — the
 * rule a hand sees, out of the one number the row is already drawn from (principle 1).
 *
 * Nought where there is no landing, which is a yard that is not jumping: no jumps row, no ground
 * to move, nothing to travel. Its caller writes the ground straight there (`easedCentre`,
 * src/lib/moire.ts).
 */
export const playerGroundSecs = (period: number): number =>
  period > 0 ? period * PLAYER_GROUND_TRAVEL : 0;

/**
 * The identity of the module's row while `part` stands: the badge the part carries, which is the
 * one field of a part that is not a value a hand chose and does not move when the part is reordered
 * (0157). So a part coming round is a different angle and a different place in the cycle — a field
 * the eye reads as another field — and the same part coming round again is the same one.
 */
export const playerRowShape = (part: SongPart | null): number =>
  part === null ? PLAYER_ROW_SHAPE : fold(part.id);

/**
 * How fine the module's row is drawn while `part` stands, as a ratio on the pitch its period sets:
 * the part's own length, which is how many jumps it lasts. A long part is a broad field and a short
 * one a fine field, geometrically across the band, because what one spacing does to another is a
 * ratio. A row with no part standing is drawn at the pitch its period alone sets, which is what
 * every row nothing reaches is drawn at.
 */
export const playerRowPitch = (part: SongPart | null): number =>
  part === null
    ? DRIFT_REST.pitch
    : denormalize(
        normalize(part.length, PLAYER_PART_MIN, PLAYER_PART_MAX, "log"),
        1 / DRIFT_PITCH_REACH,
        DRIFT_PITCH_REACH,
        "log",
      );

/**
 * How many tints a whole song may ask the picture for. **Not `DRIFT_STEPS`, and this is the number
 * that keeps a boundary off the pixel loop.** The picture's ink is one tile keyed by its tint
 * (`inkThrough`, src/ui/moireScreen.ts), that tile costs a pass over its own pixels to build, and
 * the cache behind it holds a dozen and evicts the oldest — so a set of tints larger than the cache,
 * asked for in a cycle, misses every single time and builds a tile on the frame the hand is on.
 * That is the one thing 0141 rounds a colour onto steps to prevent, and a knob is safe from it only
 * because a drag ends. A song does not end: it comes round, at whatever rate its parts are long
 * — `PLAYER_PART_MIN` is one jump and a burst may be five milliseconds.
 *
 * Four, so a whole song's tints and the other surface's copies of them are eight of the dozen the
 * cache holds, and a song that has been round once is asking for tiles that are already built.
 * Coarser than the eye needs to tell two tints apart, and coarse on purpose: which region of the
 * song is standing is what a tint says, and *which part* is what the angle and the spacing say.
 *
 * **That room is now per yard rather than shared** (0329): a tile is keyed by the field its yard's
 * name reads as, so two yards playing songs ask for two sets of these and share none of them. Four
 * is what keeps one yard's song inside the cache; a rack of many yards all playing songs is over
 * it, and what that costs is a build on the paint that revisits a tint — plan §4.
 */
export const PLAYER_TINTS = 4;

/**
 * Where between the picture's cool ink and its hot one the module asks to be drawn while `part`
 * stands, off the same badge its identity is, on one of `PLAYER_TINTS` stops. **The fold's
 * remainder, where the identity above is its whole**: one fold, two independent halves, exactly as
 * an effect's row takes its waveform from the remainder and its period from the quotient
 * (`effectRowPeriod`, src/lib/moire.ts). It has to be the halves and not the turn twice — FNV-1a
 * barely moves its top bits for two ids differing in one character, so a tint read off the same end
 * as the angle would give a whole song one colour. The colour dimension
 * a song has the strongest claim on, and the reason the module takes one at all: 0141 rounds a
 * colour onto its own steps so that a knob moves the tile rather than the frame, and a song is the
 * one thing on a yard that already moves in steps — a part boundary *is* a step, so the tint changes
 * there and rests through every jump between two boundaries.
 *
 * Rest with no part standing: a pattern that is not stepping is making no claim on the picture's
 * colour, and a row resting in a dimension is a row that leaves it to whoever says it loudest.
 */
export const playerRowHue = (part: SongPart | null): number => playerTint(part?.id ?? null);

/**
 * That stop, off the badge alone. Its own function because two rows now ask for it — the module's
 * own row off the part standing, and the reference row off the voice that part handed the step
 * (`PLAYER_REACH`) — and a second fold of the same badge onto the same four stops would be one
 * colour derived twice (principle 1).
 */
export const playerTint = (id: SongPartId | null): number =>
  id === null
    ? DRIFT_REST.hue
    : colourReached("hue", (fold(id) % PLAYER_TINTS) / (PLAYER_TINTS - 1));

/**
 * Which of the two waves no effect may claim the module's row is cut to while `part` stands, and
 * which coordinate it is cut along. **What the row _is_, where the three above are what it looks
 * like**: a tint, a spacing and an angle recolour and respace one row out of a dozen, and a song
 * that has come round is a picture that barely moved. A comb becoming a ring is the row leaving the
 * family of fringes it was making and entering another (0142) — the eye reads it as a different
 * picture rather than as the same picture in a different colour, which is what a part boundary is.
 *
 * `RESERVED_PROFILES` and nothing wider. Those two are the waves an effect may not wear precisely
 * because a row of the instrument's own already does (0137, 0145), and the module is one of the
 * instrument's own rows: a song wearing a plugin's wave would make the picture say a plugin was
 * doing what the arrangement is doing, which is the same lie from the other side. The geometry is
 * not claimed exclusively, so the module takes its pick of all four an effect may also claim
 * (`DRIFT_PICKED_GEOMETRIES`) — and never the two a fractal has, which are a picture of the run an
 * automator is standing and not of an arrangement (0122, 0246).
 *
 * Off the same badge as the identity and the tint, and off bits none of them spends: the tint takes
 * the fold's last two, so a geometry read off those would be a fourth name for the same thing. FNV
 * barely moves its top bits between two ids differing in one character, which is why these are the
 * low ones shifted rather than the high ones masked (`playerRowHue`).
 *
 * Rest with no part standing: the plainest grating there is, along the straight axis every row is
 * cut along until something bends one.
 */
export const playerRowProfile = (part: SongPart | null): DriftProfile =>
  part === null
    ? PLAIN_PROFILE
    : (RESERVED_PROFILES[(fold(part.id) >>> 4) % RESERVED_PROFILES.length] ?? PLAIN_PROFILE);

export const playerRowGeometry = (part: SongPart | null): DriftGeometry =>
  part === null
    ? LINEAR_GEOMETRY
    : (DRIFT_PICKED_GEOMETRIES[(fold(part.id) >>> 2) % DRIFT_PICKED_GEOMETRIES.length] ??
      LINEAR_GEOMETRY);

/**
 * Where the module asks its row to be anchored: where in the source the yard is actually reading,
 * as a turn of the file from its start to its end. The strongest claim there is on the picture's
 * anchor dimension — 0142 put `centre` there for `delay.time` because an echo arrives from
 * somewhere, and where a yard reads from is the same fact about the whole picture rather than
 * about one plugin in it.
 *
 * **What that buys on a straight row is a slide, which is exactly what 0142 says it is.** With no
 * part standing this row is linear and unswept, so its anchor reaches `aim` folded into the one
 * scalar its phase already moves along (`slide`, src/ui/moireCanvas.ts) — it is once a row is swept
 * or curved that where it is measured from becomes the picture, which is what a part cutting this
 * row along a ring makes of it (`playerRowGeometry`). And that is not nothing: two combs of one pitch measured
 * from two places differ by where their crests fall, so a ground move stands this row's crests
 * somewhere new against every other row, and their product is a field neither of them held. The
 * picture a yard draws reading here is not the picture it draws reading there.
 *
 * `bed` is the raw offset in the loop's own sixteenths the standing step carries (0185), so the
 * fold onto the ground the file holds and the buffer second it lands at are `bedGround`'s and
 * nobody else's — the same function the peaks draw the standing bed with and the jumps card plants
 * on (principle 1, src/lib/playerBed.ts). A picture that spelled the crawl itself is a row that can
 * disagree with the rectangle beside it.
 *
 * **A ground of zero anchors on the loop rather than resting.** The peaks and the plant read
 * `on === 0` as nothing to do, because a rectangle drawn over the loop claims a move that never
 * happened and a plant there writes back the loop the hand already set. An anchor claims no move:
 * it says where reading happens, and a pattern standing on its own loop is reading there.
 *
 * **Read off the step and never off the part**, which is what tells this field from the three
 * beside it. Those rest when the badge names a part the arrangement does not hold, because a row
 * cut by a part nobody is standing in is a picture disagreeing with the song. A ground is not the
 * song's: a step exists, so the yard is reading somewhere, and where it reads is true whether or
 * not the cursor's badge resolves.
 *
 * Read per frame and moved per frame, which the anchor of a straight row costs nothing to do: it
 * reaches the painter as a translate and never as a tile key, so the crawl slides the field where a
 * curved row's anchor would rebuild a picture-sized tile (0142, `aim`, src/ui/moireCanvas.ts).
 *
 * **And which stretch it is reading, beside the anchor**, as the offset in the loop's own
 * sixteenths that stretch begins at: the whole of what tells one ground from another, and the one
 * number the row the whole field is beaten against is folded off (`heardShape`,
 * src/lib/moireSound.ts). One answer and not two functions, because `bedGround` hands both back
 * together and a second call for the other half would be one fold of the crawl paid twice
 * (principle 1, 0070).
 *
 * Null with no step standing, with no loop, and on a source of no length — a yard reading nowhere
 * makes no claim on where the picture is measured from, and a row resting in a dimension leaves it
 * to whoever says it loudest, which is what its caller writes instead (`DRIFT_REST.centre`). A
 * ground of zero is the loop itself and is a stretch like any other, for the reason above.
 */
export const playerRowStand = (
  bed: number | null,
  loop: Loop | null,
  duration: number,
  zone: BedZone | null,
): { centre: number; ground: number } | null => {
  if (bed === null || loop === null || duration <= 0) return null;
  // Zoned, like every other reader of a ground: where a hand said the loop may stand narrows where
  // the walk can be, so a picture folding the offset without it would anchor a yard's rows outside
  // the stretch that yard is actually reading (0318). The zone is the spec's and reaches here
  // through the surface that holds one, because a per-frame peek carries no spec.
  const stood = bedGround(loop.in, loop.out - loop.in, duration, bed, zone);
  return { centre: standingCentre(stood.in, duration), ground: stood.on };
};

/**
 * Where a stretch of the file beginning `at` seconds anchors the picture: how far into the source
 * it is, on the anchor's own reach. The one arithmetic both stands below are, so a loop and the
 * ground a walk reads inside it are measured from the same place (principle 1).
 */
const standingCentre = (at: number, duration: number): number =>
  denormalize(normalize(at, 0, duration), 0, DRIFT_CENTRE_REACH);

/**
 * And `standingCentre` read back the other way: how far through the source the ground stands, in
 * **beds** — one bed being one loop-length of it, which is what a ground move is counted in before
 * it is counted in sixteenths of one (`bedGround`, src/lib/playerBed.ts, 0185).
 *
 * Read off a centre the picture has *travelled* to and not off the offset a step carries, which is
 * the whole of what it is for: the walk's ground move and the screen's crawl are one motion, so the
 * lattice steps a cell for every bed of it and a move half travelled has stepped half of what it
 * will (`crawlCells`, src/ui/moireCrawl.ts). The one place the centre is turned back into the
 * ground's own unit, so neither end of that motion is measured twice (principle 1).
 *
 * **Through the source and not from the loop's own in-point**, which the ground move is measured in
 * (`bedGround`): a hand dragging the loop moves the ground *and* the point a distance from it would
 * be measured against, so a move read that way is a lattice that steps out and comes back. A loop
 * resized is another bed and so another count, which is the loop this yard is reading changing and
 * not a move of the ground inside it.
 *
 * The travel it is read off is a *rate* and not a duration — `easedCentre` carries the whole of
 * `DRIFT_CENTRE_REACH` in `playerGroundSecs` — so a move across the file sweeps the lattice across
 * it and a bed's move inside a long file steps it almost at once. That is the ground's own rule
 * (0235), and this reads it rather than writing a second one.
 *
 * Nought where there is no loop for a bed to be the length of and on a source of no length, which is
 * a yard reading nowhere: the same answer `playerRowStand` gives, and a lattice that stands still.
 */
export const playerGroundBeds = (centre: number, loop: Loop | null, duration: number): number => {
  // Guarded the way a travel's own rate is, so a duration that is not a number at all answers the
  // still lattice rather than writing a NaN into the screen's transform, which draws nothing and
  // says nothing (principle 5, `windTravelInto`).
  if (loop === null || !(duration > 0)) return 0;
  const span = loop.out - loop.in;
  if (span <= 0) return 0;
  return ((centre / DRIFT_CENTRE_REACH) * duration) / span;
};

/**
 * Where a yard that is jumping nowhere anchors the picture: on its loop's own in-point (0274). A
 * loop is a place the yard really is reading whether or not a walk is standing in it, so a hand
 * moving the loop across the file is a ground move like a jump is, and the field travels to it
 * (`easedCentre`, src/lib/moire.ts, 0235) instead of standing in the middle of the picture while
 * every phase in it restacks. A yard with no loop is reading the whole file, which is a loop
 * beginning at the top of it (0292), so it stands there rather than in the middle. Null only on a
 * source of no length, which is reading nowhere and rests.
 */
export const loopStand = (loop: Loop | null, duration: number): number | null =>
  duration <= 0 ? null : standingCentre(loop?.in ?? 0, duration);

/**
 * The identity the song's row draws while the walk stands in no place at all — a pattern holding no
 * arrangement, and one drawing its own (0158). Folded off its own name, the way the module's rest
 * is above and the wash's whole identity is (src/ui/moireRows.ts): a tier nothing is standing in
 * belongs to no song, so its angle and where in its cycle it starts have to be nobody else's.
 */
export const PLAYER_SONG_ROW_SHAPE = fold("the yard's song");

/**
 * And the identity it draws while `place` stands: the id of the tier itself, folded exactly as the
 * module's own row folds the badge of the part standing under it (`playerRowShape`). So a song
 * arriving is one field moving over the part's, and the same song reached again is the same field —
 * a tier is drawn out of its id rather than out of how many boundaries have gone by, which is why
 * the tier carries an id and not an index (0221, src/lib/playerSongs.ts).
 */
export const playerSongRowShape = (place: SongPlace | null): number =>
  place === null ? PLAYER_SONG_ROW_SHAPE : fold(place.song);

/**
 * How fine the tier over a part is drawn, as the same ratio on the pitch its period sets that the
 * module's own spacing is. **Broader than the tier under it, and the broadest the picture has**: a
 * part's spacing reaches `DRIFT_PITCH_REACH` either way of its period (`playerRowPitch`), and the
 * song's is `DRIFT_BROADEST_PITCH` — the coarse end of the band the field's own row already sits at
 * (`washInto`, src/ui/moireRows.ts).
 *
 * So the two sit inside the band the picture already has rather than off the end of it: a part
 * changing is a fine layer moving over a coarser one holding still, and a whole song coming round
 * moves the picture wholesale. There is one coarse layer and not two because there is one tier over
 * the part: two layers a hand cannot see a spacing difference between were one layer said twice
 * (P170, 0224). Fixed rather than folded, where every other thing a tier's row wears is folded off
 * its id: how broad a row is drawn is what says which tier it *is*, and a spacing drawn out of an
 * id would make a song's row a second part's.
 */
export const PLAYER_SONG_ROW_PITCH = DRIFT_BROADEST_PITCH;

/**
 * That row at its own rest: **the module's own row broadened and renamed**, and written as that
 * rather than as a second literal of the same nine fields, so a tenth field on a row cannot arrive
 * on the part's layer and miss the one over it (principle 1). One period for both of them, which is
 * the landing the dials say — the one wall length in the module, and the one every tier of it steps
 * against.
 *
 * Its identity is the only thing the per-frame read moves (`playerTierInto`): a tier over a part
 * makes no claim on the picture's colour, on how deep it cuts or on where it is measured from,
 * because those are claims the part standing and the ground being read already make, and a broader
 * layer saying them again would be the same fact drawn three times.
 */
export const playerTierRow = (period: number): MoireRow => ({
  ...playerRow(period),
  shape: PLAYER_SONG_ROW_SHAPE,
  pitch: PLAYER_SONG_ROW_PITCH,
});

/**
 * What one tier's row is this frame: for the song over a part, the identity of the tier the walk is
 * standing in and nothing else; for the part's own, the six things the standing part and the
 * standing ground move about it. Fields rather than a phase, because a walk does not travel through
 * a tier — it is in one until it is in the next, so what the picture shows is the boundary (0157),
 * and each of the two steps at its own tier's boundary off the `place` the step carries (0221).
 *
 * Five of the six off the part. Three are what the row looks like — its identity, its spacing and
 * its tint — and two are what it *is*: the wave it is cut to and the coordinate it is cut along, so
 * a part boundary is a comb becoming a ring rather than a comb in another colour (0142,
 * `playerRowGeometry`). All five step at the boundary and rest between two, which is the same thing
 * that keeps a tint off the pixel loop (0141).
 *
 * And the sixth off the step rather than the part: where the picture is measured from, which is
 * where in the source the yard is reading, resolved by its caller through the one function the
 * peaks and the plant already share (0185, `playerRowStand`). The one field of this row that moves
 * without a part boundary: the ground crawls, so the anchor crawls with it, and on a straight row
 * that is a slide rather than a rebuild (0142).
 */
export function playerTierInto(
  row: MoireRow,
  tier: NamedTier,
  place: SongPlace | null,
  part: SongPart | null,
  centre: number,
): void {
  if (tier === "song") {
    row.shape = playerSongRowShape(place);
    return;
  }
  row.shape = playerRowShape(part);
  row.pitch = playerRowPitch(part);
  row.hue = playerRowHue(part);
  row.profile = playerRowProfile(part);
  row.geometry = playerRowGeometry(part);
  row.centre = centre;
}

/**
 * The module's row at its own rest, which is the whole of what it declares: the plainest grating
 * there is, along the straight axis every row is cut along until something bends one, at the
 * `playerRowPeriod` its caller spent — and the five a part moves at the value they take with no
 * part standing, because a pattern that is not running is not in a part. The sixth, the anchor, is
 * simply where every row rests: a yard reading nowhere makes no claim on it and `playerRowStand`
 * answers nothing to spend. The picture's per-frame read moves all six and nothing else
 * (`refillRows`, src/ui/moireRows.ts).
 *
 * Not a reference row, and not an instance's: the module is neither the axis the picture is read
 * against nor a plugin, so nothing meters it and its pulse rests at nothing.
 */
/**
 * What the step the walk is playing claims of the picture, one dimension a field, the way an
 * effect's registry entry declares a way into the drift for each of its knobs (0139, 0148, 0359).
 * Three fields of a `PlayerStep` and three dimensions of the one row every other row is read
 * against. `burst` and `repeats` are already the row's own period between them (`landingSecs`,
 * `playerRowPeriod`); `reversed` reaches no row at all, being which way the screen's lattice crawls
 * (`inkThrough`, src/ui/moireScreen.ts); and `rates` reaches nothing, because the one dimension a
 * climb could be is a sweep, and a swept reference row is a picture-wide tile keyed by a spacing
 * this row moves every frame — the block's budget refuses it and docs/plan.md §4 holds the price.
 *
 * **On the reference row and on no other.** What is sounding is what that row is cut by (0196), and
 * a step is the whole of what is sounding — so a claim of the walk's on any other row would be the
 * arrangement drawing over a plugin's. The five are exactly the five that row does not already
 * spend: its spacing is the stretch under the playhead and its anchor is the ground. The depth is
 * the one they share, and they do not disagree: this is the ceiling a knob asked for and the deck's
 * own meter is a reading that only ever takes it down (0128 amended, 0196).
 *
 * A table rather than three functions, so the claims can be read at once and counted by a test the
 * way an effect's `driftFrom` is — and spent through it below, so a claim written here that nothing
 * spends cannot exist.
 */
export const PLAYER_REACH = {
  rest: "depth",
  ratchet: "fringe",
  voice: "hue",
} as const satisfies Record<string, DriftDimension>;

/**
 * `PLAYER_REACH` spent onto the row every other row is read against. Written in place on the row
 * the caller already holds, like every other per-frame read (0070), and all three rest where no
 * step stands — a yard playing nothing makes no claim, which is the row the picture drew before the
 * walk reached it. A write and not an omission: left alone the picture would hold the last
 * landing's claim after the walk had stopped.
 *
 * **Each field's zero is the dimension's own rest**, which is what makes a plain step a plain
 * picture: a pattern nobody has ratcheted or rested draws exactly what it drew before the walk
 * reached the row, and only a knob a hand has turned moves it. The claims are read off the fields
 * rather than off their dials' turns for that reason — the wait as how much of the widest one a
 * roll may draw it is (`PLAYER_REST_DRAWN_MAX`, P87), and *down* the depth, because a step that
 * waits is a step sounding less; the ratchet up from the rest to the whole of the fringe's own
 * reach, because a landing nothing shortens spreads no channels; and the voice as the badge of the
 * part that handed it over, on the same four stops the module's own row takes its tint from
 * (`playerTint`).
 */
export function playerReachInto(row: MoireRow, step: PlayerStep | null): void {
  if (step === null) {
    row[PLAYER_REACH.rest] = DRIFT_REST.depth;
    row[PLAYER_REACH.ratchet] = DRIFT_REST.fringe;
    row[PLAYER_REACH.voice] = DRIFT_REST.hue;
    return;
  }
  row[PLAYER_REACH.rest] = denormalize(
    1 - normalize(step.rest, 0, PLAYER_REST_DRAWN_MAX),
    DRIFT_DEPTH_FLOOR,
    1,
  );
  // From the rest and not from nought, which is where `colourReached` would start it: nought is the
  // three lattices laid on top of each other, and it is the loudest claim on the dimension there is
  // (`boldestRow`, src/ui/moireScreenInk.ts) — so a pattern at the dial's own zero would flatten the
  // whole screen for as long as it played.
  row[PLAYER_REACH.ratchet] = denormalize(
    normalize(step.ratchet, 0, PLAYER_RATCHET_MAX),
    DRIFT_REST.fringe,
    DRIFT_FRINGE_REACH,
  );
  // The voice is what makes the claim and the part is what tells two of them apart: a voice carries
  // no identity of its own, being the numbers a part is overriding the card's dials with, so what
  // the tint is folded off is the badge that handed it over. A step playing the card's own numbers
  // rests, which is every step of a pattern holding no song.
  row[PLAYER_REACH.voice] = playerTint(step.voice === null ? null : step.part);
}

export const playerRow = (period: number): MoireRow => ({
  period,
  phase: 0,
  pulse: 0,
  arrival: 1,
  reference: false,
  shape: playerRowShape(null),
  bend: FLAT_BEND,
  profile: playerRowProfile(null),
  geometry: playerRowGeometry(null),
  ...DRIFT_REST,
  pitch: playerRowPitch(null),
  hue: playerRowHue(null),
});
