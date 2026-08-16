# 0027. Clips are named deck presets that borrow their blobs

- **Date:** 2026-08-14
- **Status:** accepted

A clip is data, not a second playback engine: a caller-supplied id, a name, and one durable `SessionDeck` preset that references the same `BlobId` a deck does rather than owning or copying audio, applied as one grouped, pre-flight-checked, undoable durable edit.
