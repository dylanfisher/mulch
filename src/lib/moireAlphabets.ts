/**
 * @role The three alphabets the drift picture may be written in — the shipped marks, the rings and
 *   the strokes — each ten bit-grids ordered by how much ink they carry, refused at load otherwise;
 *   how one of them is read at a point of a cell; and which of them the part of a song that is
 *   standing picks. **A table and not a font**: a mark rasterised from a face would be a different
 *   mark on every machine and none at all on the recorder canvas the painter is tested against, and
 *   a picture that is gestural and digital is written in marks nobody had to load (docs/plan.md,
 *   the scene block). **Five bits a side, because the cell is the screen's own column pitch** — five
 *   CSS pixels, `gridPitchPx` — and a bit that is a whole device pixel on every display is what
 *   keeps a stroke crisp under a pattern laid on whole pixels (0346).
 * @instead The ramp that turns where a cell stands on its scene into one of these marks, and how
 *   soft the read is → src/lib/moireGlyph.ts. Where a mark is written into a tile, a cell at a time
 *   → src/lib/moireScreenField.ts. Where a mark is stamped on a frame → src/ui/moireCanvasMarks.ts.
 *   Which part of a song is standing → `standingPart`, src/ui/moireRows.ts. What a character *means*
 *   as a sound → src/lib/playerCharacter.ts.
 */
import { fold } from "./copy.ts";
import { PLAYER_CHARACTERS, type PlayerCharacter } from "./playerCast.ts";

/** How many bits a mark is across and down — the count anything drawing one bit at a time reads. */
export const GLYPH_GRID = 5;

/**
 * The shipped marks, lightest first — read here alone, through `ALPHABETS.marks`, which is how
 * every other file asks for them: nothing, a dot, a colon, a dash, a plus, a percent, an at, a
 * hash, a star and a block. The order is the one invariant every alphabet here keeps — each mark
 * carries strictly more ink than the one before, checked by `alphabetOf` at load, because the ramp
 * reads density and a mark out of order is a step the ramp goes down.
 */
const MARKS: readonly (readonly string[])[] = [
  [".....", ".....", ".....", ".....", "....."],
  [".....", ".....", "..#..", ".....", "....."],
  [".....", "..#..", ".....", "..#..", "....."],
  [".....", ".....", ".###.", ".....", "....."],
  [".....", "..#..", ".###.", "..#..", "....."],
  ["#...#", "...#.", "..#..", ".#...", "#...#"],
  [".###.", "#.#.#", "#.###", "#....", ".###."],
  [".#.#.", "#####", ".#.#.", "#####", ".#.#."],
  ["#.#.#", ".###.", "#####", ".###.", "#.#.#"],
  ["#####", "#####", "#####", "#####", "#####"],
];

/** The rings: a dot growing to a disc, every mark of it a closed figure around its own middle. */
const RINGS: readonly (readonly string[])[] = [
  [".....", ".....", ".....", ".....", "....."],
  [".....", ".....", "..#..", ".....", "....."],
  [".....", "..#..", ".#.#.", "..#..", "....."],
  [".....", ".###.", ".#.#.", ".###.", "....."],
  ["..#..", ".#.#.", "#.#.#", ".#.#.", "..#.."],
  [".###.", "#...#", "#...#", "#...#", ".###."],
  [".###.", "#...#", "#.#.#", "#...#", ".###."],
  ["#####", "#...#", "#...#", "#...#", "#####"],
  [".###.", "#####", "#####", "#####", ".###."],
  ["#####", "#####", "#####", "#####", "#####"],
];

/** The strokes: a dash growing to a block through slashes and bars, every mark of it a run. */
const STROKES: readonly (readonly string[])[] = [
  [".....", ".....", ".....", ".....", "....."],
  [".....", ".....", ".##..", ".....", "....."],
  [".....", "...#.", "..#..", ".#...", "....."],
  ["....#", "...#.", "..#..", ".#...", "#...."],
  ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  ["#####", ".....", "#####", ".....", "....."],
  ["#####", "..#..", "#####", "..#..", "#####"],
  ["##.##", "#####", "##.##", "#####", "##.##"],
  ["#####", "#####", "##.##", "#####", "#####"],
  ["#####", "#####", "#####", "#####", "#####"],
];

/** How many marks there are to write a cell in. */
export const GLYPH_COUNT = MARKS.length;

/** One alphabet as bits, one byte a cell, read a few hundred thousand times a build. */
export type Alphabet = readonly Uint8Array[];

/**
 * One table of grids as bits, or a throw naming the fault: the count, the shape of a mark, and the
 * one invariant — strictly rising ink. **Refused at load and never at a draw**: an alphabet is a
 * constant in the source, so a table somebody has mistyped is a broken build rather than a picture
 * that goes down a step where it should go up (principle 5).
 */
export function alphabetOf(grids: readonly (readonly string[])[]): Alphabet {
  if (grids.length !== GLYPH_COUNT) {
    throw new Error(`An alphabet is ${GLYPH_COUNT} marks, and one is ${grids.length}.`);
  }
  let last = -1;
  return grids.map((rows) => {
    if (rows.length !== GLYPH_GRID || rows.some((row) => row.length !== GLYPH_GRID)) {
      throw new Error(`A mark is ${GLYPH_GRID} rows of ${GLYPH_GRID}, and one is not.`);
    }
    const bits = Uint8Array.from(rows.join(""), (cell) => (cell === "#" ? 1 : 0));
    const ink = bits.reduce((sum, bit) => sum + bit, 0);
    if (ink <= last) throw new Error(`A mark of ${ink} bits follows one of ${last}.`);
    last = ink;
    return bits;
  });
}

/** The three alphabets a picture may be written in, the shipped marks among them. */
export const ALPHABETS = {
  marks: alphabetOf(MARKS),
  rings: alphabetOf(RINGS),
  strokes: alphabetOf(STROKES),
} as const;
export type AlphabetName = keyof typeof ALPHABETS;

/** How much of its square one mark of an alphabet inks, nought to one. */
export const markWeight = (alphabet: Alphabet, index: number): number => {
  const mark = alphabet[index];
  if (mark === undefined) throw new Error(`There is no mark ${index}.`);
  return mark.reduce((sum, bit) => sum + bit, 0) / (GLYPH_GRID * GLYPH_GRID);
};

/** The bit of `mark` under `(u, v)`, each on nought to one across the cell; outside it, nothing. */
const bitAt = (mark: Uint8Array, u: number, v: number): number => {
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return 0;
  return mark[Math.floor(v * GLYPH_GRID) * GLYPH_GRID + Math.floor(u * GLYPH_GRID)] ?? 0;
};

/**
 * How much of the pixel at `(u, v)` of a cell the mark `index` of `alphabet` covers, nought to one:
 * the bit under it, read at the four corners of a square `blur` either side and averaged. **Four
 * reads and not one**, because a bit is a device pixel or two and a bit read once is a hard edge
 * that crawls when the lattice moves; read a quarter of a pixel either way it is the same mark,
 * soft. `blur` is the caller's, in cell units, because only the caller knows how many device pixels
 * its cell is (`markBlur`, src/lib/moireGlyph.ts). At nought it is one read, which is what the
 * tests read.
 */
export function markCoverage(
  alphabet: Alphabet,
  index: number,
  u: number,
  v: number,
  blur: number,
): number {
  const mark = alphabet[index];
  if (mark === undefined) throw new Error(`There is no mark ${index}.`);
  if (blur <= 0) return bitAt(mark, u, v);
  return (
    (bitAt(mark, u - blur, v - blur) +
      bitAt(mark, u + blur, v - blur) +
      bitAt(mark, u - blur, v + blur) +
      bitAt(mark, u + blur, v + blur)) /
    4
  );
}

/**
 * Which alphabet each character of the cast is written in: the plain and the riff in the marks the
 * picture ships, the stutter and the scatter in strokes, the breathe and the slide in rings. Every
 * name the cast declares is here and no name is here twice — three alphabets over six characters,
 * so a section changing character is two chances in three of changing the picture's whole hand.
 */
export const CHARACTER_ALPHABET: Record<PlayerCharacter, AlphabetName> = {
  plain: "marks",
  riff: "marks",
  stutter: "strokes",
  scatter: "strokes",
  breathe: "rings",
  slide: "rings",
};

/**
 * The hand a picture with no part standing is written in: the marks the instrument ships, which is
 * the picture drawn before there was a song behind it. Declared once and imported, because three
 * places state it — what `partAlphabet` answers for no part, where a fresh row set rests, and the
 * sentinel the stamp mints its tiles against (principle 1).
 */
export const ALPHABET_REST: AlphabetName = "marks";

/** How far along the fold a part's alphabet is read from — see `partAlphabet` below. */
const ALPHABET_BITS = 6;

/**
 * Which alphabet the standing part of a song is written in, off that part's own durable id — and
 * `ALPHABET_REST` where nothing is standing.
 *
 * **The part's identity folded onto the cast's names, and not the character it was drawn as.** A
 * part carried a character until 0176 and carries a spec now; a label read back off that spec would
 * be an invention, because a list of names has no nearest (0174, `partSignature`). What a part
 * really has is the one opaque string that says which part it is (0157), so the picture folds that
 * onto the same declared list of names a drawn part takes its own from (`PLAYER_CHARACTERS`,
 * src/lib/playerCast.ts) — a fact about *which* section is standing rather than a guess at what it
 * sounds like. The fold is pure and spends nothing off the walk's stream (0089), so a drawn
 * arrangement's `d0`, `d1`, `d2` take the hands they take and take them again on a replay. Three
 * hands over six names, so about a third of the section changes leave the picture in the hand it
 * was already in: what a boundary promises is that the hand *may* change, not that it must.
 *
 * **Off bits no other pick of the same badge spends.** The module's own row already reads three
 * slices of this fold — the tint takes its last two, the geometry the two above those and the
 * profile the two above *those* (`playerRowHue`, `playerRowGeometry`, `playerRowProfile`,
 * src/lib/playerDrift.ts) — under that file's own rule that a second pick off one slice is a fourth
 * name for the same thing. So this one is shifted clear of all three: an alphabet read off the
 * tint's bits would change exactly when the colour did and say nothing the colour had not. The low
 * bits shifted and never the high ones masked, for `playerRowProfile`'s reason: FNV barely moves
 * its top bits between two ids differing in one character.
 */
export function partAlphabet(part: string | null): AlphabetName {
  if (part === null) return ALPHABET_REST;
  const character = PLAYER_CHARACTERS[(fold(part) >>> ALPHABET_BITS) % PLAYER_CHARACTERS.length];
  // A modulo of a non-empty declared list answers a name; reaching this is a broken build (0174).
  if (character === undefined) throw new Error(`no character for part ${part}`);
  return CHARACTER_ALPHABET[character];
}
