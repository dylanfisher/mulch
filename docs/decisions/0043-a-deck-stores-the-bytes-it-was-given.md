# 0043. A deck stores the bytes it was given

- **Date:** 2026-08-15
- **Status:** accepted

Nothing is converted and no format is sniffed: `decodeAudioData` handles every format `src/lib/audioFile.ts` accepts — wav, aiff under both its extensions, mp3, m4a, flac and ogg — so the file's own bytes are what the blob store holds, whatever a later step would rather have had there. A name that list does not accept is refused before the store is touched; one it accepts that will not decode is an error event with the deck left exactly as it was, never an empty buffer where the source used to be.
