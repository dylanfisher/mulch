# 0132 — An accepted name is a container, and the import waits for the decode

- **Date:** 2026-08-22
- **Status:** accepted, extending [0043](0043-a-deck-stores-the-bytes-it-was-given.md)

`.m4a` was reported as accepted by the picker and never playing. Measured, in Playwright's
Chromium and in the machine's own Chrome, over three files from the same folder: an AAC `.m4a`
decodes in both, and the two the report was about — 40MB and 45MB from an old iTunes library —
refuse in both with a bare `EncodingError`. Their `stsd` holds an `alac` sample entry, not an
`mp4a` one. **So the container is fine and the codec inside it is not, and `.m4a` stays in
`AUDIO_FILE_EXTENSIONS`.** No extension in that list is a promise: `.ogg` carries Vorbis and
Opus and FLAC, `.wav` carries formats no browser decodes, and sniffing bytes the decoder is about
to read again is what 0043 already refuses. The list says what a deck will _attempt_.

**The defect was therefore the silence, not the format** — which is what the step said to look
for. The decode already names the blob and its byte count when it throws
([0091](0091-a-loop-move-keeps-the-playhead-that-survives-it.md), P63) and the facade already
puts that on the bus as an `error` event. Nothing in `src/ui` subscribes to the bus, `send()`
returns void by design (docs/plan.md §2), and `importDeckFile` was resolving the moment the
command was queued — so the whole failure was a yard that stayed empty.

**An import is now over when the load is.** `importDeckFile` waits on the outcome of the
`deck.load` it sends and rejects with the decode's own message, which the surface that started
the import already knows how to show.

**A refusal is this import's only when it names these bytes.** An `error` event carries no deck,
so the blob id in the decode's message is the only correlation there is — and a load refused
without one belongs to somebody else. Resolving on those was tried and is wrong in the exact way
this decision exists to fix: two yards importing at once, the first refused, and the second
answers its own refusal with a success and an empty yard. The other two ways a load ends do carry
the deck and are read off it: `deck.loaded`, which is either these bytes or a newer load that took
the yard while they decoded — nothing left for this call to say either way — and `deck.removed`.

**The bound is stated rather than hidden:** a load superseded and then itself refused reports
through the newer import and leaves this promise pending. That costs one retained listener, never
a wrong answer, and it is the price of correlating by a string the decode happens to carry.

This is not a general "errors reach the screen" mechanism and must not grow into one — that is a
surface decision, and this is one caller waiting for one command it sent.
