# 0182 — An undecodable .m4a is named, not decoded

- **Date:** 2026-08-26
- **Status:** accepted, resting on
  [0043](0043-a-deck-stores-the-bytes-it-was-given.md) — the name is what an import is accepted by,
  and the bytes are never converted — and closing the first of P63's three defects, which named the
  blob and its size but blamed the wrong thing for the failure.

**The container is not the codec.** `.m4a` is an MP4 wrapper, and what it wraps decides whether a
browser can decode it. Chromium decodes AAC in one and has no decoder at all for Apple Lossless —
not `decodeAudioData`, not an `<audio>` element, not WebCodecs, all three measured. So an ALAC file
is accepted by name, stored unchanged, and then refused by the decoder with a bare `EncodingError`
naming nothing: the same import that works for every other `.m4a` a person owns.

**The refusal reads the bytes; the accept never does.** `src/lib/mp4.ts` walks the box tree to the
sample description and returns the codec's four letters, and the decode cache appends what that
says to the decoder's own words. It runs only after a failure — 0043's rule that no import sniffs a
format is untouched, because by then there is nothing left to decide, only something to say. The
bytes are read a second time to do it: `decodeAudioData` detaches the buffer it was handed, and the
second read costs one file that got nothing out of the first.

**AAC is deliberately unexplained.** A `mp4a` file that failed did not fail for its codec, and a
clause saying it did would be a confident wrong answer sitting under the decoder's true one. The
same holds for bytes that are not an MP4 at all, and for a box tree that runs off the end of the
file: each answers with nothing rather than with a guess (principle 5).

**Decoding it ourselves is refused, for now.** An ALAC decoder is a dependency and a demux path
that one codec would use, against a conversion the person already has a tool for. If that trade
changes, it changes here — the fixture (`fixtures/alac.m4a`) and the browser proof that a real
Chromium refuses it are already in place to turn green.
