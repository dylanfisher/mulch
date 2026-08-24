# 0145 — A picture may rest on analysis

- **Date:** 2026-08-24
- **Status:** accepted, extending
  [0025](0025-beat-analysis-is-derived-not-durable.md) and
  [0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md)

The drift was built from lanes, rack instances and the loop period alone, so two yards playing
different files through the same rack drew the same picture. The one thing the instrument is for
was the one thing the picture could not say.

**The reference row is the source.** The clip's own analysis cuts it: the envelope's crest — how
far its peak stands above its mean — chooses the wave it is drawn with, and its onset density sets
how fine it is drawn, through the same reach an effect's own `pitch` claim is spent over
([0139](0139-a-row-is-what-an-effect-is-set-to.md)). So a sustained pad and a drum loop of the same
length draw two pictures, and every other row is read against a reference that is this file's.

**Analysis is not durable and neither is a picture, so a picture may rest on it.** Plan §2 forbids
anything durable resting on derived analysis, because `decodeAudioData` may resample to the
device's rate and onsets differ across machines (0025). Nothing here is stored, no command is sent
and no history entry is opened; the same session on another machine draws a picture a little
unlike this one, exactly as its meters read a little unlike these. That is the whole of the
permission, and it does not widen: a loop edge snapped to an onset is still durable and is still
the command that carries it.

**The source draws from a wave no effect may claim.** 0137 gives each registry entry a profile of
its own and the registry throws for two entries claiming one, with `plain` reserved for the rows
that belong to no effect. A source picking out of the effects' pool would make the reference row
say a delay was doing something, so the reserved set grows instead: `plain` for a sustained source
and `strike` — a fast rise and a long fall — for one with transients in it. The registry refuses
both. A ramp rather than a further cosine because its cycle has a visible edge and the reference
row's zero is the top of the loop, so the loop point is a line in the picture rather than an
inference.

**A source nothing has measured yet is the picture that was drawn before this.** No analysis, no
duration, or a source with nothing in it, and the reference row is the plain grating at the pitch
its period sets — not a guess, and not a picture held back until the worker answers.
