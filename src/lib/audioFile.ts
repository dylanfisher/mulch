/**
 * @role What a deck accepts as audio, declared once — the picker's filter, the guard before an
 *   ingest, and the drop target P19 adds all read this list rather than restating it.
 * @instead Turning accepted bytes into a buffer → src/audio/sources.ts and the engine's decode
 *   cache. Nothing here reads a file: the name is the whole test, because sniffing a format
 *   means reading bytes the browser is about to read again (0043).
 */

/**
 * Every extension a deck accepts, lowercase and dotted. The list is what `decodeAudioData`
 * handles on the browsers this runs on, so an accepted file is stored unchanged and never
 * converted (0043). `.aif` is the same format as `.aiff` under the name half the world writes.
 */
export const AUDIO_FILE_EXTENSIONS = [
  ".wav",
  ".aiff",
  ".aif",
  ".mp3",
  ".m4a",
  ".flac",
  ".ogg",
] as const;

/** The `accept` attribute of every control that takes one of these files. */
export const AUDIO_FILE_ACCEPT = AUDIO_FILE_EXTENSIONS.join(",");

/**
 * Whether this name is one a deck will take. Name only — a drop carries a `type` the operating
 * system may have left empty, and no amount of reading the bytes here would tell us anything
 * the decode is not about to tell us louder.
 */
export function isAcceptedAudioFile(name: string): boolean {
  const lower = name.toLowerCase();
  return AUDIO_FILE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/** What an import says when it refuses, in the one wording every surface shows. */
export const unacceptedAudioFile = (name: string): string =>
  `${name} is not an accepted audio file — ${AUDIO_FILE_ACCEPT}`;
