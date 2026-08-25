/**
 * @role What a take is called: the fields an offered export name is made of, the one rule about
 *   what a field may hold, and when it was made — the whole derivation of the string the Export
 *   Audio dialog opens with (0133, P114).
 * @instead Cutting that name to what a filesystem takes, and the two extensions it wears →
 *   src/app/exportAudio.ts, which owns the byte cap, the names Windows reserves and the folder.
 *   Words the interface says for its own nouns → src/lib/copy.ts.
 */

// Relative, which docs/map.md allows inside one directory, and required here: the browser smoke
// loads this file through node, where the `@/` alias only survives on a type-only import.
import { AUDIO_FILE_EXTENSIONS } from "./audioFile.ts";

/** Two digits, so January the ninth sorts before October rather than between it and November. */
const padded = (value: number): string => String(value).padStart(2, "0");

/**
 * When a take was made, as the two parts of its name that keep two takes of one yard apart. The
 * local day and the local minute, in digits every filesystem writes back unchanged — local
 * because "when it was made" is the clock the person making it was reading, and to the minute
 * because two exports an hour apart and two a second apart collide the same way (P95).
 *
 * Two answers rather than one string, because the day and the minute are two different fields of
 * the name: the day leads it and the minute rides on the app's own name behind it (P114).
 */
export const exportDateStamp = (when: Date): { day: string; minute: string } => ({
  day: `${when.getFullYear()}-${padded(when.getMonth() + 1)}-${padded(when.getDate())}`,
  minute: `${padded(when.getHours())}${padded(when.getMinutes())}`,
});

/**
 * What separates two fields of a take's name, and the one mark a field may not hold. Declared
 * here with the assembly rather than beside the extension, because `exportNames`
 * (src/app/exportAudio.ts) reads a typed name back apart on it (P114).
 */
export const EXPORT_NAME_SEPARATOR = "_";

/**
 * The app's own name, as the field every take's name carries whatever else it says. It stands in
 * for a session holding no yard at all, and it is what `EXPORT_AUDIO_FILE.base` is
 * (src/app/exportAudio.ts) — declared here because src/lib imports nothing from the tier that
 * owns the extension beside it (docs/map.md), and a word the interface writes is copy. One fact
 * under two spellings: reach for `EXPORT_AUDIO_FILE.base` wherever the extension beside it is in
 * the same sentence, and for this wherever the name is being assembled out of its fields.
 */
export const EXPORT_NAME_BASE = "mulch-export";

/**
 * The apostrophes a field drops rather than breaks on: `Don't Stop 'til` is `Dont-Stop-til` and
 * not `Don-t-Stop--til`, because a mark inside a word is not a word boundary. Every shape one
 * arrives in, because a file picker hands back whichever the source was named with and a hyphen
 * where an apostrophe was is the one thing this rule exists to prevent — the typewriter one, both
 * curly ones, the grave a keyboard without them is used for, and the two modifier letters, which
 * `\p{L}` would otherwise carry into the filename verbatim.
 */
const NAME_DROPPED = /['‘’`´ʼʻ]+/gu;

/**
 * Everything else a field may not hold, as a run rather than a character: one run is one hyphen,
 * so `AC/DC: live` is `AC-DC-live` rather than a name of empty gaps. Letters, digits and hyphens
 * are the whole of what survives, which is what leaves `_` free to separate two fields.
 */
const NAME_UNWRITABLE = /[^\p{L}\p{N}-]+/gu;

/**
 * One field of a take's name, as the one word a field is. The whole rule about what reaches a
 * filename is here and only here: `exportNames` (src/app/exportAudio.ts) reads a typed name
 * through it field by field, so there is one answer to what survives (principle 1, P114).
 *
 * Not the byte cap, which is the reader's: a field knows what it may hold, and only the thing
 * writing the folder knows how much of the whole name a filesystem will take.
 */
export const exportNameField = (text: string): string =>
  text
    // Composed first, because a decomposed letter is a letter and a combining mark, and a mark is
    // not in the set: macOS hands back a picked file's name in NFD, where `Café` would otherwise
    // read as `Cafe` and `Ångström` as `A-ngstro-m`. A script that composes no further than NFD
    // keeps neither, which is the permitted set this step narrowed to and not a fallback.
    .normalize("NFC")
    .replaceAll(NAME_DROPPED, "")
    .replaceAll(NAME_UNWRITABLE, "-")
    .replaceAll(/-{2,}/gu, "-")
    .replaceAll(/^-|-$/gu, "");

/**
 * What the Export Audio dialog offers as a name: four fields joined by `_`, each of them one word
 * — the local day, the app's own name with the local minute on it, the yard being exported said
 * the way the interface says it, and what it was made of. Derived every time the dialog opens and
 * stored nowhere — a name is not session state (P40).
 *
 * A field is one word because a filename is not a sentence: `2026-08-24_mulch-export-1911_Old-
 * Thicket_Dont-Stop-til-You-Get-Enough` is a name every filesystem, zip unpacker and download door
 * writes back unchanged, where the spaces, commas and ampersands the old form carried were an
 * argument waiting to happen (P114). A field that says nothing is left out rather than joined as
 * an empty one, so a session with no yard in it is three fields and never two `_` in a row.
 *
 * `made` is one field with two fillings, because a person reading a folder wants the same answer
 * either way: the file a yard's audio was imported as, or the generator it is playing. Bytes the
 * app itself minted have neither, and the yard is then named by its own name and its date alone
 * (0047). The source's own extension comes off, because the name this returns is what both
 * exported files are named after and `birds.wav.wav` is nobody's idea of a take (P91).
 *
 * The date leads, and that is the whole reason the order is this way round: the one reader of
 * this string cuts it to a length a filesystem takes, and it cuts from the end (`fitted`,
 * src/app/exportAudio.ts). A stamp at the tail is the first thing a long source name pushes off,
 * and two takes an hour apart would be one folder again — which is the defect this field exists
 * to close (0133). A folder of takes sorting by when they were made is the second reason.
 */
export const exportSourceName = (yard: string, made: string | null, when: Date): string => {
  const extension =
    made === null
      ? undefined
      : AUDIO_FILE_EXTENSIONS.find((suffix) => made.toLowerCase().endsWith(suffix));
  const stem =
    made === null ? "" : extension === undefined ? made : made.slice(0, -extension.length);
  const { day, minute } = exportDateStamp(when);
  return [day, `${EXPORT_NAME_BASE}-${minute}`, yard, stem]
    .map((field) => exportNameField(field))
    .filter((field) => field.length > 0)
    .join(EXPORT_NAME_SEPARATOR);
};
