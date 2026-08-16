# 0047. A crop mints audio the user did not import

- **Date:** 2026-08-15
- **Status:** accepted

`deck.crop` writes a new blob holding the loop's frames and loads it — the first source in the store whose bytes came from the instrument rather than from a file. Two things follow. It is 16-bit wav from `src/lib/wav.ts`, not a re-encode of whatever the source arrived as: 0043 says a deck stores the bytes it was given, and these are the bytes it is being given. And nothing is deleted — the cropped-from blob is released by the ordinary reachability walk once no deck and no live checkpoint still names it, which is what makes one press of undo enough.
