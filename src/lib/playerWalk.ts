/**
 * @role The pattern as a sequence of steps: the walk a spec unfolds into, and the song of parts
 *   that swaps which voice is being walked — one a hand wrote, whose parts carry the dials they
 *   were captured from, or one the pattern draws for itself out of the same seed (0089, 0176,
 *   0158). Same seed, same steps, on any
 *   machine and in any host — this is the file that makes a jumping performance reproducible.
 * @instead What every number it reads means, and the range each is declared inside →
 *   src/lib/player.ts, which is the durable shape this unfolds. Turning a step into sound — which
 *   source starts when, and the fades at its seams → src/audio/deck.ts, the transport and the only
 *   thing that may move a read position. What a part is → src/lib/playerSong.ts; what a character
 *   is → src/lib/playerCharacter.ts. Nothing here is durable: a walk is a cursor.
 */
// Over the 400-line soft cap by the paragraphs on `PlayerStep`: every field a step carries is one
// draw, and each of them says beside itself why it is drawn there and what a spec that switches it
// off costs the stream — which is the argument a re-derived tail rests on and exists nowhere else
// (0096). Splitting the type off from the walk that fills it would put a field in one file and the
// draw that writes it in another. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { mulberry32 } from "./random.ts";
import { createFigure } from "./playerFigure.ts";
import {
  createDrawnSong,
  createSong,
  PLAYER_PART_DEFAULTS,
  songIsDrawn,
  type SongPart,
  type SongPartId,
} from "./playerSong.ts";
import { drawCharacter } from "./playerCharacter.ts";
import { partBadge } from "./copy.ts";
import { restIsPlaced, restPattern } from "./playerRest.ts";
import { drawCast } from "./playerCast.ts";
import { climbRungs } from "./playerRungs.ts";
import { PLAYER_SLOTS } from "./playerSlots.ts";
import {
  assertPlayer,
  PLAYER_BURST_MIN,
  PLAYER_GATE_FLOOR,
  PLAYER_REPEATS_MAX,
  PLAYER_REPEATS_MIN,
  partVoice,
  playerVoice,
  type PlayerSpec,
  type PlayerVoice,
} from "./player.ts";

/** One step of the pattern: where to read, how long to stay, and how much of each repeat sounds. */
export type PlayerStep = {
  /** Which of `PLAYER_SLOTS` divisions of the loop this step reads from. */
  slot: number;
  /** How many times that burst plays before the next jump — the count this step is held at. */
  repeats: number;
  /**
   * How long one of those repeats sounds, in wall seconds — the drawn burst, at least
   * `PLAYER_BURST_MIN`. The one field of a step that owes the loop nothing: the same number
   * sounds for the same time whatever the deck is looping, which is what makes it a grain rather
   * than a subdivision (0119).
   */
  burst: number;
  /**
   * How long nothing sounds before the next step, in slots. Zero is a step that runs straight on —
   * a pattern that never rests, one whose wait this jump's roll refused, or one whose placed
   * pattern does not name this jump (0163). A rolled wait may stray either side of the dial, so
   * this reaches twice `PLAYER_REST_MAX` at the widest; a placed one is the dial exactly (P87).
   */
  rest: number;
  /**
   * The ratio of the deck's own read rate each repeat of this landing reads at — one of
   * `PLAYER_RATES` per repeat, in order, and always exactly `repeats` of them.
   *
   * A list rather than the one number it was until P124, because the rung ladder now moves inside
   * a landing as well as between two: the walk lets go onto a rung per hold and the landing climbs
   * from there per repeat, so what a step reads at is a ladder and not a rate (0167). A `climb` of
   * zero — which is what a switch press leaves — is this list saying the same number `repeats`
   * times, so the pattern is the one the module played before it could climb.
   *
   * The transport writes each of them onto the landing's own source at that repeat's boundary and
   * the cursor sums the repeats it has finished at the rungs they were read at (src/audio/player.ts).
   */
  rates: readonly number[];
  /**
   * How much shorter each repeat of this landing is than the one before it, 0…
   * `PLAYER_RATCHET_MAX` — the dial's own number, carried rather than drawn, the way the three
   * fields below say what the step was walked under. It is here because `windowOf` and `seam` are
   * handed a step and nothing else, and a repeat's length is computed nowhere but there
   * (src/audio/player.ts).
   */
  ratchet: number;
  /**
   * Whether this landing is a hole: scheduled, placed and never opened. Drawn per landing off
   * `drop`, so a pattern that drops nothing rolls nothing and lays down the stream it laid before
   * a landing could be silent.
   */
  dropped: boolean;
  /**
   * Whether this landing reads its slot backwards. Drawn per landing off `reverse`, exactly as the
   * hole above it is, so a pattern that reverses nothing rolls nothing. It moves the grain and
   * never the rhythm: the landing keeps its slot, its count and its window, and what changes is
   * which end of the slot the read head starts at (P121, src/audio/player.ts).
   */
  reversed: boolean;
  /**
   * The second, quieter landing this one throws, or null where it throws none — which is every
   * landing of a pattern whose `spark` is zero. Where it reads, how loud it is and how far into
   * this landing it begins — a fraction of this landing's own window, so no value of it can put
   * the spark outside the entry it rides (0175) — and nothing
   * else: everything a spark has that is not one of those three it takes from the landing that
   * threw it — the same window, the same count, the same seams, the same direction — which is what makes
   * it a companion rather than a step of its own (P123, src/audio/player.ts).
   *
   * Rolled per landing off `spark`, exactly as the hole and the reversal above it are, so a pattern
   * that sparks nothing rolls nothing and lays down the stream it laid before this field existed.
   * Where it lands is one ordinary jump from the landing — `travelFrom`, off this walk's own
   * generator and never a second one — so a spark obeys the distance and the lean the pattern is
   * already walking under. Which means it may land on the landing's own slot: a home roll, or a
   * move that wraps the grid back onto it. That is the jump answering rather than a case to draw
   * again — a redraw would spend a second draw per landing — and what it comes to is the landing
   * sounding once more at the spark's level, which is a level and not a click (P123).
   */
  sparked: { slot: number; level: number; delay: number } | null;
  /**
   * The fraction of each repeat that sounds before the gate closes, in
   * `[PLAYER_GATE_FLOOR, 1]`. Exactly 1 is a repeat nothing cuts, which is what a gate of zero
   * draws every time.
   */
  gate: number;
  /**
   * Which part of the song this step is being walked under — that part's own id — or null while
   * the pattern holds no song at all. Carried on the step rather than counted by whoever wants it,
   * because a step is armed seconds before it sounds and the surfaces ask what is standing *now*
   * (0157).
   */
  part: SongPartId | null;
  /**
   * What the standing part is overriding the card's own dials with, or null where nothing is —
   * which is every step of a pattern holding no song, and is what "the spec's own numbers" means
   * on every surface that reads this. The same object for every step of one part rather than a
   * copy per step: this is a read, never a value anything writes.
   */
  voice: PlayerVoice | null;
  /**
   * The arrangement this step is being walked in — the hand's own list, or the run a drawn song
   * had laid when the step was drawn — and null wherever no part stands. Carried for the reason
   * the part is: a drawn run is not a list anything holds, so the only place a surface can read
   * one is off the step the clock is actually inside (0158).
   */
  song: readonly SongPart[] | null;
};

/**
 * Where a rate change lands, in rungs from unity: uniform over the rungs the drift can reach and
 * the spread allows, with the one it is already on taken out — so a change always changes
 * something, and neither end of the ladder is over-represented the way clamping a leap into range
 * would make it (0118).
 *
 * `rung` is always inside `[-spread, spread]`: a walk starts at zero, zero is inside every spread,
 * and every draw lands in the window. So `hi - lo` counts the reachable rungs exactly once the
 * current one is removed, and the shift below turns a pick at or above it into the rung past it.
 */
function drawRung(random: () => number, rung: number, spread: number, drift: number): number {
  const lo = Math.max(-spread, rung - drift);
  const hi = Math.min(spread, rung + drift);
  const reach = hi - lo;
  // A spread of zero: there is nowhere to go, and holding the deck's own rate is the point of it.
  if (reach <= 0) return rung;
  const pick = lo + Math.floor(random() * reach);
  return pick >= rung ? pick + 1 : pick;
}

/**
 * How long one landing sounds: the burst, strayed by as much as `vary` either way — on the
 * landings the chance lets stray. A spec that never varies rolls nothing, so the stream it lays
 * down is the one it laid before the chance existed (P87).
 */
function drawBurst(random: () => number, spec: PlayerVoice): number {
  const stray = spec.vary > 0 && random() < spec.varyChance ? spec.vary : 0;
  return Math.max(PLAYER_BURST_MIN, spec.burst + stray * (2 * random() - 1));
}

/**
 * Which count the next hold is kept at: uniform over the whole numbers within `repeatsSpread` of
 * the dial, clipped to the range the dial itself has. Called only where the spread is above zero,
 * so the window always holds at least two counts. Clipped rather than wrapped, so a spread
 * wider than the room below the dial simply reaches the floor — and drawn fresh rather than
 * travelled from the count it is on, which is why there is no drift beside it (0135).
 */
function drawRepeats(random: () => number, spec: PlayerVoice): number {
  const lo = Math.max(PLAYER_REPEATS_MIN, spec.repeats - spec.repeatsSpread);
  const hi = Math.min(PLAYER_REPEATS_MAX, spec.repeats + spec.repeatsSpread);
  return lo + Math.floor(random() * (hi - lo + 1));
}

/**
 * How far one jump travels, in slots: uniform inside the distance, or the whole distance on the
 * jumps the stride takes. A pattern that never strides rolls nothing, so it lays down the stream
 * it laid before a jump could stride (0134, 0162).
 */
function drawFar(random: () => number, spec: PlayerVoice): number {
  if (spec.stride > 0 && random() < spec.stride) return spec.distance;
  return 1 + Math.floor(random() * spec.distance);
}

/**
 * How long the pattern waits before the next jump, in slots — from whichever of the field's two
 * authors is live (0163). `placed` is what the pattern says about this jump, and where it is
 * placing them the two rolled amounts are not read and no draw is taken: a placed pattern leaves
 * the walk's stream exactly where it found it, which is what makes it the author rather than a
 * third amount the roll consults.
 *
 * Rolled instead: the rest, taken on the jumps the chance allows and strayed by as much as
 * `restSpread` either way. A pattern that never rests rolls nothing whichever author is live. A
 * refused wait is zero rather than a shorter one — the whole of what "no wait" means here is the
 * steps butting up, which is what a rest of zero already gives (P87).
 */
function drawRest(random: () => number, spec: PlayerVoice, placed: boolean): number {
  if (spec.rest === 0) return 0;
  if (restIsPlaced(spec)) return placed ? spec.rest : 0;
  if (random() >= spec.restChance) return 0;
  return spec.rest * (1 + spec.restSpread * (2 * random() - 1));
}

/**
 * The pattern as a walk: call it for the next step, forever. The first step is the top of the loop
 * — a play begins there and the jumping starts after it — and every step after it is drawn from
 * the seed alone.
 *
 * Stateful on purpose, and the state is a cursor rather than a fact: the walk is built fresh from
 * the seed at every `start()`, so a play, a re-play and an offline render of the same session all
 * lay down the same sequence and nothing durable has to remember where the pattern had reached
 * (0089).
 *
 * `from` is how many steps of this same walk have already been laid down, drawn and thrown away
 * so the caller gets the tail rather than the whole. It is what lets a knob moved mid-pattern
 * re-derive the steps past the fade horizon without restarting the pattern, and it keeps the
 * result a pure function of the seed, the spec and a step count — never of a wall clock (P67).
 */
// One draw per field of a step plus the three walks it keeps between them, each with the paragraph
// saying why it is drawn where it is — the length is the step's shape and not this function's.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function playerWalk(spec: PlayerSpec, from = 0): () => PlayerStep {
  assertPlayer(spec, "a player walk");
  const random = mulberry32(spec.seed);
  /** The top of the loop: a play begins there and the jumping starts after it. */
  let slot = 0;
  /**
   * The numbers every draw below reads. The spec's own while the song is empty, and the standing
   * part's while one is playing — which is the whole of what a song does: it never touches a step,
   * it changes what the walk is walking (0153). The spec carries every field a voice does, so a
   * pattern with no song reads exactly the fields it read before songs existed.
   */
  let voice: PlayerVoice = spec;
  /** Which part of the song those numbers belong to, or null while none is arranged. Carried on
   *  every step so a surface can ask what is standing at a moment rather than counting jumps of
   *  its own (0157). */
  let standing: SongPartId | null = null;
  /** The arrangement those numbers were drawn in, carried on every step for the same reason — a
   *  run the pattern drew is not a list anything holds, so the step is the only place a surface
   *  can read one off (0158). */
  let standingSong: readonly SongPart[] | null = null;
  /** The rung the hold is on — a signed distance from unity — and how many steps it has held it. */
  let rung = 0;
  let held = 0;
  /** The count the pattern is on, and how many steps it has kept it. The dial's own to begin. */
  let count = voice.repeats;
  let kept = 0;
  /**
   * Where the waits fall when they are placed rather than rolled, and how many jumps into it this
   * walk is. Laid once per voice rather than per jump — it is a function of two numbers and takes
   * no draw — and read modulo its own length, so the figure comes round for as long as the voice
   * stands (0163). An empty pattern is impossible: `restSpan` is at least one.
   */
  let rests = restPattern(voice.restPulses, voice.restSpan);
  let breathed = 0;

  /**
   * Where one jump from `at` lands: home, or else how far, then which way, then wrapped onto the
   * grid. The one move this module makes, and the figure below is handed it so that an evolving
   * figure moves by exactly the jump an ordinary step takes (0151) — which means a homing pattern
   * evolves a kept figure home too, and that is the point rather than a leak: a figure is a run of
   * slots the walk laid, and a walk that comes home lays runs that come home (0162).
   *
   * The lean is a probability of going back rather than a choice of walk, and it is read the way
   * round it is so a lean of zero draws exactly what wandering drew: at the middle the odds are a
   * half, at +1 nothing ever goes back and at −1 nothing ever goes on (0162).
   */
  const travelFrom = (at: number): number => {
    if (voice.home > 0 && random() < voice.home) return 0;
    const far = drawFar(random, voice);
    const move = random() < (1 - voice.bias) / 2 ? -far : far;
    return (((at + move) % PLAYER_SLOTS) + PLAYER_SLOTS) % PLAYER_SLOTS;
  };

  /**
   * The walk's memory, over this walk's own generator: a figure's draws have to sit in the one
   * stream the pattern is a function of, or a moved knob could not re-derive the tail (0096). Laid
   * again at every part boundary rather than kept across one: a part is a new run of slots as well
   * as a new set of numbers, and a figure whose `phrase` changed under it would be a run the keep
   * could never come round on (src/lib/playerFigure.ts).
   */
  let figure = createFigure(voice, random, travelFrom);

  /**
   * What a part is walked under: the numbers it carries, over the four the song itself is drawn by,
   * which are the spec's and never a part's (0176, 0158). No draw at all — a part is the dials it
   * was captured from, so a written song takes nothing out of the seed's stream and a knob turned
   * on the card moves only the parts a hand pointed those dials at.
   */
  const partVoiceOf = (part: SongPart): PlayerVoice => ({ ...playerVoice(spec), ...part.voice });

  /**
   * How many parts a drawn arrangement has minted so far. The id is what a part *is* rather than
   * where it stands (0157), and a drawn one has no gesture to be minted at — so it is minted off
   * this counter, which replays exactly with the walk and never touches the generator: a badge
   * that spent a draw would put the arrangement's own names inside the stream a seed reproduces
   * (0089).
   */
  let minted = 0;
  /**
   * One part of a drawn arrangement: a character, and everything else about a part left at what
   * adding one leaves it at. A drawn arrangement is a run of characters and nothing else, which is
   * 0151's "a figure is a run of slots and nothing else" said one tier up — every other field of a
   * part has a dial or a switch of its own on the card, and a fifth amount here would be the
   * module drawing what a hand already says (0158). No chorus among them either: a run that comes
   * home is what `arrangeReturn` is.
   *
   * The name is drawn from the cast rather than from every character there is, at the cost of the
   * one number this draw always spent — so narrowing the cast changes which name comes up and
   * never how many draws a walk has taken, and a pattern under the whole cast lays down exactly
   * the stream it laid before the field existed (0174).
   */
  const drawPart = (): SongPart => {
    const id = `d${minted++}`;
    return {
      ...PLAYER_PART_DEFAULTS,
      id,
      // Called what every part is called when nothing has renamed it: its own badge. A drawn part
      // has no hand to type one and no character to be named after (0174), and minting it off the
      // id keeps the name total without a second generator or a draw out of the seed's stream
      // (0089, principle 5).
      name: partBadge(id),
      // Drawn whole at the moment the run lays it down, because a part *is* its numbers now: the
      // character is drawn from the cast and the region it names is drawn from, in that order,
      // which is the order the two used to be drawn in when the second of them waited for the
      // part's own first jump (0174, 0176).
      voice: partVoice(drawCharacter(drawCast(spec.cast, random), random, spec)),
    };
  };

  /**
   * Which of the two authors is live, which is a rule and never a second field: a spec drawing an
   * arrangement is not walking the one a hand wrote, and the written list is held untouched
   * meanwhile (0158). Both cursors answer the same shape, so nothing below this line knows which
   * one it is reading.
   */
  const song = songIsDrawn(spec)
    ? createDrawnSong(spec, random, drawPart, partVoiceOf)
    : createSong(spec.song, partVoiceOf);

  // One draw per field of a step, each with the paragraph saying why it is drawn where it is, and
  // above them the part boundary that decides which numbers those draws read. The length is the
  // step's shape and not this closure's — the same waiver the function holding it carries. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  const next = (): PlayerStep => {
    // Read before anything the step is drawn from, so a part's first jump is drawn under the part
    // it begins and not under the one it ends. Null at every jump but that one, which is what
    // makes a part a part: the voice is drawn once and then walked.
    const begun = song();
    if (begun !== null) {
      voice = begun.voice;
      standing = begun.part.id;
      standingSong = begun.song;
      figure = createFigure(voice, random, travelFrom);
      // Every count a walk keeps between steps starts again with the part. The rate goes back to
      // the deck's own, so a part sounds like itself from its first jump rather than from wherever
      // the part before it left the ladder; the slot does not, because where the pattern is
      // reading is the one thing a new part inherits — a song moves through the loop.
      rung = 0;
      held = 0;
      count = voice.repeats;
      kept = 0;
      // The placement starts again with the part too, and for the reason the counts do: a part is
      // a new set of numbers, and a figure of waits carried over from the part before it would be
      // one the new part's own span could never come round on.
      rests = restPattern(voice.restPulses, voice.restSpan);
      breathed = 0;
    }
    // Drawn before the step that reads at it, so the first step of a pattern is always the deck's
    // own rate and a hold of zero draws nothing at all.
    // The roll is taken whenever a change is due and whatever it says, so the stream stays a pure
    // function of the spec and the step count — which is what lets a moved knob re-derive the tail
    // (0096). A failed roll leaves `held` where it is: the next jump is due again and rolls again,
    // which is what a chance to change means rather than a change postponed.
    if (voice.hold > 0 && held >= voice.hold && random() < voice.chance) {
      rung = drawRung(random, rung, voice.spread, voice.drift);
      held = 0;
    }
    held++;
    // The count's own hold, read exactly as the rate's is one line up (0135).
    // The spread switches this on, the way `vary` and `rest` switch their own draws on: at zero
    // nothing is rolled, so a keep cannot move every field but the count it names (0134, 0135).
    if (
      voice.repeatsSpread > 0 &&
      voice.repeatsHold > 0 &&
      kept >= voice.repeatsHold &&
      random() < voice.repeatsChance
    ) {
      count = drawRepeats(random, voice);
      kept = 0;
    }
    kept++;
    const step: PlayerStep = {
      slot,
      // The count the pattern is holding: the dial's own until a hold lets go of it, and never a
      // draw the performer cannot turn off — which is what the count was before it had a spread
      // and a chance of its own (0134, 0135).
      repeats: count,
      // At a hardness of zero this is exactly 1 without drawing a different number — the gate is
      // shut off rather than set very open, so an unstuttered pattern has no gain moves inside it.
      gate: Math.max(PLAYER_GATE_FLOOR, 1 - voice.gate * random()),
      // The count's own shape, which is the dial's number and never a draw: what the ratchet does
      // to a landing is arithmetic on its repeats rather than a number the walk picks (P118).
      ratchet: voice.ratchet,
      // Whether this landing sounds at all. Rolled only where something is being dropped, the way
      // the vary and the rest are rolled only where there is something to vary or to wait — so a
      // pattern at zero draws exactly the stream it drew before there were holes in it.
      dropped: voice.drop > 0 && random() < voice.drop,
      // And which way it reads, rolled on the same terms and immediately after it: the two odds a
      // landing carries about itself, neither of which moves anything the step after it stands on
      // (P121).
      reversed: voice.reverse > 0 && random() < voice.reverse,
      // And whether it throws a companion, rolled on the same terms and immediately after them —
      // the third thing a landing says about itself that moves nothing the landing after it stands
      // on, since the spark's own jump is taken from `slot` and thrown away rather than walked
      // from. Guarded so a pattern that sparks nothing takes neither the roll nor the jump, which
      // is what keeps the stream the one it laid before a landing could throw one (P123).
      sparked:
        voice.spark > 0 && random() < voice.spark
          ? { slot: travelFrom(slot), level: voice.sparkLevel, delay: voice.sparkDelay }
          : null,
      // Either way from the burst, so a vary lengthens as readily as it shortens, and never
      // shorter than the shortest burst the module declares.
      burst: drawBurst(random, voice),
      // How long the pattern breathes for, from whichever author the Rest dial's own marker has
      // live: the pattern that places the waits, or the chance and the spread that roll one (P87,
      // 0163).
      rest: drawRest(random, voice, rests[breathed % rests.length] ?? false),
      // The ladder this landing climbs, from the rung the hold let it go onto: `count` of them,
      // one per repeat, and no draw taken for any of it — a climb is arithmetic on the rung the
      // walk is already standing on, so a pattern that never climbs lays down exactly the stream
      // it laid before it could (0167).
      rates: climbRungs(rung, count, voice.climb, voice.spread),
      // What the draws above read, said on the step itself: which part is standing and the numbers
      // it is standing under, so the transport can answer both without a cursor of its own (0157).
      // Null until a part has stood, which is the whole of "nothing is overriding the dials": the
      // voice above is the spec itself there, and a surface reads the spec for that (0157).
      part: standing,
      voice: standing === null ? null : voice,
      song: standingSong,
    };
    // Where the next step reads from: the figure's, which keeping none is one ordinary jump and
    // nothing else, and keeping one is a run of slots laid down and played back — so a pattern
    // says something twice before it says anything new, while every other field of a step goes on
    // being drawn fresh at every step (0151, src/lib/playerFigure.ts).
    slot = figure(slot);
    breathed++;
    return step;
  };
  for (let step = 0; step < from; step++) next();
  return next;
}

/** The first `count` steps of the walk, for a caller that wants the sequence rather than a cursor. */
export function playerSequence(spec: PlayerSpec, count: number): PlayerStep[] {
  const walk = playerWalk(spec);
  return Array.from({ length: count }, () => walk());
}
