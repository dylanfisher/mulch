/**
 * @role How the jumps module reaches the drift: the period its own row runs on, the three things
 *   about that row the part standing in its song moves — its identity, its spacing and its tint —
 *   and the anchor the ground it is reading on puts it at.
 *   The player's own declaration rather than a registry entry's, because the player is not
 *   an effect and 0148's rule belongs to the effect registry (0139, 0148): it sits beside the
 *   module it declares. Pure maths: no canvas, no clock, no React.
 * @instead What a row is once every dimension has reached it → src/lib/moire.ts, whose reaches and
 *   resting values this spends rather than restates. Building the yard's rows out of this, and the
 *   per-frame read that moves them → src/ui/moireRows.ts. What a song is a run of →
 *   src/lib/playerSong.ts.
 */
import { fold } from "./copy";
import {
  colourReached,
  DRIFT_CENTRE_REACH,
  DRIFT_PITCH_REACH,
  DRIFT_REST,
  EFFECT_ROW_PERIOD_SECS,
  FLAT_BEND,
  LINEAR_GEOMETRY,
  type MoireRow,
} from "./moire";
import { PLAIN_PROFILE } from "./moireProfiles";
import { bedGround } from "./playerBed";
import { clamp, denormalize, normalize } from "./range";
import { PLAYER_PART_MAX, PLAYER_PART_MIN, type SongPart } from "./playerSong";
import { landingSecs, type PlayerSpec } from "./player";
import type { Loop } from "./timeline";

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
 * How many tints a whole song may ask the picture for. **Not `SCREEN_STEPS`, and this is the number
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
export const playerRowHue = (part: SongPart | null): number =>
  part === null
    ? DRIFT_REST.hue
    : colourReached("hue", (fold(part.id) % PLAYER_TINTS) / (PLAYER_TINTS - 1));

/**
 * Where the module asks its row to be anchored: where in the source the yard is actually reading,
 * as a turn of the file from its start to its end. The strongest claim there is on the picture's
 * anchor dimension — 0142 put `centre` there for `delay.time` because an echo arrives from
 * somewhere, and where a yard reads from is the same fact about the whole picture rather than
 * about one plugin in it.
 *
 * **What that buys on a straight row is a slide, which is exactly what 0142 says it is.** This row
 * is linear and unswept, so its anchor reaches `aim` folded into the one scalar its phase already
 * moves along (`slide`, src/ui/moireCanvas.ts) — it is once a row is swept or curved that where it
 * is measured from becomes the picture. And that is not nothing: two combs of one pitch measured
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
 * Rest with no step standing, with no loop, and on a source of no length — a yard reading nowhere
 * makes no claim on where the picture is measured from, and a row resting in a dimension leaves it
 * to whoever says it loudest.
 */
export const playerRowCentre = (
  bed: number | null,
  loop: Loop | null,
  duration: number,
): number => {
  if (bed === null || loop === null || duration <= 0) return DRIFT_REST.centre;
  const stood = bedGround(loop.in, loop.out - loop.in, duration, bed);
  return denormalize(normalize(stood.in, 0, duration), 0, DRIFT_CENTRE_REACH);
};

/**
 * The module's row at its own rest, which is the whole of what it declares: the plainest grating
 * there is, along the straight axis every row is cut along until something bends one, at the
 * `playerRowPeriod` its caller spent — and the four fields above at the value they take with no part
 * standing and no ground read, because a pattern that is not running is not in a part and is
 * reading nowhere. The picture's per-frame read moves those four and nothing else (`refillRows`,
 * src/ui/moireRows.ts).
 *
 * Not a reference row, and not an instance's: the module is neither the axis the picture is read
 * against nor a plugin, so nothing meters it and its pulse rests at nothing.
 */
export const playerRow = (period: number): MoireRow => ({
  period,
  phase: 0,
  pulse: 0,
  reference: false,
  shape: playerRowShape(null),
  bend: FLAT_BEND,
  profile: PLAIN_PROFILE,
  geometry: LINEAR_GEOMETRY,
  ...DRIFT_REST,
  pitch: playerRowPitch(null),
  hue: playerRowHue(null),
  centre: playerRowCentre(null, null, 0),
});
