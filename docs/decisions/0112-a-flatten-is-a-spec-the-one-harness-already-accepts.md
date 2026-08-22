# 0112. A flatten is a spec the one harness already accepts

- **Date:** 2026-08-21
- **Status:** accepted; rests on [0068](0068-an-export-is-a-render-spec.md),
  [0047](0047-a-crop-mints-audio-the-user-did-not-import.md) and the one-signal-chain boundary

One yard's loop for one pass is a `RenderSpec`, not a second caller of the render harness.
`deck.flatten` narrows the session to the yard it names, takes the restoration order an export
already replays, adds the one `deck.play`, and hands `renderOffline` a spec — `src/app/flatten.ts`
builds no graph, and `render.ts` gained no second entry point. The spec gained one field:
`fromSecs`, the head the result drops before the fingerprint, the fade and the encoding — arithmetic
over the rendered samples, beside the fade and for the fade's reason: it belongs to the file, not to
the instrument.

What a flatten drops is the lookahead the transport starts every play at _and a whole pass on top of
it_: two passes are rendered and the second is kept. Dropping the lookahead alone leaves the clip
opening on the master bus's own delay — measured at 444 frames, 9ms, of nothing — and ending that
much short of its loop, which is a hole at the seam every time the clip goes round. Landing the kept
window inside sound that is already running costs no constant and no browser knowledge, and it pays
for itself twice: the first pass is also the pass a delay or a reverb needs to have been fed before
the one that is kept. What it leaves is a clip rotated by that delay against the loop's own start,
which loops seamlessly and begins 9ms late. The smoke asserts the clip is sounding within a dozen
frames of both its ends, so the day the drop stops covering the delay is the day that fails.

The harness reaches the reducer by injection — `createInstrument`'s fourth argument, filled in by
the composition root. `render.ts` builds a whole instrument of its own, so a facade that imported
it would be a cycle; and a render's own instrument is handed no harness, which is what stops a
flatten inside a flatten. Squeezing the port in put `execute.ts` and `facade.ts` past the hard
800-line cap, which no waiver reaches ([0045](0045-the-hard-cap-is-enforced-where-no-waiver-reaches.md)),
so the `Runtime` type — the piece of `execute.ts` with no behaviour in it — moved to
`src/app/runtime.ts` and is re-exported from where its callers already ask for it.

The flattened yard is the bytes and what was not rendered: every deck parameter back at its declared
default, no rack, no lanes, and a loop of the whole new source, because each of those made the sound
and leaving it on would apply it to the sound a second time — and the jumps, which are kept, because
they are the one module the render leaves out. A pattern rests, repeats and drifts, so its own window
is not one pass of the loop (`windowOf`, src/audio/player.ts) and a render of one pass would stop in
the middle of it; a pattern is a way of reading a loop, the flattened yard still has that loop, so it
goes on jumping around it. The rewrite is
`clipRestorationCommands` — the same grouped, undoable edit a clip lands through
([0027](0027-clips-are-borrowed-deck-presets.md)) — and the bytes are ingested into the session's
own repository the way a crop's are, never at the download anchor. One pass is one pass: a lane
whose period is longer than the loop is captured for one loop of it.

What a flatten cannot avoid is the master bus. The harness renders the destination, so the stored
samples have been through the limiter and the soft clip once, and playing them puts them through
again — measured in Chromium at +1.65dB, which is Blink's fixed compressor makeup gain applied
twice rather than anything the limiter is doing at these levels. Rendering the yard before the bus
would be a second graph, and the bus is what keeps rendered audio bounded, so the pass is kept and
the fact is recorded (docs/plan.md §4). The proof therefore puts that one pass on both sides: the
smoke plays back the flatten's own bytes and, beside them, the same performance recorded by hand
through the same harness, and compares the two fingerprints at the tolerances
`src/lib/fingerprint.ts` declares.
